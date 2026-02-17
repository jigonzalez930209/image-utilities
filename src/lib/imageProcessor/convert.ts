import { ImageMagick, MagickFormat } from '@imagemagick/magick-wasm';
import { normalizeToPNG } from './normalize';
import { runFastModelBackgroundRemoval, isCorsOrFetchError } from './fastModels';
import { runRmbgBackgroundRemoval } from './rmbgRemoval';
import { OUTPUT_FORMATS } from '../formats';
import { convertWithVips, initVips } from './vips';
import type { FastBackgroundModel, ProcessOptions } from './types';

export const convertImage = async (
  file: File,
  options: ProcessOptions,
  id: string
): Promise<Blob> => {

  const model = options.bgModel || 'isnet_fp16';
  console.log(`[Processor] Processing ${id} (IA: ${options.removeBackground}, Model: ${model})`);

  let currentBytes = await normalizeToPNG(file, options.removeBackground);

  if (options.removeBackground && !file.name.toLowerCase().endsWith('.svg')) {
    try {
      const startTime = performance.now();

      if (model === 'rmbg_14') {
        try {
          const resultBlob = await runRmbgBackgroundRemoval(currentBytes, id, 'RMBG', model);
          currentBytes = new Uint8Array(await resultBlob.arrayBuffer());
        } catch (rmbgErr) {
          console.warn('[Processor] RMBG unavailable, falling back to Medium model (isnet_fp16).', rmbgErr);
          const fallback = await runFastModelBackgroundRemoval(currentBytes, id, 'isnet_fp16', 'Pro fallback');
          currentBytes = new Uint8Array(await fallback.arrayBuffer());
        }
      } else {
        try {
          const result = await runFastModelBackgroundRemoval(
            currentBytes,
            id,
            model as FastBackgroundModel,
            'Fast model'
          );
          currentBytes = new Uint8Array(await result.arrayBuffer());
        } catch (fastErr) {
          const err = fastErr instanceof Error ? fastErr : new Error(String(fastErr));
          if (isCorsOrFetchError(err)) {
            console.warn('[Processor] Fast models blocked (CORS/network), using Pro (RMBG).', err.message);
            const rmbgBlob = await runRmbgBackgroundRemoval(currentBytes, id, 'RMBG (CORS fallback)', model);
            currentBytes = new Uint8Array(await rmbgBlob.arrayBuffer());
          } else {
            throw err;
          }
        }
      }

      console.log(`[Processor] AI Inference Finished (${model}) in: ${(performance.now() - startTime).toFixed(2)}ms`);
    } catch (err) {
      const failure = err instanceof Error ? err : new Error(String(err));
      console.error('[Processor] BG Removal Failed:', failure);
      throw failure;
    }
  }

  let formatStr = (options.format || 'PNG').toUpperCase();

  // Validate output format - strict check against OUTPUT_FORMATS
  // @ts-expect-error - string vs literal type mismatch check
  if (!OUTPUT_FORMATS.includes(formatStr)) {
    console.warn(`[Processor] Unsupported output format: ${formatStr}. Defaulting to PNG.`);
    formatStr = 'PNG';
  }



  const format = (formatStr === 'SVG' ? MagickFormat.Svg : formatStr) as MagickFormat;

  return await new Promise((resolve, reject) => {
    try {
      ImageMagick.read(currentBytes, (image) => {
        if (options.quality) image.quality = options.quality * 100;
        if (options.stripMetadata) {
          console.log('[Processor] Stripping metadata for privacy');
          image.strip();
        }

        // Auto-resize for ICO if too large (ICO max standard is 256x256)
        if (formatStr === 'ICO' && (image.width > 256 || image.height > 256)) {
          console.log('[Processor] Resizing large image for ICO compatibility (max 256x256)');
          image.resize(256, 256);
        }
        
        // Attempt Magick write
        image.write(format, (data) => {
          resolve(new Blob([data.slice()], { type: `image/${formatStr.toLowerCase()}` }));
        });
      });
    } catch (magickErr) {
      console.warn(`[Processor] Magick conversion to ${formatStr} failed, trying Vips...`, magickErr);
      
      // Fallback to Vips
      initVips().then(() => {
        convertWithVips(currentBytes, formatStr, file.name, options)
          .then(vipsData => {
            resolve(new Blob([vipsData.slice()], { type: `image/${formatStr.toLowerCase()}` }));
          })
          .catch(vipsErr => {
            console.error(`[Processor] Vips conversion also failed for ${formatStr}:`, vipsErr);
            // Reject with a clear message explaining both failures
            reject(new Error(`Conversion to ${formatStr} failed. Magick: ${(magickErr as Error).message}. Vips: ${vipsErr.message || vipsErr}`));
          });
      }).catch(err => {
         console.error('[Processor] Failed to init Vips for fallback:', err);
         reject(magickErr);
      });
    }
  });
};

export const previewBackgroundRemoval = async (
  file: File,
  id: string,
  model: string = 'rmbg_14'
): Promise<Blob> => {
  console.log(`[Processor] Previewing: ${id} (Model: ${model})`);
  const pngBytes = await normalizeToPNG(file, true);

  const startTime = performance.now();
  let result: Blob;
  if (model === 'rmbg_14') {
    result = await runRmbgBackgroundRemoval(pngBytes, id, 'preview RMBG', model).catch(async (rmbgErr) => {
      console.warn('[Processor] RMBG preview unavailable, falling back to Medium model (isnet_fp16).', rmbgErr);
      return await runFastModelBackgroundRemoval(pngBytes, id, 'isnet_fp16', 'Ultra preview fallback');
    });
  } else {
    try {
      result = await runFastModelBackgroundRemoval(pngBytes, id, model as FastBackgroundModel, 'Fast preview');
    } catch (fastErr) {
      const err = fastErr instanceof Error ? fastErr : new Error(String(fastErr));
      if (isCorsOrFetchError(err)) {
        console.warn('[Processor] Fast preview blocked (CORS/network), using Ultra (RMBG).', err.message);
        result = await runRmbgBackgroundRemoval(pngBytes, id, 'preview RMBG (CORS fallback)', model);
      } else {
        throw err;
      }
    }
  }
  console.log(`[Processor] Preview Inference Finished (${model}) in: ${(performance.now() - startTime).toFixed(2)}ms`);
  return result;
};
