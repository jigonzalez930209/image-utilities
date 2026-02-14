import { useState, useCallback } from 'react';
import { convertImage, type ProcessOptions, type ImageFormat } from '../lib/imageProcessor';

export interface ProcessedImage {
  id: string;
  originalName: string;
  originalSize: number;
  originalUrl: string;
  processedUrl?: string;
  processedSize?: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  error?: string;
  format: ImageFormat;
  removeBackground: boolean;
  progress?: { key: string; percent: string };
}

export const useImageProcessor = () => {
  const [images, setImages] = useState<ProcessedImage[]>([]);

  // Add event listener for progress
  useState(() => {
    const handler = (e: Event): void => {
      const customEvent = e as CustomEvent<{ key: string; percent: string; id: string }>;
      const { key, percent, id } = customEvent.detail;
      setImages(prev => prev.map(img => 
        img.originalName === id ? { ...img, progress: { key, percent } } : img
      ));
    };
    window.addEventListener('image-process-progress', handler);
    return () => window.removeEventListener('image-process-progress', handler);
  });

  const addImages = useCallback((files: File[]): void => {
    const newImages: ProcessedImage[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      originalName: file.name,
      originalSize: file.size,
      originalUrl: URL.createObjectURL(file),
      status: 'idle',
      format: 'PNG',
      removeBackground: false,
    }));
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const updateImageOptions = useCallback((id: string, options: Partial<ProcessedImage>): void => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...options } : img))
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
      };

      const resultBlob = await convertImage(file, options);
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

  const removeImage = useCallback((id: string): void => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) {
        URL.revokeObjectURL(img.originalUrl);
        if (img.processedUrl) URL.revokeObjectURL(img.processedUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  return {
    images,
    addImages,
    updateImageOptions,
    processImage,
    removeImage,
  };
};
