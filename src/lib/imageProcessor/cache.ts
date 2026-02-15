const CACHE_NAME = 'imgly-models-cache-v2';
const CACHE_TTL = 3 * 24 * 60 * 60 * 1000;

export const cachedFetch = async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
  const urlStr = url.toString();
  // Cache both remote model files and local onnxruntime assets
  const shouldCache = urlStr.includes('/models/') || urlStr.includes('/onnxruntime-web/') || urlStr.includes('/assets/onnxruntime/');

  if (!shouldCache || typeof caches === 'undefined') {
    return fetch(url, options);
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(urlStr);

    if (cachedResponse) {
      const dateHeader = cachedResponse.headers.get('date');
      const cachedTime = dateHeader ? new Date(dateHeader).getTime() : 0;

      if (Date.now() - cachedTime < CACHE_TTL) {
        console.log(`[Processor] Serving from cache: ${urlStr}`);
        return cachedResponse;
      }

      console.log(`[Processor] Cache expired for: ${urlStr}`);
      await cache.delete(urlStr);
    }

    const networkResponse = await fetch(url, options);
    if (networkResponse.ok) {
      await cache.put(urlStr, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.warn(`[Processor] Cache failed for ${urlStr}, falling back to network:`, err);
    return fetch(url, options);
  }
};
