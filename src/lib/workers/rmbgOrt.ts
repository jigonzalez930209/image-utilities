/**
 * RMBG-1.4 inference using onnxruntime-web directly.
 * This bypasses @huggingface/transformers to gain access to all ORT
 * execution providers: webgpu, webgl, wasm.
 *
 * Preprocessing: resize to 1024×1024, normalize to [-1, 1] (mean=0.5, std=0.5)
 * Output: single-channel float32 mask, sigmoid → alpha channel
 */
import * as ort from 'onnxruntime-web';
// Side-effect import: registers the WebGL backend with ORT.
// Without this, 'webgl' is silently removed from executionProviders.
import 'onnxruntime-web/webgl';
import { RawImage } from '@huggingface/transformers';

const MODEL_SIZE = 1024;

// ─── Execution provider selection ────────────────────────────────────────────
// ort.InferenceSession supports: webgpu, webgl, wasm
// transformers.js pipeline() only supports: webgpu, wasm (not webgl)
// By using ort directly we can leverage WebGL on devices without WebGPU.
export type OrtProvider = 'webgpu' | 'webgl' | 'wasm';

export const detectOrtProvider = async (): Promise<OrtProvider> => {
  // WebGPU
  if ('gpu' in navigator) {
    try {
      const adapter = await (navigator as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter();
      if (adapter) { console.log('[RMBG] provider: webgpu'); return 'webgpu'; }
    } catch { /* skip */ }
  }
  // WebGL via OffscreenCanvas
  try {
    const canvas = new OffscreenCanvas(1, 1);
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) { console.log('[RMBG] provider: webgl'); return 'webgl'; }
  } catch { /* skip */ }
  console.log('[RMBG] provider: wasm');
  return 'wasm';
};

// ─── Session cache ────────────────────────────────────────────────────────────
let session: ort.InferenceSession | null = null;
let sessionProvider: OrtProvider | null = null;

export const getRmbgSession = async (
  modelUrl: string,
  wasmPaths: string,
  provider: OrtProvider
): Promise<ort.InferenceSession> => {
  if (session && sessionProvider === provider) return session;

  ort.env.wasm.wasmPaths = wasmPaths;

  const providers: string[] = provider !== 'wasm' ? [provider, 'wasm'] : ['wasm'];
  session = await ort.InferenceSession.create(modelUrl, {
    executionProviders: providers,
    graphOptimizationLevel: 'all',
  });
  sessionProvider = provider;
  console.log(`[RMBG] Session created (provider: ${provider})`);
  return session;
};

// ─── Preprocessing ────────────────────────────────────────────────────────────
const imageToTensor = async (imageBlob: Blob): Promise<{ tensor: ort.Tensor; origW: number; origH: number }> => {
  const raw = await RawImage.fromBlob(imageBlob);
  const origW = raw.width;
  const origH = raw.height;

  // Resize to 1024×1024
  const resized = await raw.resize(MODEL_SIZE, MODEL_SIZE);

  // Convert to NCHW float32, normalize: pixel/255 → (x - 0.5) / 0.5 = x*2 - 1
  const data = new Float32Array(3 * MODEL_SIZE * MODEL_SIZE);
  for (let i = 0; i < MODEL_SIZE * MODEL_SIZE; i++) {
    data[i]                          = (resized.data[i * resized.channels]     / 255) * 2 - 1; // R
    data[i + MODEL_SIZE * MODEL_SIZE]     = (resized.data[i * resized.channels + 1] / 255) * 2 - 1; // G
    data[i + 2 * MODEL_SIZE * MODEL_SIZE] = (resized.data[i * resized.channels + 2] / 255) * 2 - 1; // B
  }

  return {
    tensor: new ort.Tensor('float32', data, [1, 3, MODEL_SIZE, MODEL_SIZE]),
    origW,
    origH,
  };
};

// ─── Postprocessing ───────────────────────────────────────────────────────────
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

const maskToBlob = async (
  maskData: Float32Array,
  origW: number,
  origH: number
): Promise<Blob> => {
  // Build grayscale image from sigmoid of mask output
  const rgba = new Uint8ClampedArray(MODEL_SIZE * MODEL_SIZE * 4);
  for (let i = 0; i < MODEL_SIZE * MODEL_SIZE; i++) {
    const alpha = Math.round(sigmoid(maskData[i]) * 255);
    rgba[i * 4]     = alpha;
    rgba[i * 4 + 1] = alpha;
    rgba[i * 4 + 2] = alpha;
    rgba[i * 4 + 3] = 255;
  }

  // Resize mask back to original dimensions using RawImage
  const maskRaw = new RawImage(rgba, MODEL_SIZE, MODEL_SIZE, 4);
  const resized = await maskRaw.resize(origW, origH);
  return resized.toBlob();
};

// ─── Public API ───────────────────────────────────────────────────────────────
export const runRmbgOrt = async (
  imageBlob: Blob,
  session: ort.InferenceSession
): Promise<Blob> => {
  const { tensor, origW, origH } = await imageToTensor(imageBlob);

  const inputName = session.inputNames[0];
  const results = await session.run({ [inputName]: tensor });

  const outputName = session.outputNames[0];
  const output = results[outputName];
  const maskData = output.data as Float32Array;

  return maskToBlob(maskData, origW, origH);
};
