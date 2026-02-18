import { initializeImageMagick } from '@imagemagick/magick-wasm';

export const initMagick = async (): Promise<void> => {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const wasmUrl = `${base}assets/wasm/magick.wasm`.replace(/\/+/g, '/');

    const response = await fetch(wasmUrl);
    const wasmBytes = await response.arrayBuffer();
    await initializeImageMagick(wasmBytes);
  } catch (err) {
    console.error('[Processor] initMagick failed:', err);
  }
};
