import { ImageMagick, MagickFormat } from '@imagemagick/magick-wasm';
import { normalizeToPNG } from './normalize';
import { runFastModelBackgroundRemoval, isCorsOrFetchError } from './fastModels';
import { runRmbgBackgroundRemoval } from './rmbgRemoval';
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
          const resultBlob = await runRmbgBackgroundRemoval(currentBytes, id, 'RMBG');
          currentBytes = new Uint8Array(await resultBlob.arrayBuffer());
        } catch (rmbgErr) {
          console.warn('[Processor] RMBG unavailable, falling back to Medium model (isnet_fp16).', rmbgErr);
          const fallback = await runFastModelBackgroundRemoval(currentBytes, id, 'isnet_fp16', 'Ultra fallback');
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
            console.warn('[Processor] Fast models blocked (CORS/network), using Ultra (RMBG).', err.message);
            const rmbgBlob = await runRmbgBackgroundRemoval(currentBytes, id, 'RMBG (CORS fallback)');
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

  const formatStr = (options.format || 'PNG').toUpperCase();
  const format = (formatStr === 'SVG' ? MagickFormat.Svg : formatStr) as MagickFormat;

  return await new Promise((resolve, reject) => {
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
    result = await runRmbgBackgroundRemoval(pngBytes, id, 'preview RMBG').catch(async (rmbgErr) => {
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
        result = await runRmbgBackgroundRemoval(pngBytes, id, 'preview RMBG (CORS fallback)');
      } else {
        throw err;
      }
    }
  }
  console.log(`[Processor] Preview Inference Finished (${model}) in: ${(performance.now() - startTime).toFixed(2)}ms`);
  return result;
};
