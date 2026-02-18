import { pipeline, env, RawImage, type ImageSegmentationPipeline, type ImageToImagePipeline } from '@huggingface/transformers';
import * as ort from 'onnxruntime-web';

// Determine base path from self.location (for GitHub Pages subpaths)
const getBase = () => {
  const path = self.location.pathname;
  if (path.includes('/assets/')) return path.split('/assets/')[0] + '/';
  return '/';
};
const BASE = getBase();

// ─── Capability Detection ────────────────────────────────────────────────────
// SharedArrayBuffer requires crossOriginIsolated. Without it, numThreads must
// be 1 to avoid the ONNX Runtime warning and fallback overhead.
const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
const optimalThreads = hasSharedArrayBuffer
  ? Math.min(navigator.hardwareConcurrency ?? 4, 4)
  : 1;

// Detect best available execution provider
// WebGPU >> WebGL >> WASM (single or multi thread)
const detectBestProvider = async (): Promise<string> => {
  // WebGPU: fastest on modern mobile/desktop GPUs
  if ('gpu' in navigator) {
    try {
      const adapter = await (navigator as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter();
      if (adapter) {
        console.log('[Worker] WebGPU available — using gpu provider');
        return 'webgpu';
      }
    } catch { /* not available */ }
  }
  // WebGL: good GPU acceleration fallback
  try {
    const canvas = new OffscreenCanvas(1, 1);
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      console.log('[Worker] WebGL available — using webgl provider');
      return 'webgl';
    }
  } catch { /* not available */ }
  // WASM: CPU fallback (single or multi thread)
  console.log(`[Worker] Using wasm provider (threads: ${optimalThreads})`);
  return 'wasm';
};

// ─── Environment Configuration ───────────────────────────────────────────────
env.allowLocalModels = true;
env.allowRemoteModels = false;  // All models served locally — no HuggingFace requests
env.localModelPath = `${BASE}assets/models/`.replace(/\/+/g, '/');
env.useBrowserCache = true;  // Cache model files in browser Cache API

if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = `${BASE}assets/models/wasm/`.replace(/\/+/g, '/');
  env.backends.onnx.wasm.numThreads = optimalThreads;
}

console.log(`[Worker] Init — SharedArrayBuffer: ${hasSharedArrayBuffer}, threads: ${optimalThreads}`);

// ─── State ───────────────────────────────────────────────────────────────────
let rmbgPipeline: ImageSegmentationPipeline | null = null;
let upscalerPipeline: ImageToImagePipeline | null = null;
let activeUpscalerId: string | null = null;
let inpaintSession: ort.InferenceSession | null = null;
let bestProvider: string | null = null;

// ─── Message Types ───────────────────────────────────────────────────────────
type WorkerMessage =
  | { type: 'init_rmbg'; id: string; modelId?: string }
  | { type: 'process_rmbg'; id: string; image: Blob; modelId?: string }
  | { type: 'init_upscaler'; modelId: string }
  | { type: 'process_upscaler'; image: Blob; modelId: string; requestId: string }
  | { type: 'process_inpaint'; image: Blob; mask: Blob; requestId: string };

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type } = e.data;
  try {
    switch (type) {
      case 'init_rmbg':      await initializeRmbg(e.data.id, e.data.modelId); break;
      case 'process_rmbg':   await processRmbg(e.data.id, e.data.image, e.data.modelId); break;
      case 'init_upscaler':  await initializeUpscaler(e.data.modelId); break;
      case 'process_upscaler': await processUpscaler(e.data.image, e.data.modelId, e.data.requestId); break;
      case 'process_inpaint':  await processInpaint(e.data.image, e.data.mask, e.data.requestId); break;
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    self.postMessage({
      type: 'error',
      error: { message: error.message, stack: error.stack || '' },
      requestId: 'requestId' in (e.data as Record<string, unknown>) ? (e.data as Record<string, unknown>).requestId : undefined,
      id: 'id' in (e.data as Record<string, unknown>) ? (e.data as Record<string, unknown>).id : undefined,
    });
  }
};

// ─── RMBG ────────────────────────────────────────────────────────────────────
async function initializeRmbg(id: string, modelId?: string) {
  const targetModel = modelId === 'rmbg_14' ? 'Xenova/RMBG-1.4' : (modelId || 'Xenova/RMBG-1.4');
  if (!rmbgPipeline) {
    if (!bestProvider) bestProvider = await detectBestProvider();
    console.log(`[Worker] Initializing RMBG: ${targetModel} (provider: ${bestProvider})`);
    const result = await pipeline('image-segmentation', targetModel, {
      device: bestProvider as Parameters<typeof pipeline>[2] extends { device?: infer D } ? D : never,
      dtype: 'fp32',
      progress_callback: (p: { status: string; progress?: number; file?: string }) => {
        if (p.status === 'progress' && p.progress !== undefined) {
          self.postMessage({ type: 'progress', percent: p.progress, id, file: p.file || '' });
        }
      },
    });
    rmbgPipeline = result as ImageSegmentationPipeline;
  }
  self.postMessage({ type: 'rmbg_ready', id });
}

async function processRmbg(id: string, imageBlob: Blob, modelId?: string) {
  if (!rmbgPipeline) await initializeRmbg(id, modelId);
  const image = await RawImage.fromBlob(imageBlob);
  const output = await rmbgPipeline!(image);
  self.postMessage({
    type: 'rmbg_complete',
    id,
    mask: await (output as unknown as { toBlob: () => Promise<Blob> }).toBlob(),
  });
}

// ─── Upscaler ────────────────────────────────────────────────────────────────
async function initializeUpscaler(modelId: string) {
  if (!upscalerPipeline || activeUpscalerId !== modelId) {
    if (!bestProvider) bestProvider = await detectBestProvider();
    console.log(`[Worker] Initializing Upscaler: ${modelId} (provider: ${bestProvider})`);
    const result = await pipeline('image-to-image', modelId, {
      device: bestProvider as Parameters<typeof pipeline>[2] extends { device?: infer D } ? D : never,
      dtype: 'fp32',
    });
    upscalerPipeline = result as ImageToImagePipeline;
    activeUpscalerId = modelId;
  }
  self.postMessage({ type: 'upscaler_ready', modelId });
}

async function processUpscaler(imageBlob: Blob, modelId: string, requestId: string) {
  if (!upscalerPipeline || activeUpscalerId !== modelId) await initializeUpscaler(modelId);
  const rawImage = await RawImage.fromBlob(imageBlob);
  const output = await upscalerPipeline!(rawImage);
  let resultBlob: Blob;
  if (output instanceof RawImage) {
    resultBlob = await output.toBlob();
  } else if (output && typeof (output as { toBlob?: unknown }).toBlob === 'function') {
    resultBlob = await (output as unknown as { toBlob: () => Promise<Blob> }).toBlob();
  } else {
    throw new Error('Unknown upscaler output format');
  }
  self.postMessage({ type: 'upscaler_complete', image: resultBlob, requestId });
}

// ─── Inpaint ─────────────────────────────────────────────────────────────────
async function processInpaint(imageBlob: Blob, maskBlob: Blob, requestId: string) {
  const modelId = 'anyisalin/migan-onnx';
  const modelPath = `${env.localModelPath}${modelId}/model.onnx`;

  if (!inpaintSession) {
    if (!bestProvider) bestProvider = await detectBestProvider();
    console.log(`[Worker] Initializing MI-GAN (${modelPath}, provider: ${bestProvider})`);
    self.postMessage({ type: 'progress', percent: 10, file: 'Loading MI-GAN' });
    ort.env.wasm.wasmPaths = `${BASE}assets/models/wasm/`.replace(/\/+/g, '/');
    // For inpaint, try best provider then fall back to wasm
    const providers: string[] = bestProvider !== 'wasm' ? [bestProvider, 'wasm'] : ['wasm'];
    inpaintSession = await ort.InferenceSession.create(modelPath, {
      executionProviders: providers,
      graphOptimizationLevel: 'all',
    });
    self.postMessage({ type: 'progress', percent: 100, file: 'MI-GAN Ready' });
  }

  const originalImage = await RawImage.fromBlob(imageBlob);
  const { width: originalWidth, height: originalHeight } = originalImage;
  const size = 512;
  const resizedImage = await originalImage.resize(size, size);
  const resizedMask = await (await RawImage.fromBlob(maskBlob)).resize(size, size);

  const inputNames = inpaintSession.inputNames;
  const imageInputName = inputNames.find((n: string) => n.toLowerCase().includes('image')) || inputNames[0];
  const maskInputName = inputNames.find((n: string) => n.toLowerCase().includes('mask')) || inputNames[1];

  const imageMeta = (inpaintSession as unknown as { handler?: { inputMetadata?: unknown[] } })
    .handler?.inputMetadata?.[inpaintSession.inputNames.indexOf(imageInputName)] as { dims?: number[] } | undefined;
  const imageShape = imageMeta?.dims || [1, 3, size, size];
  const isInputNCHW = imageShape[1] === 3;

  const imgData = new Uint8Array(3 * size * size);
  const maskData = new Uint8Array(1 * size * size);

  for (let i = 0; i < size * size; i++) {
    const r = resizedImage.data[i * 3];
    const g = resizedImage.data[i * 3 + 1];
    const b = resizedImage.data[i * 3 + 2];
    const m = resizedMask.data[i * 3] > 128 ? 0 : 255;
    if (isInputNCHW) {
      imgData[i] = r; imgData[i + size * size] = g; imgData[i + 2 * size * size] = b;
      maskData[i] = m;
    } else {
      imgData[i * 3] = r; imgData[i * 3 + 1] = g; imgData[i * 3 + 2] = b;
      maskData[i] = m;
    }
  }

  const imageTensor = new ort.Tensor('uint8', imgData, imageShape);
  const maskTensor = new ort.Tensor('uint8', maskData, isInputNCHW ? [1, 1, size, size] : [1, size, size, 1]);
  const results = await inpaintSession.run({ [imageInputName]: imageTensor, [maskInputName]: maskTensor });

  const outputTensor = results[Object.keys(results)[0]];
  const outputData = outputTensor.data;
  const outDims = outputTensor.dims;
  const isOutputNCHW = outDims[1] === 3;
  const isFloat = outputTensor.type === 'float32';

  const rgbaData = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    let r: number, g: number, b: number;
    if (isOutputNCHW) {
      if (isFloat) {
        const d = outputData as Float32Array;
        r = d[i] * 255; g = d[i + size * size] * 255; b = d[i + 2 * size * size] * 255;
      } else {
        const d = outputData as Uint8Array;
        r = d[i]; g = d[i + size * size]; b = d[i + 2 * size * size];
      }
    } else {
      if (isFloat) {
        const d = outputData as Float32Array;
        r = d[i * 3] * 255; g = d[i * 3 + 1] * 255; b = d[i * 3 + 2] * 255;
      } else {
        const d = outputData as Uint8Array;
        r = d[i * 3]; g = d[i * 3 + 1]; b = d[i * 3 + 2];
      }
    }
    rgbaData[i * 4] = Math.max(0, Math.min(255, r));
    rgbaData[i * 4 + 1] = Math.max(0, Math.min(255, g));
    rgbaData[i * 4 + 2] = Math.max(0, Math.min(255, b));
    rgbaData[i * 4 + 3] = 255;
  }

  const resultRawImage = new RawImage(rgbaData, size, size, 4);
  const finalImage = await resultRawImage.resize(originalWidth, originalHeight);
  self.postMessage({ type: 'inpaint_complete', image: await finalImage.toBlob(), requestId });
}
