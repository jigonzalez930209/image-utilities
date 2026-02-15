import { dispatchProcessStart } from './events';
import { getRMBGPipeline } from './rmbgPipeline';
import { RMBG_INFERENCE_TIMEOUT_MS, withTimeout } from './timeout';

const loadImageFromBlob = (blob: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image blob'));
    };

    img.src = url;
  });
};

const applyMaskToSource = async (sourcePngBytes: Uint8Array, maskBlob: Blob): Promise<Blob> => {
  const sourceBlob = new Blob([sourcePngBytes.slice()], { type: 'image/png' });
  const [sourceImage, maskImage] = await Promise.all([
    loadImageFromBlob(sourceBlob),
    loadImageFromBlob(maskBlob),
  ]);

  const width = sourceImage.naturalWidth || sourceImage.width;
  const height = sourceImage.naturalHeight || sourceImage.height;

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error('Canvas context not available for source composition');

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) throw new Error('Canvas context not available for mask composition');

  sourceCtx.drawImage(sourceImage, 0, 0, width, height);
  maskCtx.drawImage(maskImage, 0, 0, width, height);

  const sourceData = sourceCtx.getImageData(0, 0, width, height);
  const maskData = maskCtx.getImageData(0, 0, width, height);
  let brightPixels = 0;

  for (let i = 0; i < maskData.data.length; i += 4) {
    const luma = (maskData.data[i] + maskData.data[i + 1] + maskData.data[i + 2]) / 3;
    if (luma > 127) brightPixels += 1;
  }

  const shouldInvertMask = brightPixels / Math.max(width * height, 1) > 0.65;

  for (let i = 0; i < sourceData.data.length; i += 4) {
    const luma = (maskData.data[i] + maskData.data[i + 1] + maskData.data[i + 2]) / 3;
    const normalizedAlpha = (shouldInvertMask ? 255 - luma : luma) / 255;
    sourceData.data[i + 3] = Math.round(sourceData.data[i + 3] * normalizedAlpha);
  }

  sourceCtx.putImageData(sourceData, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    sourceCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to encode composed RMBG output as PNG'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
};

const extractRmbgBlob = async (output: any, sourcePngBytes: Uint8Array): Promise<Blob> => {
  const first = Array.isArray(output) ? output[0] : output;

  if (first?.mask && typeof first.mask.toBlob === 'function') {
    const maskBlob = await first.mask.toBlob();
    return await applyMaskToSource(sourcePngBytes, maskBlob);
  }

  if (!first || typeof first.toBlob !== 'function') {
    const shape = Array.isArray(output) ? `array(len=${output.length})` : typeof output;
    throw new Error(`RMBG output does not expose toBlob() (shape=${shape})`);
  }

  return await first.toBlob();
};

export const runRmbgBackgroundRemoval = async (
  pngBytes: Uint8Array,
  id: string,
  stageLabel: string
): Promise<Blob> => {
  const pipe = await getRMBGPipeline(id);
  dispatchProcessStart(id);
  console.log(`[Processor] Starting ${stageLabel} inference for ${id}...`);

  const inputUrl = URL.createObjectURL(new Blob([pngBytes.slice()]));
  try {
    const output = await withTimeout<any>(pipe(inputUrl), RMBG_INFERENCE_TIMEOUT_MS, `RMBG ${stageLabel} inference`);
    console.log(`[Processor] ${stageLabel} inference completed for ${id}`);
    return await extractRmbgBlob(output, pngBytes);
  } finally {
    URL.revokeObjectURL(inputUrl);
  }
};
