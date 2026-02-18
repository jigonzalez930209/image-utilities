import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initMagick, preloadModels, startBackgroundPreload } from './lib/imageProcessor/index'

const root = document.getElementById('root')!;

const renderApp = () => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  // Start background model preloading after render, using idle time
  startBackgroundPreload();
};

// Only initialize Magick-WASM when crossOriginIsolated is true (SharedArrayBuffer available).
// On first load the SW is not yet active so crossOriginIsolated=false — the SW will trigger
// a page reload and on the second load everything is ready.
if (self.crossOriginIsolated) {
  initMagick()
    .then(() => preloadModels())
    .catch(err => console.error('[main] initMagick failed:', err))
    .finally(renderApp);
} else {
  // SW not active yet — render immediately, SW will reload the page.
  // Still start preloading models in background (doesn't need crossOriginIsolated).
  console.log('[main] crossOriginIsolated=false, skipping initMagick until SW reload');
  renderApp();
}
