/*! coop-coep.js - Service Worker to enable SharedArrayBuffer on GitHub Pages */
/*! Uses credentialless COEP for mobile browser compatibility */

self.addEventListener('install', () => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-http(s) requests (chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Skip cache-only cross-origin requests (can't be intercepted safely)
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return;

  event.respondWith(addCoopCoepHeaders(event.request));
});

async function addCoopCoepHeaders(request) {
  let response;
  try {
    response = await fetch(request);
  } catch (err) {
    console.error('[SW] Fetch failed:', err);
    throw err;
  }

  // Don't modify opaque responses (cross-origin no-cors)
  if (response.status === 0) return response;

  const newHeaders = new Headers(response.headers);
  newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
  newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
  newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');

  // For document/HTML responses: buffer the body to avoid stream cloning issues
  // on mobile Chrome where new Response(stream, ...) can fail silently.
  const isDocument =
    request.destination === 'document' ||
    request.mode === 'navigate' ||
    new URL(request.url).pathname.endsWith('.html');

  if (isDocument) {
    console.log('[SW] Injecting COOP/COEP into document:', new URL(request.url).pathname);
    try {
      // Buffer body as ArrayBuffer to avoid ReadableStream cloning issues on mobile
      const body = await response.arrayBuffer();
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      console.error('[SW] Failed to buffer document body, falling back to stream:', err);
    }
  }

  // For non-document resources: stream is fine
  try {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (err) {
    // Last resort: return original response unmodified
    console.warn('[SW] Could not inject headers for:', request.url, err);
    return response;
  }
}
