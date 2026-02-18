import Vips from 'wasm-vips';
import type { ProcessOptions } from './types';

type VipsInstance = Awaited<ReturnType<typeof Vips>>;
let vips: VipsInstance | null = null;
let isInitializing: Promise<void> | null = null;

export const initVips = async (): Promise<void> => {
  if (vips) return;
  if (isInitializing) return isInitializing;

  isInitializing = (async () => {
    try {
      const locateFile = (fileName: string) => {
        if (fileName.endsWith('.wasm')) {
          const base = import.meta.env.BASE_URL || '/';
          return `${base}assets/wasm/${fileName}`.replace(/\/+/g, '/');
        }
        return fileName;
      };

      vips = await Vips({ locateFile });
      console.log('[Processor] Vips initialized', vips.version());
    } catch (err) {
      console.error('[Processor] Failed to init Vips:', err);
      isInitializing = null;
      throw err;
    }
  })();

  return isInitializing;
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
