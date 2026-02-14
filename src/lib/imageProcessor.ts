import { removeBackground, type Config as BGConfig } from '@imgly/background-removal';
import { initializeImageMagick, ImageMagick, MagickFormat } from '@imagemagick/magick-wasm';
import heic2any from 'heic2any';
import { type ImageFormat } from './formats';

// Initialize ImageMagick with the WASM file
export const initMagick = async () => {
    const wasmUrl = new URL(
        '../../node_modules/@imagemagick/magick-wasm/dist/magick.wasm',
        import.meta.url
    ).href;
    const response = await fetch(wasmUrl);
    const wasmBytes = await response.arrayBuffer();
    await initializeImageMagick(wasmBytes);
};

export interface ProcessOptions {
  format?: ImageFormat;
  removeBackground?: boolean;
  bgModel?: 'isnet' | 'isnet_fp16' | 'isnet_quint8';
  quality?: number;
}

/**
 * Browsers can render SVG to Canvas natively, but Magick-WASM needs 
 * external delegates (like Inkscape) which don't exist in the browser.
 * This helper rasterizes SVG to PNG bytes using the browser's native engine.
 */
const rasterizeSVG = async (bytes: Uint8Array): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes.slice()], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      // Use natural size or fallback to 2048 for high quality if not specified
      canvas.width = img.naturalWidth || 2048;
      canvas.height = img.naturalHeight || 2048;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context no disponible'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Error al generar PNG desde SVG'));
          return;
        }
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, 'image/png');
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error al cargar el archivo SVG'));
    };
    
    img.src = url;
  });
};

export const convertImage = async (
  file: File,
  options: ProcessOptions
): Promise<Blob> => {
  const originalBytes = new Uint8Array(await file.arrayBuffer());
  let currentBytes: Uint8Array = originalBytes;

  const isSVG = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
  const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' || 
                 file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
  const isCommonFormat = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
  
  // 1. Normalize image to PNG if needed
  if (isHEIC) {
    try {
      const convertedBlob = await heic2any({ blob: file, toType: 'image/png' });
      const finalBlob = (Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob) as Blob;
      currentBytes = new Uint8Array(await finalBlob.arrayBuffer());
    } catch (err) {
      console.error('HEIC normalization failed:', err);
      // Fallback to ImageMagick if heic2any fails, though it likely will too
    }
  } else if (isSVG) {
    // Specialized SVG handling to bypass Magick Inkscape delegate issue
    currentBytes = await rasterizeSVG(originalBytes);
  } else if (options.removeBackground || !isCommonFormat) {
    currentBytes = await new Promise<Uint8Array>((resolve) => {
      try {
        ImageMagick.read(originalBytes, (image) => {
          image.write(MagickFormat.Png, (data) => {
            resolve(new Uint8Array(data.slice()));
          });
        });
      } catch (err) {
        console.error('Magick normalization failed:', err);
        resolve(originalBytes);
      }
    });
  }

  // 2. Remove background if requested (Skip for SVG as it's natively transparent)
  if (options.removeBackground && !isSVG) {
    const config: BGConfig = {
      model: options.bgModel || 'isnet_fp16',
      progress: (key, current, total) => {
        const percent = ((current / total) * 100).toFixed(0);
        const event = new CustomEvent('image-process-progress', { 
          detail: { key, percent, id: file.name } 
        });
        window.dispatchEvent(event);
      },
    };
    try {
      const bgResult = await removeBackground(new Blob([currentBytes.slice()], { type: 'image/png' }), config);
      currentBytes = new Uint8Array(await bgResult.arrayBuffer());
    } catch (err) {
      console.error('Background removal failed:', err);
      throw new Error('La eliminación de fondo falló. Asegúrate de que la imagen sea válida.');
    }
  }

  // 3. Final conversion to target format
  const targetFormatStr = (options.format || 'PNG').toUpperCase();
  const targetFormat = (targetFormatStr === 'SVG' ? MagickFormat.Svg : targetFormatStr) as MagickFormat;
  
  return new Promise((resolve, reject) => {
    try {
      ImageMagick.read(currentBytes, (image) => {
        if (options.quality) {
          image.quality = options.quality * 100;
        }

        image.write(targetFormat, (data) => {
          // Use .slice() to ensure the buffer is compatible with BlobPart (SharedArrayBuffer fix)
          const blob = new Blob([data.slice()], { type: `image/${options.format?.toLowerCase()}` });
          resolve(blob);
        });
      });
    } catch (error) {
      console.error('Final conversion failed:', error);
      reject(error);
    }
  });
};

export const previewBackgroundRemoval = async (
  file: File,
  model: 'isnet' | 'isnet_fp16' | 'isnet_quint8' = 'isnet_fp16'
): Promise<Blob> => {
  const config: BGConfig = {
    model,
    progress: (key, current, total) => {
      const percent = ((current / total) * 100).toFixed(0);
      const event = new CustomEvent('image-process-progress', { 
        detail: { key, percent, id: file.name } 
      });
      window.dispatchEvent(event);
    },
  };
  return await removeBackground(file, config);
};

export type { ImageFormat };
