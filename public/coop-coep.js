/*! coi-serviceworker v0.1.7 - adapted from https://github.com/gzuidhof/coi-serviceworker (MIT) */
/* Single-file: acts as Service Worker when loaded in SW context, registration script in browser */

let coepCredentialless = false;

if (typeof window === 'undefined') {
  // ===== SERVICE WORKER CONTEXT =====
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener('message', (ev) => {
    if (!ev.data) return;
    if (ev.data.type === 'deregister') {
      self.registration.unregister()
        .then(() => self.clients.matchAll())
        .then(clients => clients.forEach(client => client.navigate(client.url)));
    } else if (ev.data.type === 'coepCredentialless') {
      coepCredentialless = ev.data.value;
    }
  });

  self.addEventListener('fetch', (event) => {
    const r = event.request;
    if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') return;

    // For credentialless mode: strip credentials from no-cors cross-origin requests
    const request = (coepCredentialless && r.mode === 'no-cors')
      ? new Request(r, { credentials: 'omit' })
      : r;

    const isNavigation = r.mode === 'navigate';

    event.respondWith(
      fetch(request).then(async (response) => {
        if (response.status === 0) return response;

        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Embedder-Policy',
          coepCredentialless ? 'credentialless' : 'require-corp'
        );
        if (!coepCredentialless) {
          newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
        }
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
    // Skip on localhost — dev server already sets COOP/COEP headers
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return;

    const reloadedBySelf = window.sessionStorage.getItem('coiReloadedBySelf');
    window.sessionStorage.removeItem('coiReloadedBySelf');

    // If isolated, clear retry count
    if (window.crossOriginIsolated) {
      window.sessionStorage.removeItem('coiRetryCount');
    }

    const coepDegrading = (reloadedBySelf === 'coepdegrade');

    const coi = {
      shouldRegister: () => !reloadedBySelf,
      shouldDeregister: () => false,
      coepCredentialless: () => true,
      coepDegrade: () => true,
      doReload: () => window.location.reload(),
      quiet: false,
      ...window.coi,
    };

    const n = navigator;
    const controlling = n.serviceWorker && n.serviceWorker.controller;

    // Track COEP failure
    if (controlling && !window.crossOriginIsolated) {
      window.sessionStorage.setItem('coiCoepHasFailed', 'true');
    }
    const coepHasFailed = window.sessionStorage.getItem('coiCoepHasFailed');

    if (controlling) {
      const reloadToDegrade = coi.coepDegrade() && !(coepDegrading || window.crossOriginIsolated);
      n.serviceWorker.controller.postMessage({
        type: 'coepCredentialless',
        value: (reloadToDegrade || (coepHasFailed && coi.coepDegrade()))
          ? false
          : coi.coepCredentialless(),
      });
      if (reloadToDegrade) {
        !coi.quiet && console.log('[COI] Reloading to degrade COEP to require-corp...');
        window.sessionStorage.setItem('coiReloadedBySelf', 'coepdegrade');
        coi.doReload();
        return;
      }
      if (coi.shouldDeregister()) {
        n.serviceWorker.controller.postMessage({ type: 'deregister' });
      }
    }

    // Already isolated or no crossOriginIsolated support — nothing to do
    if (window.crossOriginIsolated !== false || !coi.shouldRegister()) return;

    if (!window.isSecureContext) {
      !coi.quiet && console.log('[COI] Not registered: requires secure context (HTTPS).');
      return;
    }
    if (!n.serviceWorker) {
      !coi.quiet && console.error('[COI] Not registered: serviceWorker unavailable.');
      return;
    }

    // Register this file as the Service Worker (same URL = correct scope)
    n.serviceWorker.register(window.document.currentScript.src).then(
      (registration) => {
        !coi.quiet && console.log('[COI] SW registered:', registration.scope);

        registration.addEventListener('updatefound', () => {
          !coi.quiet && console.log('[COI] SW updated, reloading...');
          window.sessionStorage.setItem('coiReloadedBySelf', 'updatefound');
          coi.doReload();
        });

        // SW is active but not yet controlling — must reload to get headers
        if (registration.active && !n.serviceWorker.controller) {
          !coi.quiet && console.log('[COI] SW active but not controlling, reloading...');
          window.sessionStorage.setItem('coiReloadedBySelf', 'notcontrolling');
          coi.doReload();
        }

        // AGGRESSIVE RETRY FOR MOBILE:
        // If controlling but NOT isolated, force reload up to 3 times.
        // Android Chrome sometimes needs an extra cycle to apply headers.
        if (n.serviceWorker.controller && !window.crossOriginIsolated) {
          const retryCount = parseInt(window.sessionStorage.getItem('coiRetryCount') || '0');
          if (retryCount < 3) {
            !coi.quiet && console.log(`[COI] Controlled but not isolated. Retrying... (${retryCount + 1}/3)`);
            window.sessionStorage.setItem('coiRetryCount', (retryCount + 1).toString());
            window.sessionStorage.setItem('coiReloadedBySelf', 'retry_isolation');
            coi.doReload();
          } else {
            console.warn('[COI] Max retries reached. Cross-Origin Isolation failed on this device.');
          }
        }
      },
      (err) => {
        !coi.quiet && console.error('[COI] SW registration failed:', err);
      }
    );
  })();
}
