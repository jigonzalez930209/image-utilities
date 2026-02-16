import type { Layer } from './types';
import { getFilterString } from './useFilters';

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export const getFilterStringFromFilters = getFilterString;

export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  filters: string,
  format: string = 'png',
  quality: number = 90
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('No context');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.filter = filters;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  const mime = format === 'jpg' ? 'image/jpeg' : `image/${format}`;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, mime, quality / 100);
  });
};

export const getProcessedImg = async (
  layers: Layer[],
  rotation = 0,
  globalFilters: string = 'none',
  format: string = 'png',
  quality: number = 90
): Promise<Blob> => {
  // Find base image to determine canvas size
  const baseLayer = layers.find(l => l.id === 'base-layer') || layers[0];
  if (!baseLayer) throw new Error('No layers found');

  const image = await createImage(baseLayer.content);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('No context');

  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));

  const canvasWidth = Math.ceil(image.width * cos + image.height * sin);
  const canvasHeight = Math.ceil(image.width * sin + image.height * cos);

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  ctx.save();
  ctx.filter = globalFilters;
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.rotate(radians);
  
  // Render layers
  for (const layer of layers) {
    if (!layer.visible) continue;

    ctx.save();
    ctx.globalAlpha = (layer.opacity ?? 100) / 100;
    
    // Apply per-layer filters
    if (layer.filters) {
      ctx.filter = getFilterString(layer.filters);
    }
    
    if (layer.type === 'image') {
      const img = layer.id === baseLayer.id ? image : await createImage(layer.content);
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation || 0) * Math.PI / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2, layer.width || img.width, layer.height || img.height);
    } else {
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation || 0) * Math.PI / 180);
      ctx.fillStyle = layer.color || '#ffffff';
      
      const fontStyle = layer.fontStyle || 'normal';
      const fontWeight = layer.fontWeight || 'normal';
      ctx.font = `${fontStyle} ${fontWeight} ${layer.fontSize || 24}px ${layer.fontFamily || 'sans-serif'}`;
      
      if (layer.textShadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      } else {
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      ctx.textAlign = layer.textAlign || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(layer.content, 0, 0);
    }
    ctx.restore();
  }
  ctx.restore();

  const mime = format === 'jpg' ? 'image/jpeg' : `image/${format}`;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, mime, quality / 100);
  });
};

export const applyCanvasFilter = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // Apply custom filters here if needed
  ctx.putImageData(imageData, 0, 0);

  return canvas;
};
