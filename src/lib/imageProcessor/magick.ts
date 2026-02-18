import { initializeImageMagick } from '@imagemagick/magick-wasm';

let isInitializing: Promise<void> | null = null;
let isInitialized = false;

export const initMagick = async (): Promise<void> => {
  if (isInitialized) return;
  if (isInitializing) return isInitializing;

  isInitializing = (async () => {
    try {
      const base = import.meta.env.BASE_URL || '/';
      const wasmUrl = `${base}assets/wasm/magick.wasm`.replace(/\/+/g, '/');

      const response = await fetch(wasmUrl);
      const wasmBytes = await response.arrayBuffer();
      await initializeImageMagick(wasmBytes);
      isInitialized = true;
    } catch (err) {
      console.error('[Processor] initMagick failed:', err);
      isInitializing = null; // Allow retry on failure
    }
  })();

  return isInitializing;
};
