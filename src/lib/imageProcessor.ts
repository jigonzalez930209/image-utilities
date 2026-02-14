import { removeBackground, type Config as BGConfig } from '@imgly/background-removal';
import { initializeImageMagick, ImageMagick, MagickFormat } from '@imagemagick/magick-wasm';
import heic2any from 'heic2any';
import { type ImageFormat } from './formats';

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
  bgModel?: 'isnet' | 'isnet_fp16' | 'isnet_quint8';
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
 * Normalizes input files to PNG Uint8Array ONLY IF NECESSARY (e.g. for background removal).
 */
const normalizeToPNG = async (file: File, force: boolean = false): Promise<Uint8Array> => {
  // Use .slice() immediately to avoid SharedArrayBuffer issues with constructors
  const arrayBuffer = await file.arrayBuffer();
  const originalBytes = new Uint8Array(arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer);
  
  if (!force) {
    console.log(`[Processor] Skipping normalization for ${file.name}, using original bytes.`);
    return originalBytes;
  }

  const name = file.name.toLowerCase();
  
  const isSVG = name.endsWith('.svg') || file.type === 'image/svg+xml';
  const isHEIC = name.endsWith('.heic') || name.endsWith('.heif');
  const isCommon = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
  const isICO = name.endsWith('.ico');

  console.log(`[Processor] Normalizing to PNG for AI: ${file.name}`);

  if (isHEIC) {
    try {
      const blob = await heic2any({ blob: file, toType: 'image/png' });
      const finalBlob = Array.isArray(blob) ? blob[0] : blob;
      return new Uint8Array(await finalBlob.arrayBuffer());
    } catch (err) {
      console.warn('[Processor] HEIC conversion failed, falling back to Magick');
    }
  }

  if (isSVG) return await rasterizeSVG(originalBytes);
  if (isCommon && !isICO) return originalBytes;

  // Use ImageMagick for ICO, TIFF, RAW, etc.
  return new Promise<Uint8Array>((resolve) => {
    try {
      // Ensure we pass a clean copy
      ImageMagick.read(originalBytes.slice(), (image) => {
        image.write(MagickFormat.Png, (data) => {
          resolve(new Uint8Array(data.slice()));
        });
      });
    } catch (err) {
      console.error('[Processor] Magick normalization failed:', err);
      // Fallback: try one last time with a fresh slice if not already done
      resolve(originalBytes.slice());
    }
  });
};

export const convertImage = async (
  file: File,
  options: ProcessOptions,
  id: string
): Promise<Blob> => {
  console.log(`[Processor] Processing ${id} (IA: ${options.removeBackground})`);
  // Only force PNG normalization if we are doing AI background removal
  let currentBytes = await normalizeToPNG(file, options.removeBackground);

  if (options.removeBackground) {
    const isSVG = file.name.toLowerCase().endsWith('.svg');
    if (!isSVG) {
      const config: BGConfig = {
        model: options.bgModel || 'isnet_fp16',
        fetchArgs: { fetch: cachedFetch },
        progress: (key, current, total) => {
          const percent = total > 0 ? ((current / total) * 100).toFixed(0) : '0';
          const stage = key.startsWith('fetch:') ? 'loading' : 'processing';
          window.dispatchEvent(new CustomEvent('image-process-progress', { 
            detail: { key, percent, id, stage } 
          }));
        },
      };
      try {
        // We use .slice() to convert SharedArrayBuffer to standard ArrayBuffer for the Blob constructor
        const inputBlob = new Blob([currentBytes.slice()], { type: 'image/png' });
        const result = await removeBackground(inputBlob, config);
        currentBytes = new Uint8Array(await result.arrayBuffer());
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
          // Data from Magick-WASM might be SharedArrayBuffer if multi-threading is enabled
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
  model: 'isnet' | 'isnet_fp16' | 'isnet_quint8' = 'isnet_fp16'
): Promise<Blob> => {
  console.log(`[Processor] Previewing: ${id}`);
  const pngBytes = await normalizeToPNG(file, true); // Force normalization for AI preview
  const config: BGConfig = {
    model,
    fetchArgs: { fetch: cachedFetch },
    progress: (key, current, total) => {
      const percent = total > 0 ? ((current / total) * 100).toFixed(0) : '0';
      const stage = key.startsWith('fetch:') ? 'loading' : 'processing';
      window.dispatchEvent(new CustomEvent('image-process-progress', { 
        detail: { key, percent, id, stage } 
      }));
    },
  };
  // Explicit .slice() for SharedArrayBuffer compatibility
  const inputBlob = new Blob([pngBytes.slice()], { type: 'image/png' });
  return await removeBackground(inputBlob, config);
};
