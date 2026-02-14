import { removeBackground, type Config as BGConfig } from '@imgly/background-removal';
import { initializeImageMagick, ImageMagick, MagickFormat } from '@imagemagick/magick-wasm';
import { pipeline, env } from '@huggingface/transformers';
import heic2any from 'heic2any';
import { type ImageFormat } from './formats';

// Configure transformers to use local cache and webgpu if available
env.allowLocalModels = false;
env.useBrowserCache = true;

let rmbgPipeline: any = null;

const getCapabilities = async () => {
  const hasWebGPU = !!(navigator as any).gpu;
  return { webGPU: hasWebGPU };
};

const getRMBGPipeline = async (id: string) => {
  if (rmbgPipeline) return rmbgPipeline;
  
  const { webGPU } = await getCapabilities();
  const device = webGPU ? 'webgpu' : 'wasm';
  
  console.log(`[Processor] Initializing RMBG-1.4 (Device: ${device})`);
  
  try {
    rmbgPipeline = await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
      device: device as any,
      dtype: device === 'webgpu' ? 'fp32' : 'fp32', // Keeping fp32 for consistency
      progress_callback: (info: any) => {
        if (info.status === 'progress') {
          const fileName = info.file.split('/').pop() || info.file;
          window.dispatchEvent(new CustomEvent('image-process-progress', { 
            detail: { 
              key: `loading:${fileName}`, 
              percent: Math.round(info.progress).toString(), 
              id, 
              stage: 'loading' 
            } 
          }));
        }
      }
    });
  } catch (err) {
    console.error('[Processor] RMBG Pipeline initialization failed:', err);
    throw err;
  }
  return rmbgPipeline;
};

// Re-export ImageFormat for other components
export type { ImageFormat };

const CACHE_NAME = 'imgly-models-cache-v1';
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
  const models: Array<'isnet' | 'isnet_fp16' | 'isnet_quint8'> = ['isnet_fp16', 'isnet_quint8', 'isnet'];
  console.log('[Processor] Starting background model pre-loading...');
  
  // Create a silent config to trigger downloads
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
      // Silence intentional errors since the 1-byte blob will fail processing but success in fetching
    }
  }
  console.log('[Processor] Pre-loading requests sent.');
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
  bgModel?: 'isnet' | 'isnet_fp16' | 'isnet_quint8' | 'rmbg_14';
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
          const pipe = await getRMBGPipeline(id);
          const inputUrl = URL.createObjectURL(new Blob([currentBytes.slice()]));
          const output = await pipe(inputUrl);
          URL.revokeObjectURL(inputUrl);
          const mask = output.mask;
          // Transformers.js returns a RawImage with a canvas/blob capability
          const resultBlob = await mask.toBlob();
          currentBytes = new Uint8Array(await resultBlob.arrayBuffer());
        } else {
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
          const inputBlob = new Blob([currentBytes.slice()], { type: 'image/png' });
          const result = await removeBackground(inputBlob, config);
          currentBytes = new Uint8Array(await result.arrayBuffer());
        }
        console.log(`[Processor] AI Inference Finished (${model}) in: ${(performance.now() - startTime).toFixed(2)}ms`);
      } catch (err) {
        console.error('[Processor] BG Removal Failed:', err);
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
    const pipe = await getRMBGPipeline(id);
    const inputUrl = URL.createObjectURL(new Blob([pngBytes.slice()]));
    const output = await pipe(inputUrl);
    URL.revokeObjectURL(inputUrl);
    result = await output.mask.toBlob();
  } else {
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
    result = await removeBackground(inputBlob, config);
  }

  console.log(`[Processor] Preview Inference Finished (${model}) in: ${(performance.now() - startTime).toFixed(2)}ms`);
  return result;
};
