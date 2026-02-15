import { pipeline, env } from '@huggingface/transformers';
import { dispatchImageProgress } from './events';
import { RMBG_INIT_TIMEOUT_MS, RMBG_INFERENCE_TIMEOUT_MS, withTimeout } from './timeout';

env.allowLocalModels = false;
env.useBrowserCache = true;

// Force Transformers.js to use local ONNX Runtime assets
// This matches the local onnxruntime-web version and prevents mismatch errors
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/assets/onnxruntime/';
}

let rmbgPipeline: any = null;
let rmbgPipelinePromise: Promise<any> | null = null;
const activeLoadingIds = new Set<string>();

const getCapabilities = async (): Promise<{ webGPU: boolean }> => {
  if (typeof navigator === 'undefined' || !(navigator as any).gpu) {
    return { webGPU: false };
  }

  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    return { webGPU: !!adapter };
  } catch {
    return { webGPU: false };
  }
};

const createRmbgPipeline = async (activeDevice: string, activeDtype: string): Promise<any> => {
  return await withTimeout(
    pipeline('image-segmentation', 'briaai/RMBG-1.4', {
      device: activeDevice as any,
      dtype: activeDtype as any,
      progress_callback: (info: any) => {
        if (info.status !== 'progress') return;
        const fileName = info.file.split('/').pop() || info.file;
        const percent = Math.round(info.progress).toString();
        activeLoadingIds.forEach((targetId) => {
          dispatchImageProgress(targetId, `loading:${fileName}`, percent, 'loading');
        });
      },
    }),
    RMBG_INIT_TIMEOUT_MS,
    `RMBG pipeline initialization (${activeDevice}/${activeDtype})`
  );
};

export const getRMBGPipeline = async (id: string): Promise<any> => {
  if (rmbgPipeline) return rmbgPipeline;

  activeLoadingIds.add(id);

  if (!rmbgPipelinePromise) {
    rmbgPipelinePromise = (async () => {
      const { webGPU } = await getCapabilities();
      const device = webGPU ? 'webgpu' : 'wasm';
      const dtype = webGPU ? 'fp32' : 'q8';

      console.log(`[Processor] Initializing RMBG-1.4 (Device: ${device}, Precision: ${dtype})`);

      try {
        const pipe = await createRmbgPipeline(device, dtype);
        console.log('[Processor] Warming up RMBG-1.4...');
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        await withTimeout(pipe(canvas.toDataURL()), RMBG_INFERENCE_TIMEOUT_MS, 'RMBG warmup');
        rmbgPipeline = pipe;
        return pipe;
      } catch (err) {
        console.warn(`[Processor] RMBG Pipeline failed on ${device}, trying fallback WASM/q8...`, err);
        const pipe = await createRmbgPipeline('wasm', 'q8');
        rmbgPipeline = pipe;
        return pipe;
      }
    })().catch((err) => {
      rmbgPipelinePromise = null;
      throw err;
    });
  }

  try {
    return await rmbgPipelinePromise;
  } finally {
    activeLoadingIds.delete(id);
  }
};
