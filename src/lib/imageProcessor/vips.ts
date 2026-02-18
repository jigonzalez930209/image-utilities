import Vips from 'wasm-vips';
import type { ProcessOptions } from './types';

type VipsInstance = Awaited<ReturnType<typeof Vips>>;
let vips: VipsInstance | null = null;

export const initVips = async (): Promise<void> => {
  if (vips) return;

  try {
    // We need to point to the wasm file. 
    // Vite will handle the URL resolution for the worker/wasm if we use the ?url suffix or similar,
    // but looking at magick.ts, they use new URL(..., import.meta.url).
    
    // We define a locateFile function for emscripten
    const locateFile = (fileName: string) => {
      // Return the URL to the wasm file
      // We assume the wasm files are in node_modules/wasm-vips/lib/ using the same pattern as magick.ts
      
      // Attempt to resolve known wasm files
      if (fileName.endsWith('.wasm')) {
        return `/assets/wasm/${fileName}`;
      }
      
      return fileName;
    };

    vips = await Vips({
      locateFile,
      // Increase memory limit if needed, defaults are usually fine for basic conversion
      // initialMemory: 512 * 1024 * 1024, 
    });
    
    console.log('[Processor] Vips initialized', vips.version());
  } catch (err) {
    console.error('[Processor] Failed to init Vips:', err);
    throw err;
  }
};

export const processWithVips = async (
  buffer: Uint8Array, 
  filename: string = 'image.unknown',
  options?: ProcessOptions
): Promise<Uint8Array> => {
  return convertWithVips(buffer, 'PNG', filename, options);
};

export const convertWithVips = async (
  buffer: Uint8Array,
  format: string,
  filename: string = 'image.unknown',
  options?: ProcessOptions
): Promise<Uint8Array> => {
  if (!vips) await initVips();
  if (!vips) throw new Error('Failed to initialize Vips');

  try {
    // Load the image from buffer. 
    const image = vips.Image.newFromBuffer(buffer);
    
    // Clean up format string (remove dot if present, lowercase)
    const ext = format.toLowerCase().replace('.', '');
    
    // Vips uses the suffix to determine the saver
    // See: https://www.libvips.org/API/current/VipsImage.html#vips-image-write-to-buffer
    const saverOptions: Record<string, unknown> = {};
    if (options?.stripMetadata) {
      saverOptions.strip = true;
    }
    if (options?.quality) {
      saverOptions.Q = options.quality * 100;
    }

    const outBuffer = image.writeToBuffer(`.${ext}`, saverOptions);
    
    // Clean up
    image.delete();
    
    return outBuffer;
  } catch (err) {
    console.error(`[Processor] Vips failed to convert ${filename} to ${format}:`, err);
    throw err;
  }
};
