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
      self.registration.unregister().then(() => self.clients.matchAll()).then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
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

    event.respondWith(
      fetch(request).then((response) => {
        if (response.status === 0) return response;

        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Embedder-Policy',
          coepCredentialless ? 'credentialless' : 'require-corp'
        );
        if (!coepCredentialless) {
          newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
        }
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

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
    const reloadedBySelf = window.sessionStorage.getItem('coiReloadedBySelf');
    window.sessionStorage.removeItem('coiReloadedBySelf');
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
      !coi.quiet && console.error('[COI] Not registered: serviceWorker unavailable (private mode?).');
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

        // Active but not yet controlling this page — reload to activate
        if (registration.active && !n.serviceWorker.controller) {
          !coi.quiet && console.log('[COI] SW active but not controlling, reloading...');
          window.sessionStorage.setItem('coiReloadedBySelf', 'notcontrolling');
          coi.doReload();
        }
      },
      (err) => {
        !coi.quiet && console.error('[COI] SW registration failed:', err);
      }
    );
  })();
}
