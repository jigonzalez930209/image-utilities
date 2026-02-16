import { useState, useCallback, useEffect } from 'react';
import { convertImage, type ProcessOptions, type OutputFormat } from '../lib/imageProcessor/index';

export interface ProcessedImage {
  id: string;
  originalName: string;
  originalSize: number;
  originalUrl: string;
  processedUrl?: string;
  processedSize?: number;
  previewUrl?: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  error?: string;
  format: OutputFormat;
  removeBackground: boolean;
  bgModel: 'isnet' | 'isnet_fp16' | 'isnet_quint8' | 'rmbg_14';
  stripMetadata: boolean;
  progress?: { key: string; percent: string; stage?: 'loading' | 'processing' };
}

export const useImageProcessor = () => {
  const [images, setImages] = useState<ProcessedImage[]>([]);

  // Add event listener for progress
  useEffect(() => {
    const handler = (e: Event): void => {
      const customEvent = e as CustomEvent<{ key: string; percent: string; id: string; stage?: 'loading' | 'processing' }>;
      const { key, percent, id, stage } = customEvent.detail;
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, progress: { key, percent, stage } } : img
      ));
    };
    window.addEventListener('image-process-progress', handler);
    return () => window.removeEventListener('image-process-progress', handler);
  }, []);

  const addImages = useCallback((files: File[]): void => {
    const newImages: ProcessedImage[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      originalName: file.name,
      originalSize: file.size,
      originalUrl: URL.createObjectURL(file),
      status: 'idle',
      format: 'PNG',
      removeBackground: false,
      bgModel: 'isnet_fp16',
      stripMetadata: true,
    }));
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const updateImageOptions = useCallback((id: string, options: Partial<ProcessedImage>): void => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== id) return img;
        
        // If critical options change, reset status to idle so they can process again
        const hasCriticalChanges = 
          (options.format && options.format !== img.format) ||
          (options.bgModel && options.bgModel !== img.bgModel) ||
          (options.removeBackground !== undefined && options.removeBackground !== img.removeBackground) ||
          (options.stripMetadata !== undefined && options.stripMetadata !== img.stripMetadata);
          
        const newStatus = hasCriticalChanges && (img.status === 'completed' || img.status === 'error')
          ? 'idle'
          : options.status || img.status;
          
        // Clear URLs if they change so they reload
        const newResults = hasCriticalChanges ? {
          processedUrl: undefined,
          previewUrl: undefined,
          progress: undefined
        } : {};

        return { ...img, ...options, ...newResults, status: newStatus };
      })
    );
  }, []);

  const processImage = useCallback(async (id: string): Promise<void> => {
    const img = images.find((i) => i.id === id);
    if (!img) return;

    updateImageOptions(id, { status: 'processing', error: undefined });

    try {
      const response = await fetch(img.originalUrl);
      const blob = await response.blob();
      const file = new File([blob], img.originalName, { type: blob.type });

      const options: ProcessOptions = {
        format: img.format,
        removeBackground: img.removeBackground,
        bgModel: img.bgModel,
        stripMetadata: img.stripMetadata,
      };

      const resultBlob = await convertImage(file, options, id);
      const processedUrl = URL.createObjectURL(resultBlob);

      updateImageOptions(id, {
        status: 'completed',
        processedUrl,
        processedSize: resultBlob.size,
      });
    } catch (error) {
      updateImageOptions(id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [images, updateImageOptions]);

  const previewBackground = useCallback(async (id: string): Promise<void> => {
    const img = images.find((i) => i.id === id);
    if (!img) return;

    updateImageOptions(id, { status: 'processing', error: undefined });

    try {
      const response = await fetch(img.originalUrl);
      const blob = await response.blob();
      const file = new File([blob], img.originalName, { type: blob.type });

      const { previewBackgroundRemoval } = await import('../lib/imageProcessor/index');
      const resultBlob = await previewBackgroundRemoval(file, id, img.bgModel);
      
      const previewUrl = URL.createObjectURL(resultBlob);
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);

      updateImageOptions(id, {
        status: 'idle', // Back to idle after preview
        previewUrl,
      });
    } catch (error) {
      updateImageOptions(id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Preview failed',
      });
      throw error;
    }
  }, [images, updateImageOptions]);

  const removeImage = useCallback((id: string): void => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) {
        URL.revokeObjectURL(img.originalUrl);
        if (img.processedUrl) URL.revokeObjectURL(img.processedUrl);
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback((): void => {
    setImages((prev) => {
      prev.forEach(img => {
        URL.revokeObjectURL(img.originalUrl);
        if (img.processedUrl) URL.revokeObjectURL(img.processedUrl);
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
      return [];
    });
  }, []);

  const setGlobalOptions = useCallback((options: Partial<ProcessedImage>): void => {
    setImages((prev) => prev.map(img => ({
      ...img,
      ...options,
      status: (img.status === 'completed' || img.status === 'error') ? 'idle' : img.status,
      processedUrl: (img.status === 'completed' || img.status === 'error') ? undefined : img.processedUrl,
      previewUrl: (img.status === 'completed' || img.status === 'error') ? undefined : img.previewUrl,
    })));
  }, []);

  const processAll = useCallback(async (): Promise<void> => {
    const idleImages = images.filter(img => img.status === 'idle');
    // Process in sequence to avoid overloading (or could use a limit)
    for (const img of idleImages) {
      await processImage(img.id);
    }
  }, [images, processImage]);

  return {
    images,
    addImages,
    updateImageOptions,
    processImage,
    previewBackground,
    removeImage,
    clearAll,
    setGlobalOptions,
    processAll,
  };
};
