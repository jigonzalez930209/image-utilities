import { cachedFetch } from './cache';

const getPublicPath = (): string => {
  const base = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
  return `${window.location.origin}${base}assets/background-removal/`;
};

// ─── Fast model (imgly) preload ───────────────────────────────────────────────
// @imgly/background-removal uses a resources.json manifest that lists all
// chunk files needed. We fetch them directly into the browser cache instead
// of running a full inference (which requires a valid image to decode).
const preloadFastModel = async (model: 'isnet_fp16' | 'isnet_quint8'): Promise<void> => {
  const publicPath = getPublicPath();
  const resourcesUrl = `${publicPath}resources.json`;

  // Fetch the manifest
  const res = await fetch(resourcesUrl);
  if (!res.ok) throw new Error(`Failed to fetch resources.json: ${res.status}`);
  const resources = await res.json() as Record<string, { chunks: { name: string }[] }>;

  // Collect all chunk filenames referenced in the manifest
  const chunkNames = new Set<string>();
  for (const entry of Object.values(resources)) {
    for (const chunk of entry.chunks ?? []) {
      if (chunk.name) chunkNames.add(chunk.name);
    }
  }

  // Also include the model-specific ONNX file pattern
  // imgly names model files like: isnet_fp16.onnx, isnet_quint8.onnx
  // They appear as chunks in resources.json already, but add the model key too
  const modelKey = `/${model}.onnx`;
  if (resources[modelKey]) {
    for (const chunk of resources[modelKey].chunks ?? []) {
      chunkNames.add(chunk.name);
    }
  }

  // Fetch each chunk using cachedFetch (writes to Cache API)
  let fetched = 0;
  for (const name of chunkNames) {
    const url = `${publicPath}${name}`;
    await cachedFetch(url).catch(() => { /* skip on error */ });
    fetched++;
  }

  console.log(`[Preload] ${model}: cached ${fetched} chunks`);
};

// ─── RMBG-1.4 (Pro) preload from local assets ────────────────────────────────
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
 *   1. Medium (isnet_fp16)    — most commonly used
 *   2. Pro (RMBG-1.4)         — largest, start early
 *   3. Express (isnet_quint8) — smallest, lowest priority
 *
 * Sequential to avoid saturating mobile bandwidth.
 * Uses requestIdleCallback so it never blocks the UI.
 */
export const startBackgroundPreload = (): void => {
  if (started) return;
  started = true;

  void (async () => {
    await runWhenIdle(() => preloadFastModel('isnet_fp16'), 'Medium model (isnet_fp16)');
    await runWhenIdle(() => preloadRmbgPro(), 'Pro model (RMBG-1.4 files)');
    await runWhenIdle(() => preloadFastModel('isnet_quint8'), 'Express model (isnet_quint8)');
  })();
};
