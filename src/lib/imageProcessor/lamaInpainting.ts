import { runInpaintViaWorker } from '../workerClient';
import { dispatchImageProgress } from './events';

export const runLamaInpainting = async (
  imageBlob: Blob,
  maskBlob: Blob
): Promise<Blob> => {
  console.log('[Inpaint] Initializing LaMa Pipeline...');
  
  return runInpaintViaWorker(imageBlob, maskBlob, (percent) => {
      dispatchImageProgress('inpaint', 'LaMa Model', percent.toString(), 'loading');
  });
};

// We need to implement runInpaintViaWorker in workerClient.ts
