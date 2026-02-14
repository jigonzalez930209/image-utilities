import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initMagick } from './lib/imageProcessor'

// Initialize Magick-WASM before rendering
initMagick().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch(err => {
  console.error('Failed to initialize ImageMagick:', err);
  // Still render, but maybe with a warning
  createRoot(document.getElementById('root')!).render(<App />);
});
