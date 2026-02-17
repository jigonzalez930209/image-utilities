import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages se sirve en https://<user>.github.io/<repo>/ → base debe ser '/<repo>/'
const base = process.env.VITE_BASE_PATH ?? '/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'wasm-static-fix',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url && req.url.includes('/assets/models/wasm/') && req.url.includes('import')) {
            const cleanUrl = req.url.split('?')[0];
            console.log('[WasmFix] Redirecting:', req.url, '->', cleanUrl);
            req.url = cleanUrl;
          }
          next();
        });
      }
    }
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    fs: {
      allow: ['..'],
    },
  },
  optimizeDeps: {
    exclude: ['@imgly/background-removal', '@huggingface/transformers'],
  },
})
