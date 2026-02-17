import { useState, useCallback } from 'react';
import { runUpscalerViaWorker } from '../../lib/workerClient';

export const AI_MODELS = {
  classic: {
    id: 'caidas/swin2SR-classical-sr-x2-64',
    name: 'Classic (x2)',
    description: 'Standard balanced quality.',
    maxDim: 448,
  },
  fast: {
    id: 'Xenova/swin2SR-lightweight-x2-64',
    name: 'Fast (x2)',
    description: 'Lightweight & faster on CPU.',
    maxDim: 512,
  },
  pro: {
    id: 'Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr',
    name: 'Pro (Photo x4)',
    description: 'Best for real-world photos.',
    maxDim: 384, // Heavier, lower limit
  },
  restore: {
    id: 'Xenova/swin2SR-compressed-sr-x4-48',
    name: 'Restore (x4)',
    description: 'Fixes compression artifacts.',
    maxDim: 416,
  }
} as const;

export type AIModelType = keyof typeof AI_MODELS;

export const useAIEnhance = () => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState<AIModelType>('classic');

  const upscaleImage = useCallback(async (imageSrc: string): Promise<string | null> => {
    setIsEnhancing(true);
    setEnhanceProgress(0);
    try {
      const modelConfig = AI_MODELS[selectedModel];
      
      // Fetch image as blob to send to worker
      const response = await fetch(imageSrc);
      const inputBlob = await response.blob();
      
      console.log(`[Enhance] Sending ${inputBlob.size} bytes to worker for ${modelConfig.name}...`);

      const resultBlob = await runUpscalerViaWorker(inputBlob, modelConfig.id, (percent) => {
          setEnhanceProgress(percent / 100); // Worker sends 0-100, we use 0-1
      });

      console.log('[Enhance] Worker returned blob:', resultBlob.size);
      return URL.createObjectURL(resultBlob);
    } catch (error) {
      console.error('AI Enhancement failed:', error);
      return null;
    } finally {
      setIsEnhancing(false);
      setEnhanceProgress(0);
    }
  }, [selectedModel]);

  return { upscaleImage, isEnhancing, enhanceProgress, selectedModel, setSelectedModel };
};


