import { initializeImageMagick } from '@imagemagick/magick-wasm';

export const initMagick = async (): Promise<void> => {
  try {
    const wasmUrl = '/assets/wasm/magick.wasm';

    const response = await fetch(wasmUrl);
    const wasmBytes = await response.arrayBuffer();
    await initializeImageMagick(wasmBytes);
  } catch (err) {
    console.error('[Processor] initMagick failed:', err);
  }
};
