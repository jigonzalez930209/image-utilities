import { pipeline, env, RawImage, type ImageSegmentationPipeline, type ImageToImagePipeline } from '@huggingface/transformers';
import * as ort from 'onnxruntime-web';

// Configure environment for local execution
// We enable local models and set the path.
// Important: 'localModelPath' is used as the base.
// Models should be at: /assets/models/<model_id>/
// e.g. /assets/models/onnx-community/lama-fp16-onnx/
// Determine base path from self.location (for GitHub Pages subpaths)
const getBase = () => {
  // If we are in a subpath like /image-utilities/, and the worker is in /image-utilities/assets/*.js
  // self.location.pathname will be /image-utilities/assets/ai.worker-XXXX.js
  const path = self.location.pathname;
  if (path.includes('/assets/')) {
    return path.split('/assets/')[0] + '/';
  }
  return '/';
};

const BASE = getBase();

env.allowLocalModels = true;
// env.allowRemoteModels = false; // Keep remote allowed as fallback if needed, or disable to force local
env.localModelPath = `${BASE}assets/models/`.replace(/\/+/g, '/');
env.useBrowserCache = false;

// WASM configuration
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = `${BASE}assets/models/wasm/`.replace(/\/+/g, '/');
  env.backends.onnx.wasm.numThreads = 4; // Use multi-threading
}

// Global pipeline references
let rmbgPipeline: ImageSegmentationPipeline | null = null;
let upscalerPipeline: ImageToImagePipeline | null = null;
let activeUpscalerId: string | null = null;

// Worker message types
type WorkerMessage = 
  | { type: 'init_rmbg'; id: string; modelId?: string }
  | { type: 'process_rmbg'; id: string; image: Blob; modelId?: string }
  | { type: 'init_upscaler'; modelId: string }
  | { type: 'process_upscaler'; image: Blob; modelId: string; requestId: string }
  | { type: 'process_inpaint'; image: Blob; mask: Blob; requestId: string };

let inpaintPipeline: ort.InferenceSession | null = null;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type } = e.data;

  try {
    switch (type) {
      case 'init_rmbg':
        await initializeRmbg(e.data.id, e.data.modelId);
        break;
      case 'process_rmbg':
        await processRmbg(e.data.id, e.data.image, e.data.modelId);
        break;
      case 'init_upscaler':
        await initializeUpscaler(e.data.modelId);
        break;
      case 'process_upscaler':
        await processUpscaler(e.data.image, e.data.modelId, e.data.requestId);
        break;
      case 'process_inpaint':
        await processInpaint(e.data.image, e.data.mask, e.data.requestId);
        break;
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const errorMsg = error.message;
    const errorStack = error.stack || '';
    
    self.postMessage({
      type: 'error',
      error: { message: errorMsg, stack: errorStack },
      requestId: 'requestId' in (e.data as Record<string, unknown>) ? (e.data as Record<string, unknown>).requestId : undefined,
      id: 'id' in (e.data as Record<string, unknown>) ? (e.data as Record<string, unknown>).id : undefined
    });
  }
};

async function processInpaint(imageBlob: Blob, maskBlob: Blob, requestId: string) {
    const modelId = 'anyisalin/migan-onnx';
    const modelPath = `${env.localModelPath}${modelId}/model.onnx`;
    
    try {
        if (!inpaintPipeline) {
            console.log(`[Worker] Initializing MI-GAN InferenceSession (${modelPath})`);
            self.postMessage({ type: 'progress', percent: 10, file: 'Loading MI-GAN' });
            ort.env.wasm.wasmPaths = `${BASE}assets/models/wasm/`.replace(/\/+/g, '/');
            inpaintPipeline = await ort.InferenceSession.create(modelPath, {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all'
            });
            self.postMessage({ type: 'progress', percent: 100, file: 'MI-GAN Ready' });
        }

        const originalImage = await RawImage.fromBlob(imageBlob);
        const originalWidth = originalImage.width;
        const originalHeight = originalImage.height;
        const size = 512;
        const resizedImage = await originalImage.resize(size, size);
        const resizedMask = await (await RawImage.fromBlob(maskBlob)).resize(size, size);

        // Detect expected input shapes from model
        const inputNames = inpaintPipeline.inputNames;
        const imageInputName = inputNames.find((n: string) => n.toLowerCase().includes('image')) || inputNames[0];
        const maskInputName = inputNames.find((n: string) => n.toLowerCase().includes('mask')) || inputNames[1];
        
        const imageMeta = (inpaintPipeline as unknown as { handler?: { inputMetadata?: unknown[] } }).handler?.inputMetadata?.[inpaintPipeline.inputNames.indexOf(imageInputName)] as { dims?: number[] } | undefined;
        const imageShape = imageMeta?.dims || [1, 3, size, size]; 
        const isInputNCHW = imageShape[1] === 3;

        console.log(`[Worker] Model expects Input: ${isInputNCHW ? 'NCHW' : 'NHWC'} (${imageShape})`);

        const imgData = new Uint8Array(3 * size * size);
        const maskData = new Uint8Array(1 * size * size);

        for (let i = 0; i < size * size; i++) {
            const r = resizedImage.data[i * 3];
            const g = resizedImage.data[i * 3 + 1];
            const b = resizedImage.data[i * 3 + 2];
            const m = resizedMask.data[i * 3] > 128 ? 0 : 255;

            if (isInputNCHW) {
                imgData[i] = r;
                imgData[i + size * size] = g;
                imgData[i + 2 * size * size] = b;
                maskData[i] = m;
            } else {
                imgData[i * 3] = r;
                imgData[i * 3 + 1] = g;
                imgData[i * 3 + 2] = b;
                maskData[i] = m;
            }
        }

        const imageTensor = new ort.Tensor('uint8', imgData, imageShape);
        const maskTensor = new ort.Tensor('uint8', maskData, isInputNCHW ? [1, 1, size, size] : [1, size, size, 1]);

        const results = await inpaintPipeline.run({
            [imageInputName]: imageTensor,
            [maskInputName]: maskTensor
        });

        const outputTensor = results[Object.keys(results)[0]];
        const outputData = outputTensor.data;
        const outDims = outputTensor.dims;
        const isOutputNCHW = outDims[1] === 3;
        const isFloat = outputTensor.type === 'float32';
        
        console.log(`[Worker] MI-GAN Output: ${isOutputNCHW ? 'NCHW' : 'NHWC'} (${outDims}) type: ${outputTensor.type}`);

        const rgbaData = new Uint8ClampedArray(size * size * 4);
        
        for (let i = 0; i < size * size; i++) {
            let r, g, b;
            if (isOutputNCHW) {
                if (isFloat) {
                    const data = outputData as Float32Array;
                    r = data[i] * 255;
                    g = data[i + size * size] * 255;
                    b = data[i + 2 * size * size] * 255;
                } else {
                    const data = outputData as Uint8Array;
                    r = data[i];
                    g = data[i + size * size];
                    b = data[i + 2 * size * size];
                }
            } else {
                if (isFloat) {
                    const data = outputData as Float32Array;
                    r = data[i * 3] * 255;
                    g = data[i * 3 + 1] * 255;
                    b = data[i * 3 + 2] * 255;
                } else {
                    const data = outputData as Uint8Array;
                    r = data[i * 3];
                    g = data[i * 3 + 1];
                    b = data[i * 3 + 2];
                }
            }
            rgbaData[i * 4] = Math.max(0, Math.min(255, r));
            rgbaData[i * 4 + 1] = Math.max(0, Math.min(255, g));
            rgbaData[i * 4 + 2] = Math.max(0, Math.min(255, b));
            rgbaData[i * 4 + 3] = 255;
        }

        const resultRawImage = new RawImage(rgbaData, size, size, 4);
        const finalImage = await resultRawImage.resize(originalWidth, originalHeight);
        const resultBlob = await finalImage.toBlob();
        self.postMessage({ type: 'inpaint_complete', image: resultBlob, requestId });
    } catch (err: unknown) {
        console.error('[Worker] Inpaint error:', err);
        throw err;
    }
}

async function processUpscaler(imageBlob: Blob, modelId: string, requestId: string) {
    if (!upscalerPipeline || activeUpscalerId !== modelId) {
        await initializeUpscaler(modelId);
    }
    const rawImage = await RawImage.fromBlob(imageBlob);
    const output = await upscalerPipeline!(rawImage);
    
    let resultBlob: Blob;
    if (output instanceof RawImage) {
        resultBlob = await output.toBlob();
    } else if (output && typeof (output as { toBlob?: unknown }).toBlob === 'function') {
        resultBlob = await (output as unknown as { toBlob: () => Promise<Blob> }).toBlob();
    } else {
        throw new Error('Unknown upscaler output');
    }
    self.postMessage({ type: 'upscaler_complete', image: resultBlob, requestId });
}

async function initializeRmbg(id: string, modelId?: string) {
    // Default to RMBG-1.4 for Pro option or as general fallback
    const targetModel = modelId === 'rmbg_14' ? 'Xenova/RMBG-1.4' : (modelId || 'Xenova/RMBG-1.4');
    
    if (!rmbgPipeline) {
        console.log(`[Worker] Initializing RMBG Pipeline: ${targetModel}`);
        const pipelineResult = (await pipeline('image-segmentation', targetModel, {
            device: 'wasm',
            dtype: 'fp32',
            progress_callback: (p: { status: string; progress?: number; file?: string }) => {
                if (p.status === 'progress' && p.progress !== undefined) {
                    self.postMessage({ type: 'progress', percent: p.progress, id, file: p.file || '' });
                }
            }
        }));
        rmbgPipeline = pipelineResult as ImageSegmentationPipeline;
    }
    self.postMessage({ type: 'rmbg_ready', id });
}

async function processRmbg(id: string, imageBlob: Blob, modelId?: string) {
    if (!rmbgPipeline) await initializeRmbg(id, modelId);
    const image = await RawImage.fromBlob(imageBlob);
    const output = await rmbgPipeline!(image);
    self.postMessage({ type: 'rmbg_complete', id, mask: await (output as unknown as { toBlob: () => Promise<Blob> }).toBlob() });
}

async function initializeUpscaler(modelId: string) {
    if (!upscalerPipeline || activeUpscalerId !== modelId) {
        console.log(`[Worker] Initializing Upscaler: ${modelId}`);
        const upscalerResult = (await pipeline('image-to-image', modelId, {
            device: 'wasm',
            dtype: 'fp32'
        }));
        upscalerPipeline = upscalerResult as ImageToImagePipeline;
        activeUpscalerId = modelId;
    }
    self.postMessage({ type: 'upscaler_ready', modelId });
}
