import { useState, useCallback } from 'react';
import { previewBackgroundRemoval, type ProgressStage } from '../../lib/imageProcessor';

export const useBackgroundRemoval = () => {
  const [progress, setProgress] = useState<ProgressStage | null>(null);

  const removeBg = useCallback(async (imageSrc: string): Promise<string> => {
    setProgress('loading');
    const response = await fetch(imageSrc);
    const blob = await response.blob();
    const file = new File([blob], 'image.png', { type: blob.type });
    setProgress('processing');
    const result = await previewBackgroundRemoval(file, 'ultra');
    setProgress(null);
    return URL.createObjectURL(result);
  }, []);

  return { removeBg, progress };
};
