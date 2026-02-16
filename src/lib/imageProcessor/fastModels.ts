import { removeBackground, type Config as BGConfig } from '@imgly/background-removal';
import { cachedFetch } from './cache';
import { dispatchImageProgress } from './events';
import type { FastBackgroundModel } from './types';

/** Assets en public/assets/background-removal/. Respeta base (ej. /image-utilities/ en GitHub Pages). */
const getPublicPath = (): string => {
  const base = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${base}assets/background-removal/`;
  }
  return `${base}assets/background-removal/`;
};

const buildConfig = (id: string, model: FastBackgroundModel): BGConfig => {
  return {
    model: model as BGConfig['model'],
    publicPath: getPublicPath(),
    fetchArgs: { fetch: cachedFetch },
    progress: (key: string, current: number, total: number) => {
      const percent = total > 0 ? ((current / total) * 100).toFixed(0) : '0';
      const stage = key.startsWith('fetch:') ? 'loading' : 'processing';
      dispatchImageProgress(id, key, percent, stage);
    },
  };
};

export const runImglyBackgroundRemoval = async (
  pngBytes: Uint8Array,
  id: string,
  model: FastBackgroundModel
): Promise<Blob> => {
  const inputBlob = new Blob([pngBytes.slice()], { type: 'image/png' });
  return await removeBackground(inputBlob, buildConfig(id, model));
};

const isOrtMismatchError = (err: Error | null): boolean => {
  if (!err) return false;
  const msg = err.message || '';
  return msg.includes('_OrtGetInputOutputMetadata') || msg.includes('Failed to create session');
};

/** True when the error is due to CORS or network (e.g. CDN blocks localhost). Use to fallback to RMBG. */
export const isCorsOrFetchError = (err: Error | null): boolean => {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return msg.includes('failed to fetch') || msg.includes('cors') || msg.includes('access-control') || msg.includes('network');
};

const IMGly_FALLBACK_CHAIN: Record<FastBackgroundModel, FastBackgroundModel[]> = {
  isnet_quint8: ['isnet_fp16', 'isnet'],
  isnet_fp16: ['isnet'],
  isnet: [],
};

export const runFastModelBackgroundRemoval = async (
  pngBytes: Uint8Array,
  id: string,
  preferredModel: FastBackgroundModel,
  stageLabel: string
): Promise<Blob> => {
  const candidates = [preferredModel, ...IMGly_FALLBACK_CHAIN[preferredModel]];
  let lastErr: Error | null = null;

  for (const candidate of candidates) {
    try {
      if (candidate !== preferredModel) {
        console.warn(`[Processor] ${stageLabel}: ${preferredModel} failed, retrying with ${candidate}.`);
      }
      return await runImglyBackgroundRemoval(pngBytes, id, candidate);
    } catch (err) {
      lastErr = err as Error;
      console.warn(`[Processor] ${stageLabel}: ${candidate} failed.`, lastErr);
    }
  }

  if (isOrtMismatchError(lastErr)) {
    throw new Error(
      'Fast models could not initialize ONNX Runtime. Check dependencies: onnxruntime-web@1.21.0-dev.20250206-d981b153d3 and reinstall.'
    );
  }

  if (lastErr) throw lastErr;
  throw new Error('Fast background-removal models failed for an unknown reason.');
};

export const preloadModels = async (): Promise<void> => {
  // Only preload the default model to avoid excessive network requests
  // Authenticated fetch spamming console - disabling preload for now
};
