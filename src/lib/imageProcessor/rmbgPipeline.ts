import { pipeline, env, type ImageSegmentationPipeline } from '@huggingface/transformers';
import { dispatchImageProgress } from './events';
import { RMBG_INIT_TIMEOUT_MS, RMBG_INFERENCE_TIMEOUT_MS, withTimeout } from './timeout';

env.allowLocalModels = false;
env.useBrowserCache = true;

// Force Transformers.js to use local ONNX Runtime assets
// if (env.backends?.onnx?.wasm) {
//   env.backends.onnx.wasm.wasmPaths = '/assets/onnxruntime/';
// }

type RMBGPipeline = ImageSegmentationPipeline;

let rmbgPipeline: RMBGPipeline | null = null;
let rmbgPipelinePromise: Promise<RMBGPipeline> | null = null;
const activeLoadingIds = new Set<string>();

interface Capabilities {
  webGPU: boolean;
}

interface NavigatorWithGPU extends Navigator {
  gpu: {
    requestAdapter: () => Promise<object | null>;
  };
}

const getCapabilities = async (): Promise<Capabilities> => {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return { webGPU: false };
  }

  try {
    const nav = navigator as NavigatorWithGPU;
    const adapter = await nav.gpu.requestAdapter();
    return { webGPU: !!adapter };
  } catch {
    return { webGPU: false };
  }
};

type ProgressInfo = 
  | { status: 'initiate'; file: string; name: string }
  | { status: 'download'; file: string; name: string }
  | { status: 'progress'; file: string; name: string; progress: number; loaded: number; total: number }
  | { status: 'done'; file: string; name: string }
  | { status: 'ready'; task: string; model: string };

const createRmbgPipeline = async (activeDevice: string, activeDtype: string): Promise<RMBGPipeline> => {
  const options = {
    device: activeDevice,
    dtype: activeDtype,
    progress_callback: (info: ProgressInfo) => {
      if (info.status !== 'progress') return;
      const fileName = info.file.split('/').pop() || info.file;
      const percent = Math.round(info.progress).toString();
      activeLoadingIds.forEach((targetId) => {
        dispatchImageProgress(targetId, `loading:${fileName}`, percent, 'loading');
      });
    },
  } as import('@huggingface/transformers').PretrainedModelOptions;

  const pipePromise = pipeline('image-segmentation', 'briaai/RMBG-1.4', options);
  
  return await withTimeout(
    pipePromise as Promise<RMBGPipeline>,
    RMBG_INIT_TIMEOUT_MS,
    `RMBG pipeline initialization (${activeDevice}/${activeDtype})`
  );
};

export const getRMBGPipeline = async (id: string): Promise<RMBGPipeline> => {
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
        const fallbackErr = err as Error;
        console.warn(`[Processor] RMBG Pipeline failed on ${device}, trying fallback WASM/q8...`, fallbackErr);
        const pipe = await createRmbgPipeline('wasm', 'q8');
        rmbgPipeline = pipe;
        return pipe;
      }
    })().catch((err: Error) => {
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
