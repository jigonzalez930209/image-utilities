import { removeBackground, type Config as BGConfig } from '@imgly/background-removal';
import { cachedFetch } from './cache';
import { dispatchImageProgress } from './events';
import type { FastBackgroundModel } from './types';

const buildConfig = (id: string, model: FastBackgroundModel): BGConfig => ({
  model: model as any,
  fetchArgs: { fetch: cachedFetch },
  // Force local ONNX Runtime assets to prevent version mismatches
  publicPath: '/assets/onnxruntime/',
  progress: (key, current, total) => {
    const percent = total > 0 ? ((current / total) * 100).toFixed(0) : '0';
    const stage = key.startsWith('fetch:') ? 'loading' : 'processing';
    dispatchImageProgress(id, key, percent, stage);
  },
});

export const runImglyBackgroundRemoval = async (
  pngBytes: Uint8Array,
  id: string,
  model: FastBackgroundModel
): Promise<Blob> => {
  const inputBlob = new Blob([pngBytes.slice()], { type: 'image/png' });
  return await removeBackground(inputBlob, buildConfig(id, model));
};

const isOrtMismatchError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  const msg = err.message || '';
  return msg.includes('_OrtGetInputOutputMetadata') || msg.includes('Failed to create session');
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
  let lastErr: unknown = null;

  for (const candidate of candidates) {
    try {
      if (candidate !== preferredModel) {
        console.warn(`[Processor] ${stageLabel}: ${preferredModel} failed, retrying with ${candidate}.`);
      }
      return await runImglyBackgroundRemoval(pngBytes, id, candidate);
    } catch (err) {
      lastErr = err;
      console.warn(`[Processor] ${stageLabel}: ${candidate} failed.`, err);
    }
  }

  if (isOrtMismatchError(lastErr)) {
    throw new Error(
      'Los modelos rápidos no pudieron inicializar ONNX Runtime. Ajusta dependencias: onnxruntime-web@1.21.0-dev.20250206-d981b153d3 y reinstala paquetes.'
    );
  }

  if (lastErr instanceof Error) throw lastErr;
  throw new Error('Fast background-removal models failed for an unknown reason.');
};

export const preloadModels = async (): Promise<void> => {
  const models: FastBackgroundModel[] = ['isnet_quint8', 'isnet_fp16', 'isnet'];
  console.log('[Processor] Starting background model pre-loading...');

  for (const model of models) {
    try {
      const tinyBlob = new Blob([new Uint8Array(1)], { type: 'image/png' });
      await removeBackground(tinyBlob, {
        model,
        fetchArgs: { mode: 'no-cors' },
      } as any);
    } catch {
      // Ignore intentional failures from synthetic tiny input.
    }
  }

  console.log('[Processor] Pre-loading requests sent. Ultra model loads on demand.');
};
