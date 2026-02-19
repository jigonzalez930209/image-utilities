import { cachedFetch } from './cache';

// Skip preload - using CDN for background-removal models
const preloadFastModel = async (model: 'isnet_fp16' | 'isnet_quint8'): Promise<void> => {
  console.log(`[Preload] Skipping ${model} - using CDN`);
};

// Skip RMBG preload - model not available without auth
const preloadRmbgPro = async (): Promise<void> => {
  console.log('[Preload] Skipping RMBG-1.4 - not available without auth');
};

// Idle scheduler
const runWhenIdle = (fn: () => Promise<void>, label: string): Promise<void> =>
  new Promise<void>((resolve) => {
    const run = async () => {
      try {
        console.log(`[Preload] Starting: ${label}`);
        await fn();
        console.log(`[Preload] Done: ${label}`);
      } catch (err) {
        console.warn(`[Preload] Failed (non-critical): ${label}`, err);
      }
      resolve();
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => void run(), { timeout: 5000 });
    } else {
      setTimeout(() => void run(), 2000);
    }
  });

let started = false;

export const startBackgroundPreload = (): void => {
  if (started) return;
  started = true;

  void (async () => {
    await runWhenIdle(() => preloadFastModel('isnet_fp16'), 'Medium model (isnet_fp16)');
    await runWhenIdle(() => preloadRmbgPro(), 'Pro model (RMBG-1.4 files)');
    await runWhenIdle(() => preloadFastModel('isnet_quint8'), 'Express model (isnet_quint8)');
  })();
};
