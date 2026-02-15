import heic2any from 'heic2any';
import { ImageMagick, MagickFormat } from '@imagemagick/magick-wasm';

const rasterizeSVG = async (bytes: Uint8Array): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes.slice()], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 2048;
      canvas.height = img.naturalHeight || 2048;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context not available'));

      ctx.drawImage(img, 0, 0);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return reject(new Error('SVG to PNG conversion failed'));
        pngBlob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))).catch(reject);
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG load error'));
    };

    img.src = url;
  });
};

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
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return reject(new Error('Canvas toBlob failed'));
        pngBlob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))).catch(reject);
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Native decode failed'));
    };

    img.src = url;
  });
};

export const normalizeToPNG = async (file: File, force: boolean = false): Promise<Uint8Array> => {
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
    } catch {
      console.warn('[Processor] HEIC failed, trying native...');
    }
  }

  if (isSVG) return await rasterizeSVG(originalBytes);

  try {
    return await browserNormalize(originalBytes);
  } catch (err) {
    console.warn('[Processor] Native normalization failed, falling back to Magick:', err);
  }

  return await new Promise<Uint8Array>((resolve) => {
    try {
      ImageMagick.read(originalBytes.slice(), (image) => {
        image.write(MagickFormat.Png, (data) => resolve(new Uint8Array(data.slice())));
      });
    } catch (err) {
      console.error('[Processor] Magick FATAL:', err);
      resolve(originalBytes.slice());
    }
  });
};
