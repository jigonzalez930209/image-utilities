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
  const url = new URL(event.request.url);
  
  // Skip chrome extensions and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

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

        // Log HTML document requests for debugging
        const isDocument = event.request.destination === 'document' || 
                          url.pathname.endsWith('.html') || 
                          url.pathname === '/' ||
                          url.pathname.endsWith('/');
        
        if (isDocument) {
          console.log('[SW] Intercepting document:', url.pathname);
        }

        // Add COOP/COEP headers
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
        // Allow same-origin resources to be embedded by cross-origin contexts
        newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');

        if (isDocument) {
          console.log('[SW] Added COOP/COEP headers to:', url.pathname);
        }

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
