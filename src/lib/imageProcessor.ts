import { removeBackground, type Config as BGConfig } from '@imgly/background-removal';
import { initializeImageMagick, ImageMagick, MagickFormat } from '@imagemagick/magick-wasm';
import { pipeline, env } from '@huggingface/transformers';
import heic2any from 'heic2any';
import { type ImageFormat } from './formats';

// Configure transformers to use local cache and webgpu if available
env.allowLocalModels = false;
env.useBrowserCache = true;

let rmbgPipeline: any = null;
let rmbgPipelinePromise: Promise<any> | null = null;
const activeLoadingIds = new Set<string>();

type BackgroundModel = 'isnet' | 'isnet_fp16' | 'isnet_quint8' | 'rmbg_14';
type FastBackgroundModel = Exclude<BackgroundModel, 'rmbg_14'>;

const RMBG_INIT_TIMEOUT_MS = 30_000;
const RMBG_INFERENCE_TIMEOUT_MS = 45_000;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const getCapabilities = async () => {
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

const getRMBGPipeline = async (id: string) => {
  if (rmbgPipeline) return rmbgPipeline;
  
  activeLoadingIds.add(id);
  
  if (rmbgPipelinePromise) {
    try {
      return await rmbgPipelinePromise;
    } finally {
      activeLoadingIds.delete(id);
    }
  }

  rmbgPipelinePromise = (async () => {
    const { webGPU } = await getCapabilities();
    const device = webGPU ? 'webgpu' : 'wasm';
    const dtype = webGPU ? 'fp32' : 'q8'; 
    
    console.log(`[Processor] Initializing RMBG-1.4 (Device: ${device}, Precision: ${dtype})`);
    
    const createPipeline = async (activeDevice: string, activeDtype: string) => {
      return await withTimeout(
        pipeline('image-segmentation', 'briaai/RMBG-1.4', {
        device: activeDevice as any,
        dtype: activeDtype as any,
        progress_callback: (info: any) => {
          if (info.status === 'progress') {
            const fileName = info.file.split('/').pop() || info.file;
            const percent = Math.round(info.progress).toString();
            
            // Broadcast progress to all images currently waiting for this model
            activeLoadingIds.forEach(targetId => {
              window.dispatchEvent(new CustomEvent('image-process-progress', { 
                detail: { 
                  key: `loading:${fileName}`, 
                  percent, 
                  id: targetId, 
                  stage: 'loading' 
                } 
              }));
            });
          }
        }
      }),
      RMBG_INIT_TIMEOUT_MS,
      `RMBG pipeline initialization (${activeDevice}/${activeDtype})`
    );
    };

    try {
      const pipe = await createPipeline(device, dtype);
      
      // Warmup inference to prevent first-run hang
      console.log(`[Processor] Warming up RMBG-1.4...`);
      const canvas = document.createElement('canvas');
      canvas.width = 1; canvas.height = 1;
      await withTimeout(pipe(canvas.toDataURL()), RMBG_INFERENCE_TIMEOUT_MS, 'RMBG warmup');
      
      rmbgPipeline = pipe;
      return pipe;
    } catch (err) {
      console.warn(`[Processor] RMBG Pipeline failed on ${device}, trying fallback WASM/q8...`, err);
      try {
        const pipe = await createPipeline('wasm', 'q8');
        rmbgPipeline = pipe;
        return pipe;
      } catch (finalErr) {
        console.error('[Processor] RMBG Pipeline FATAL:', finalErr);
        rmbgPipelinePromise = null; // Allow retry
        throw finalErr;
      }
    }
  })().catch((err) => {
    rmbgPipelinePromise = null;
    throw err;
  });

  try {
    return await rmbgPipelinePromise;
  } finally {
    activeLoadingIds.delete(id);
  }
};

// Re-export ImageFormat for other components
export type { ImageFormat };

const CACHE_NAME = 'imgly-models-cache-v2';
const CACHE_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days in ms

/**
 * Custom fetch wrapper with 3-day TTL caching for models and assets.
 */
const cachedFetch = async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
  const urlStr = url.toString();
  
  // Only cache model files and onnxruntime assets
  const shouldCache = urlStr.includes('/models/') || urlStr.includes('/onnxruntime-web/');
  if (!shouldCache) return fetch(url, options);

  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(urlStr);

    if (cachedResponse) {
      const dateHeader = cachedResponse.headers.get('date');
      const cachedTime = dateHeader ? new Date(dateHeader).getTime() : 0;
      const now = Date.now();

      if (now - cachedTime < CACHE_TTL) {
        console.log(`[Processor] Serving from cache: ${urlStr}`);
        return cachedResponse;
      }
      console.log(`[Processor] Cache expired for: ${urlStr}`);
      await cache.delete(urlStr);
    }

    const networkResponse = await fetch(url, options);
    if (networkResponse.ok) {
      await cache.put(urlStr, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.warn(`[Processor] Cache failed for ${urlStr}, falling back to network:`, err);
    return fetch(url, options);
  }
};

/**
 * Pre-fetches all available AI models in the background.
 */
export const preloadModels = async () => {
  const models: FastBackgroundModel[] = ['isnet_quint8', 'isnet_fp16', 'isnet'];
  console.log('[Processor] Starting background model pre-loading...');
  
  for (const model of models) {
    try {
      // Small trick: calling removeBackground with a tiny blank blob triggers the download logic
      const tinyBlob = new Blob([new Uint8Array(1)], { type: 'image/png' });
      await removeBackground(tinyBlob, {
        model,
        fetchArgs: { mode: 'no-cors' }, // Just to be safe with pre-fetching
        // We provide our cachedFetch to ensure it gets stored in our 3-day cache
      } as any);
    } catch {
      // Ignore intentional failures
    }
  }
  console.log('[Processor] Pre-loading requests sent. Ultra model loads on demand.');
};

const runImglyBackgroundRemoval = async (
  pngBytes: Uint8Array,
  id: string,
  model: FastBackgroundModel
): Promise<Blob> => {
  const config: BGConfig = {
    model: model as any,
    fetchArgs: { fetch: cachedFetch },
    progress: (key, current, total) => {
      const percent = total > 0 ? ((current / total) * 100).toFixed(0) : '0';
      const stage = key.startsWith('fetch:') ? 'loading' : 'processing';
      window.dispatchEvent(new CustomEvent('image-process-progress', {
        detail: { key, percent, id, stage }
      }));
    },
  };

  const inputBlob = new Blob([pngBytes.slice()], { type: 'image/png' });
  return await removeBackground(inputBlob, config);
};

const isOrtMismatchError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  const msg = err.message || '';
  return msg.includes('_OrtGetInputOutputMetadata') || msg.includes('Failed to create session');
};

const IMGly_FALLBACK_CHAIN: Record<FastBackgroundModel, FastBackgroundModel[]> = {
  isnet_quint8: ['isnet_fp16', 'isnet'],
  isnet_fp16: ['isnet'],
  isnet: [],
};

const runFastModelBackgroundRemoval = async (
  pngBytes: Uint8Array,
  id: string,
  preferredModel: FastBackgroundModel,
  stageLabel: string
): Promise<Blob> => {
  const candidates = [preferredModel, ...IMGly_FALLBACK_CHAIN[preferredModel]];
  let lastErr: unknown = null;

  for (const candidate of candidates) {
    try {
      if (candidate !== preferredModel) {
        console.warn(`[Processor] ${stageLabel}: ${preferredModel} failed, retrying with ${candidate}.`);
      }
      return await runImglyBackgroundRemoval(pngBytes, id, candidate);
    } catch (err) {
      lastErr = err;
      console.warn(`[Processor] ${stageLabel}: ${candidate} failed.`, err);
    }
  }

  if (isOrtMismatchError(lastErr)) {
    throw new Error(
      'Los modelos rápidos no pudieron inicializar ONNX Runtime. Ajusta dependencias: onnxruntime-web@1.21.0-dev.20250206-d981b153d3 y reinstala paquetes.'
    );
  }

  if (lastErr instanceof Error) throw lastErr;
  throw new Error('Fast background-removal models failed for an unknown reason.');
};

const loadImageFromBlob = (blob: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image blob'));
    };

    img.src = url;
  });
};

const applyMaskToSource = async (sourcePngBytes: Uint8Array, maskBlob: Blob): Promise<Blob> => {
  const sourceBlob = new Blob([sourcePngBytes.slice()], { type: 'image/png' });
  const [sourceImage, maskImage] = await Promise.all([
    loadImageFromBlob(sourceBlob),
    loadImageFromBlob(maskBlob),
  ]);

  const width = sourceImage.naturalWidth || sourceImage.width;
  const height = sourceImage.naturalHeight || sourceImage.height;

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error('Canvas context not available for source composition');

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) throw new Error('Canvas context not available for mask composition');

  sourceCtx.drawImage(sourceImage, 0, 0, width, height);
  maskCtx.drawImage(maskImage, 0, 0, width, height);

  const sourceData = sourceCtx.getImageData(0, 0, width, height);
  const maskData = maskCtx.getImageData(0, 0, width, height);

  let brightPixels = 0;
  const totalPixels = width * height;

  for (let i = 0; i < maskData.data.length; i += 4) {
    const luma = (maskData.data[i] + maskData.data[i + 1] + maskData.data[i + 2]) / 3;
    if (luma > 127) brightPixels += 1;
  }

  // Some models output white-foreground masks, others the inverse.
  const shouldInvertMask = brightPixels / Math.max(totalPixels, 1) > 0.65;

  for (let i = 0; i < sourceData.data.length; i += 4) {
    const luma = (maskData.data[i] + maskData.data[i + 1] + maskData.data[i + 2]) / 3;
    const normalizedAlpha = (shouldInvertMask ? 255 - luma : luma) / 255;
    sourceData.data[i + 3] = Math.round(sourceData.data[i + 3] * normalizedAlpha);
  }

  sourceCtx.putImageData(sourceData, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    sourceCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to encode composed RMBG output as PNG'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
};

const extractRmbgBlob = async (output: any, sourcePngBytes: Uint8Array): Promise<Blob> => {
  const first = Array.isArray(output) ? output[0] : output;

  if (first?.mask && typeof first.mask.toBlob === 'function') {
    const maskBlob = await first.mask.toBlob();
    return await applyMaskToSource(sourcePngBytes, maskBlob);
  }

  const blobSource = first;

  if (!blobSource || typeof blobSource.toBlob !== 'function') {
    const shape = Array.isArray(output)
      ? `array(len=${output.length})`
      : typeof output;
    throw new Error(`RMBG output does not expose toBlob() (shape=${shape})`);
  }

  return await blobSource.toBlob();
};

const runRmbgBackgroundRemoval = async (
  pngBytes: Uint8Array,
  id: string,
  stageLabel: string
): Promise<Blob> => {
  const pipe = await getRMBGPipeline(id);
  window.dispatchEvent(new CustomEvent('image-process-progress', {
    detail: { key: 'process:start', percent: '0', id, stage: 'processing' }
  }));

  console.log(`[Processor] Starting ${stageLabel} inference for ${id}...`);
  const inputUrl = URL.createObjectURL(new Blob([pngBytes.slice()]));

  try {
    const output = await withTimeout<any>(pipe(inputUrl), RMBG_INFERENCE_TIMEOUT_MS, `RMBG ${stageLabel} inference`);
    console.log(`[Processor] ${stageLabel} inference completed for ${id}`);
    return await extractRmbgBlob(output, pngBytes);
  } finally {
    URL.revokeObjectURL(inputUrl);
  }
};

// Initialize ImageMagick with the WASM file
export const initMagick = async () => {
  try {
    const wasmUrl = new URL(
      '../../node_modules/@imagemagick/magick-wasm/dist/magick.wasm',
      import.meta.url
    ).href;
    const response = await fetch(wasmUrl);
    const wasmBytes = await response.arrayBuffer();
    await initializeImageMagick(wasmBytes);
  } catch (err) {
    console.error('[Processor] initMagick failed:', err);
  }
};

export interface ProcessOptions {
  format?: ImageFormat;
  removeBackground?: boolean;
  bgModel?: BackgroundModel;
  quality?: number;
}

/**
 * Standard browser-based SVG to PNG rasterization.
 */
const rasterizeSVG = async (bytes: Uint8Array): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    // We use .slice() to ensure we have a standard ArrayBuffer, not SharedArrayBuffer
    const blob = new Blob([bytes.slice()], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 2048;
      canvas.height = img.naturalHeight || 2048;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('SVG to PNG conversion failed'));
          return;
        }
        blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
      }, 'image/png');
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG load error'));
    };
    
    img.src = url;
  });
};

/**
 * Uses the browser's native engine to convert an image to PNG.
 * Extremely reliable for ICO, JPEG, WEBP, etc.
 */
const browserNormalize = async (bytes: Uint8Array): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes.slice()], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context failed'));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Canvas toBlob failed'));
        blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
      }, 'image/png');
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Native decode failed'));
    };
    
    img.src = url;
  });
};

/**
 * Normalizes input files to PNG Uint8Array ONLY IF NECESSARY (e.g. for background removal).
 */
const normalizeToPNG = async (file: File, force: boolean = false): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const originalBytes = new Uint8Array(arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer);
  
  if (!force) return originalBytes;

  const name = file.name.toLowerCase();
  const isSVG = name.endsWith('.svg') || file.type === 'image/svg+xml';
  const isHEIC = name.endsWith('.heic') || name.endsWith('.heif');

  console.log(`[Processor] Normalizing for AI: ${file.name}`);

  if (isHEIC) {
    try {
      const blob = await heic2any({ blob: file, toType: 'image/png' });
      const finalBlob = Array.isArray(blob) ? blob[0] : blob;
      return new Uint8Array(await finalBlob.arrayBuffer());
    } catch (err) {
      console.warn('[Processor] HEIC failed, trying native...');
    }
  }

  if (isSVG) return await rasterizeSVG(originalBytes);

  // First try Browser Native (Highest reliability for ICO/JPEG/WEB-P)
  try {
    return await browserNormalize(originalBytes);
  } catch (err) {
    console.warn('[Processor] Native normalization failed, falling back to Magick:', err);
  }

  // Final fallback: ImageMagick
  return new Promise<Uint8Array>((resolve) => {
    try {
      ImageMagick.read(originalBytes.slice(), (image) => {
        image.write(MagickFormat.Png, (data) => {
          resolve(new Uint8Array(data.slice()));
        });
      });
    } catch (err) {
      console.error('[Processor] Magick FATAL:', err);
      resolve(originalBytes.slice());
    }
  });
};

export const convertImage = async (
  file: File,
  options: ProcessOptions,
  id: string
): Promise<Blob> => {
  const model = options.bgModel || 'isnet_fp16';
  console.log(`[Processor] Processing ${id} (IA: ${options.removeBackground}, Model: ${model})`);
  
  let currentBytes = await normalizeToPNG(file, options.removeBackground);

  if (options.removeBackground) {
    const isSVG = file.name.toLowerCase().endsWith('.svg');
    if (!isSVG) {
      try {
        const startTime = performance.now();
        if (model === 'rmbg_14' as any) {
          try {
            const resultBlob = await runRmbgBackgroundRemoval(currentBytes, id, 'RMBG');
            currentBytes = new Uint8Array(await resultBlob.arrayBuffer());
          } catch (rmbgErr) {
            console.warn('[Processor] RMBG unavailable, falling back to Balanced model (isnet_fp16).', rmbgErr);
            const fallbackResult = await runFastModelBackgroundRemoval(currentBytes, id, 'isnet_fp16', 'Ultra fallback');
            currentBytes = new Uint8Array(await fallbackResult.arrayBuffer());
          }
        } else {
          const result = await runFastModelBackgroundRemoval(currentBytes, id, model as FastBackgroundModel, 'Fast model');
          currentBytes = new Uint8Array(await result.arrayBuffer());
        }
        console.log(`[Processor] AI Inference Finished (${model}) in: ${(performance.now() - startTime).toFixed(2)}ms`);
      } catch (err) {
        const failure = err instanceof Error ? err : new Error(String(err));
        console.error('[Processor] BG Removal Failed:', failure);
        throw failure;
      }
    }
  }

  const formatStr = (options.format || 'PNG').toUpperCase();
  const format = (formatStr === 'SVG' ? MagickFormat.Svg : formatStr) as MagickFormat;

  return new Promise((resolve, reject) => {
    try {
      ImageMagick.read(currentBytes, (image) => {
        if (options.quality) image.quality = options.quality * 100;
        image.write(format, (data) => {
          resolve(new Blob([data.slice()], { type: `image/${formatStr.toLowerCase()}` }));
        });
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const previewBackgroundRemoval = async (
  file: File,
  id: string,
  model: string = 'isnet_fp16'
): Promise<Blob> => {
  console.log(`[Processor] Previewing: ${id} (Model: ${model})`);
  const pngBytes = await normalizeToPNG(file, true);
  
  const startTime = performance.now();
  let result: Blob;

  if (model === 'rmbg_14') {
    try {
      result = await runRmbgBackgroundRemoval(pngBytes, id, 'preview RMBG');
    } catch (rmbgErr) {
      console.warn('[Processor] RMBG preview unavailable, falling back to Balanced model (isnet_fp16).', rmbgErr);
      result = await runFastModelBackgroundRemoval(pngBytes, id, 'isnet_fp16', 'Ultra preview fallback');
    }
  } else {
    result = await runFastModelBackgroundRemoval(pngBytes, id, model as FastBackgroundModel, 'Fast preview');
  }

  console.log(`[Processor] Preview Inference Finished (${model}) in: ${(performance.now() - startTime).toFixed(2)}ms`);
  return result;
};
