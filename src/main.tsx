import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initMagick, preloadModels } from './lib/imageProcessor/index'

// Initialize Magick-WASM before rendering
initMagick().then(() => {
  preloadModels(); // Start pre-loading after Magick is ready
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}).catch(err => {
  console.error('Failed to initialize ImageMagick:', err);
  // Still render, but maybe with a warning
  createRoot(document.getElementById('root')!).render(<App />);
});
