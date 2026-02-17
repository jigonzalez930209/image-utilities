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

  for (let i = 0; i < sourceData.data.length; i += 4) {
    // Subject mask: white (255) is subject.
    const luma = (maskData.data[i] + maskData.data[i + 1] + maskData.data[i + 2]) / 3;
    const normalizedAlpha = luma / 255;
    sourceData.data[i + 3] = Math.round(sourceData.data[i + 3] * normalizedAlpha);
  }

  sourceCtx.putImageData(sourceData, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    sourceCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to encode composed output as PNG'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
};



export const runRmbgBackgroundRemoval = async (
  pngBytes: Uint8Array,
  id: string,
  stageLabel: string,
  modelId?: string
): Promise<Blob> => {
  const pipe = await getRMBGPipeline(id, modelId);
  dispatchProcessStart(id);
  console.log(`[Processor] Starting ${stageLabel} inference for ${id}...`);

  try {
    const inputBlob = new Blob([pngBytes.slice()]);
    console.log(`[Processor] ${stageLabel} input Blob size:`, inputBlob.size);
    
    // The pipeline proxy now accepts a Blob and answers with a mask Blob
    const maskBlob = await withTimeout<Blob>(
        pipe(inputBlob), 
        RMBG_INFERENCE_TIMEOUT_MS, 
        `RMBG ${stageLabel} inference`
    );
    console.log(`[Processor] ${stageLabel} mask blob received:`, maskBlob.size);
    
    return await applyMaskToSource(pngBytes, maskBlob);
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[Processor] ${stageLabel} inference failed:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw err;
  }
};
