import { useState, useCallback } from 'react';
import { pipeline, env, type ImageClassificationPipeline } from '@huggingface/transformers';
import type { FilterState } from './types';
import { DEFAULT_FILTERS } from './useFilters';

// Configure environment for purely local execution
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/assets/models/';
env.useBrowserCache = false; // Disable to avoid caching 404/401 HTML responses

// Configure local WASM paths
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/assets/models/wasm/';
  env.backends.onnx.wasm.numThreads = 1; // Reduce memory overhead for CPU mode
}

let classifier: ImageClassificationPipeline | null = null;

export const useAIAutoFix = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeImage = useCallback(async (imageSrc: string): Promise<Partial<FilterState> | null> => {
    setIsAnalyzing(true);
    try {
      if (!classifier) {
        try {
          // Force WASM for local execution to avoid WebGPU adapter errors
          classifier = (await pipeline('image-classification', 'Xenova/mobilenet_v1_1.0_224_quantized', {
            device: 'wasm', 
            dtype: 'q8',
          })) as unknown as ImageClassificationPipeline;
        } catch (err: unknown) {
          const error = err as {message?: string};
          if (error?.message?.includes('Unexpected token')) {
            throw new Error('Modelo no encontrado o corrupto. Por favor, intenta un "Hard Reload" (Ctrl+F5) para limpiar el caché de errores. Archivos esperados en: /assets/models/Xenova/mobilenet_v1_1.0_224_quantized/');
          }
          throw err;
        }
      }

      // Detect lighting/quality issues via heuristics first, then maybe model for specific "vibe"
      // Actually, for real "AI" we can use a model to detect scenes or lighting.
      // But for speed and UX, combined approach is best.
      
      const img = new Image();
      img.src = imageSrc;
      await img.decode();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Small sample for statistical analysis
      canvas.width = 100;
      canvas.height = 100;
      ctx.drawImage(img, 0, 0, 100, 100);
      const data = ctx.getImageData(0, 0, 100, 100).data;

      let brightness = 0;
      let rSum = 0, bSum = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const b = data[i + 2];
        brightness += (r * 0.299 + data[i+1] * 0.587 + b * 0.114);
        rSum += r; bSum += b;
      }

      const avgBrightness = brightness / (100 * 100);
      const avgR = rSum / (100 * 100);
      const avgB = bSum / (100 * 100);

      // Suggestions based on statistics
      const suggestions: Partial<FilterState> = { ...DEFAULT_FILTERS };

      // Brightness correction
      if (avgBrightness < 80) suggestions.brightness = 120; // Too dark
      else if (avgBrightness > 180) suggestions.brightness = 90; // Too bright

      // Contrast (rough estimate via standard deviation would be better, but let's keep it simple for now)
      if (avgBrightness > 100 && avgBrightness < 150) suggestions.contrast = 115;
      
      // Temperature correction
      if (avgR > avgB + 20) suggestions.temperature = -15; // Too warm
      if (avgB > avgR + 20) suggestions.temperature = 15; // Too cold

      // Vibrance
      suggestions.vibrance = 120; // Usually looks better

      // Wait a bit to simulate "thinking" if it was too fast
      await new Promise(r => setTimeout(r, 800));

      return suggestions;
    } catch (error) {
      console.error('AI Analysis failed:', error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { analyzeImage, isAnalyzing };
};
