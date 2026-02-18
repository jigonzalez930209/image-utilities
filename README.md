# Image Studio

> Ultra-fast image conversion and professional editing powered by AI — entirely in your browser. Full privacy guaranteed.

[![Deploy to GitHub Pages](https://github.com/jigonzalez930209/image-utilities/actions/workflows/deploy.yml/badge.svg)](https://github.com/jigonzalez930209/image-utilities/actions/workflows/deploy.yml)

🔗 **Live:** [jigonzalez930209.github.io/image-utilities](https://jigonzalez930209.github.io/image-utilities/)

---

## Features

- **Batch Converter** — Convert multiple images at once to PNG, JPG, WEBP, ICO, HEIC, and more
- **AI Background Removal** — Three quality tiers (Express / Medium / Pro) powered by ONNX models running locally
- **Pro Editor** — Crop, rotate, adjust colors, apply filters, add layers, and magic erase
- **Privacy First** — All processing happens in your browser. No uploads, no servers
- **WASM Powered** — ImageMagick WASM + wasm-vips for broad format support
- **Metadata Stripping** — Remove EXIF/GPS data for privacy

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React + TypeScript + Tailwind CSS |
| Image Processing | ImageMagick WASM, wasm-vips |
| AI Inference | ONNX Runtime Web (WebAssembly + WebGPU) |
| Background Removal | `@imgly/background-removal`, RMBG-1.4 |
| Build | Vite |
| Deploy | GitHub Pages (static) |

## GitHub Pages Deployment

The app is fully static and deploys automatically on every push to `main`.

1. In your repo: **Settings → Pages → Source: GitHub Actions**
2. Each push triggers the **Deploy to GitHub Pages** workflow:
   - Installs dependencies
   - Downloads AI models (~280 MB) to `public/` via `pnpm run download:bg`
   - Builds with `pnpm run build`
   - Deploys `dist/` to GitHub Pages

> **Note:** AI models are not committed to the repo (`.gitignore`). They are downloaded fresh on each CI build.

### Cross-Origin Isolation (SharedArrayBuffer)

GitHub Pages does not serve `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers natively. This app uses a **Service Worker** (`public/coop-coep.js`) to inject these headers at runtime, enabling `SharedArrayBuffer` for multi-threaded WASM.

The COEP policy used is `credentialless` (more permissive than `require-corp`) to ensure compatibility with mobile browsers and cross-origin resources like Google Fonts.

## Local Development

AI models (Express, Medium, Pro) are served from `public/assets/background-removal/`. Download them once:

```bash
pnpm run download:bg
pnpm dev
```

The **Ultra** model (RMBG-1.4) is loaded on demand from Hugging Face.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server with COOP/COEP headers |
| `pnpm build` | Production build |
| `pnpm run download:bg` | Download AI background removal models |

## License

MIT
