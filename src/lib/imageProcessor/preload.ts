import { removeBackground, type Config as BGConfig } from '@imgly/background-removal';
import { cachedFetch } from './cache';

const getPublicPath = (): string => {
  const base = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
  return `${window.location.origin}${base}assets/background-removal/`;
};

// ─── Fast model (imgly) preload ───────────────────────────────────────────────
// Runs removeBackground on a 1×1 transparent PNG to force the library to
// download and cache all ONNX/WASM assets for the given model.
const TINY_PNG = new Uint8Array([
  137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,
  31,21,196,137,0,0,0,10,73,68,65,84,120,156,98,0,1,0,0,5,0,1,13,10,45,180,
  0,0,0,0,73,69,78,68,174,66,96,130,
]);

const preloadFastModel = async (model: 'isnet_fp16' | 'isnet_quint8'): Promise<void> => {
  const config: BGConfig = {
    model,
    publicPath: getPublicPath(),
    fetchArgs: { fetch: cachedFetch },
    progress: () => { /* silent */ },
  };
  const blob = new Blob([TINY_PNG], { type: 'image/png' });
  await removeBackground(blob, config);
};

// ─── RMBG-1.4 (Pro) preload from local assets ────────────────────────────────
// Fetch model files from our own domain into the Cache API so they're
// ready when the worker initializes the pipeline (no HuggingFace requests).
const RMBG_FILES = [
  'onnx/model.onnx',
  'config.json',
  'preprocessor_config.json',
];

const preloadRmbgPro = async (): Promise<void> => {
  if (typeof caches === 'undefined') return;
  const base = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
  const modelBase = `${window.location.origin}${base}assets/models/Xenova/RMBG-1.4/`;
  const cache = await caches.open('transformers-cache-v1');
  for (const file of RMBG_FILES) {
    const url = `${modelBase}${file}`;
    const existing = await cache.match(url);
    if (existing) continue;
    try {
      const res = await fetch(url);
      if (res.ok) await cache.put(url, res);
    } catch { /* network error — skip silently */ }
  }
};

// ─── Idle scheduler ──────────────────────────────────────────────────────────
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

// ─── Public API ──────────────────────────────────────────────────────────────
let started = false;

/**
 * Kick off background model preloading in priority order:
 *   1. Medium (isnet_fp16)  — most commonly used
 *   2. Pro (RMBG-1.4)       — largest, start early
 *   3. Express (isnet_quint8) — smallest, lowest priority
 *
 * All downloads are sequential to avoid saturating mobile bandwidth.
 * Uses requestIdleCallback so it never blocks the UI.
 */
export const startBackgroundPreload = (): void => {
  if (started) return;
  started = true;

  // Fire and forget — errors are caught internally
  void (async () => {
    await runWhenIdle(() => preloadFastModel('isnet_fp16'), 'Medium model (isnet_fp16)');
    await runWhenIdle(() => preloadRmbgPro(), 'Pro model (RMBG-1.4 files)');
    await runWhenIdle(() => preloadFastModel('isnet_quint8'), 'Express model (isnet_quint8)');
  })();
};
