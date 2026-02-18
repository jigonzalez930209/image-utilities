/*! coop-coep.js - v0.1.0 - Service Worker to enable SharedArrayBuffer on GitHub Pages */
/*! Based on https://github.com/gzuidhof/coop-coep */

if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

  async function handleFetch(request) {
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
      return;
    }

    const response = await fetch(request).catch((e) => console.error(e));

    if (response?.status === 0) {
      return response;
    }

    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
    newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  self.addEventListener('fetch', function (e) {
    e.respondWith(handleFetch(e.request));
  });
} else {
  (() => {
    const reloadedKey = 'coopCoepReloaded';
    
    // Avoid infinite reload loop
    if (window.sessionStorage.getItem(reloadedKey)) {
      window.sessionStorage.removeItem(reloadedKey);
      return;
    }

    // Register service worker
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const script = document.currentScript;
      if (!script) return;
      
      const relativeScriptPath = script.src.split(window.location.origin)[1];
      
      navigator.serviceWorker
        .register(relativeScriptPath)
        .then(
          (registration) => {
            console.log('[COOP/COEP] Service Worker registered:', registration.scope);
            registration.addEventListener('updatefound', () => {
              console.log('[COOP/COEP] Service Worker is installing...');
            });
            
            // If we're not already controlled, reload after a short delay
            if (!navigator.serviceWorker.controller) {
              console.log('[COOP/COEP] Reloading page to activate Service Worker...');
              window.sessionStorage.setItem(reloadedKey, 'true');
              window.location.reload();
            }
          },
          (err) => console.error('[COOP/COEP] Service Worker registration failed:', err)
        );
    } else {
      console.log('[COOP/COEP] Skipping Service Worker on localhost');
    }
  })();
}
