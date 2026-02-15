import { initializeImageMagick } from '@imagemagick/magick-wasm';

export const initMagick = async (): Promise<void> => {
  try {
    const wasmUrl = new URL(
      '../../../node_modules/@imagemagick/magick-wasm/dist/magick.wasm',
      import.meta.url
    ).href;

    const response = await fetch(wasmUrl);
    const wasmBytes = await response.arrayBuffer();
    await initializeImageMagick(wasmBytes);
  } catch (err) {
    console.error('[Processor] initMagick failed:', err);
  }
};
