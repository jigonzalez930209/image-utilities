/*! coop-coep.js - v0.1.0 - Service Worker to enable SharedArrayBuffer on GitHub Pages */
/*! Based on https://github.com/gzuidhof/coop-coep */

self.addEventListener('install', () => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Skip cache-only requests that are not same-origin
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Don't modify opaque responses
        if (response.status === 0) {
          return response;
        }

        // Add COOP/COEP headers
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      })
      .catch((error) => {
        console.error('[SW] Fetch failed:', error);
        throw error;
      })
  );
});
