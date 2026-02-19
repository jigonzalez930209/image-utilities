import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages se sirve en https://<user>.github.io/<repo>/ → base debe ser '/<repo>/'
const base = process.env.VITE_BASE_PATH ?? '/';

// Asset URLs - can be overridden via VITE_ASSETS_BASE for external CDNs
const assetsBase = process.env.VITE_ASSETS_BASE ?? '';

// https://vite.dev/config/
export default defineConfig({
  base,
  publicDir: 'public',
  define: {
    'import.meta.env.VITE_ASSETS_BASE': JSON.stringify(assetsBase),
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'coop-coep-dev-server',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Serve coop-coep.js with correct MIME type
          if (req.url === '/coop-coep.js') {
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Service-Worker-Allowed', '/');
          }
          next();
        });
      }
    },
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
    host: true, // Bind to all interfaces for local network access
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
    fs: {
      allow: ['..'],
    },
  },
  optimizeDeps: {
    exclude: ['@imgly/background-removal', '@huggingface/transformers'],
  },
})
