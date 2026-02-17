import { useState, useCallback, useRef } from 'react';
import { previewBackgroundRemoval, type ProgressStage } from '../../lib/imageProcessor';

export const useBackgroundRemoval = () => {
  const [progress, setProgress] = useState<ProgressStage | null>(null);
  // Cache structure: Map<imageSrc, Map<modelId, Blob>>
  const cacheRef = useRef<Map<string, Map<string, Blob>>>(new Map());

  const removeBg = useCallback(async (imageSrc: string, modelId: string = 'rmbg_14'): Promise<string> => {
    // Check cache first
    const srcCache = cacheRef.current.get(imageSrc);
    const cachedBlob = srcCache?.get(modelId);
    
    if (cachedBlob) {
      console.log(`[BG Removal] Using cached result for model ${modelId}`);
      return URL.createObjectURL(cachedBlob);
    }

    setProgress('loading');
    const response = await fetch(imageSrc);
    const blob = await response.blob();
    const file = new File([blob], 'image.png', { type: blob.type });
    setProgress('processing');
    const result = await previewBackgroundRemoval(file, 'bg-removal-task', modelId);
    setProgress(null);
    
    // Store in cache
    if (!cacheRef.current.has(imageSrc)) {
      cacheRef.current.set(imageSrc, new Map());
    }
    cacheRef.current.get(imageSrc)!.set(modelId, result);
    
    return URL.createObjectURL(result);
  }, []);

  return { removeBg, progress };
};
