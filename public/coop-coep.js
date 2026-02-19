/*! coi-serviceworker v0.1.8 - Android Chrome multithreading fix */
/* Single-file: acts as Service Worker when loaded in SW context, registration script in browser */
/*
 * DESIGN RATIONALE (Android Chrome):
 *
 * The SW must default coepCredentialless = TRUE so that the very first navigation
 * response it serves already carries COEP: credentialless + COOP: same-origin.
 * If the SW defaults to false (require-corp) and waits for a postMessage from the
 * page to switch to credentialless, it is already too late — the navigation response
 * (the HTML itself) was already served with the wrong COEP header, so the browser
 * never enters crossOriginIsolated mode for that page load.
 *
 * COEP: credentialless is supported on Android Chrome 96+ (released Oct 2021) and
 * is strictly better than require-corp for apps that load cross-origin resources
 * (fonts, CDN assets) because it does not require those resources to opt-in with
 * Cross-Origin-Resource-Policy headers.
 *
 * Flow:
 *   1st visit  → SW not installed → page loads without isolation → SW installs → reload
 *   2nd visit  → SW controlling   → serves credentialless headers → crossOriginIsolated=true ✓
 */

if (typeof window === 'undefined') {
  // ===== SERVICE WORKER CONTEXT =====

  // Always use credentialless — works on Android Chrome 96+ (Oct 2021).
  // Never wait for a postMessage; the navigation response must already have the right headers.
  const COEP = 'credentialless';

  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener('message', (ev) => {
    if (!ev.data) return;
    if (ev.data.type === 'deregister') {
      self.registration.unregister()
        .then(() => self.clients.matchAll())
        .then(clients => clients.forEach(client => client.navigate(client.url)));
    }
  });

  self.addEventListener('fetch', (event) => {
    const r = event.request;
    if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') return;

    // credentialless: strip credentials from no-cors cross-origin requests so
    // the browser accepts them without requiring CORP headers on the resource.
    const request = (r.mode === 'no-cors')
      ? new Request(r, { credentials: 'omit' })
      : r;

    const isNavigation = r.mode === 'navigate';

    event.respondWith(
      fetch(request).then(async (response) => {
        if (response.status === 0) return response;

        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Embedder-Policy', COEP);
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

        // CRITICAL for Android Chrome: streaming a navigation response body into
        // new Response() can silently fail. Buffer it as ArrayBuffer first.
        if (isNavigation) {
          const body = await response.arrayBuffer();
          return new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        }

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }).catch(e => console.error('[COI-SW] fetch error:', e))
    );
  });

} else {
  // ===== BROWSER CONTEXT (registration script) =====
  (() => {
    // Skip on localhost — dev server already sets COOP/COEP headers directly
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return;

    // Already isolated — SW is working correctly, nothing to do
    if (window.crossOriginIsolated) {
      sessionStorage.removeItem('coiRetry');
      console.log('[COI] crossOriginIsolated=true ✓ SharedArrayBuffer available, multithreading enabled');
      return;
    }

    if (!window.isSecureContext) {
      console.warn('[COI] Not registered: requires secure context (HTTPS).');
      return;
    }
    if (!navigator.serviceWorker) {
      console.warn('[COI] Not registered: serviceWorker API unavailable.');
      return;
    }

    const swUrl = document.currentScript.src;

    navigator.serviceWorker.register(swUrl).then(
      (registration) => {
        console.log('[COI] SW registered:', registration.scope);

        const doReload = () => {
          console.log('[COI] Reloading to activate COOP/COEP headers...');
          window.location.reload();
        };

        if (registration.installing || registration.waiting) {
          // SW just installed or waiting — reload once it activates
          const sw = registration.installing || registration.waiting;
          sw.addEventListener('statechange', (e) => {
            if (e.target.state === 'activated') doReload();
          });
          return;
        }

        if (registration.active && !navigator.serviceWorker.controller) {
          // SW active but not yet controlling this page (e.g. hard refresh)
          doReload();
          return;
        }

        // SW is controlling but crossOriginIsolated is still false.
        // This can happen on Android Chrome when the SW served the page before
        // it was updated. Reload once to get the correct headers.
        if (navigator.serviceWorker.controller) {
          const retryKey = 'coiRetry';
          const retries = parseInt(sessionStorage.getItem(retryKey) || '0');
          if (retries < 2) {
            sessionStorage.setItem(retryKey, String(retries + 1));
            console.log(`[COI] SW controlling but not isolated — reload attempt ${retries + 1}/2`);
            doReload();
          } else {
            sessionStorage.removeItem(retryKey);
            console.warn('[COI] crossOriginIsolated still false after retries. Device may not support COEP credentialless.');
          }
        }
      },
      (err) => {
        console.error('[COI] SW registration failed:', err);
      }
    );
  })();
}
