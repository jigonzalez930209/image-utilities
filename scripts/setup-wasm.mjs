import { cpSync, copyFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const WASM_TARGET = join(ROOT, 'public', 'assets', 'wasm');
const ORT_WASM_TARGET = join(ROOT, 'public', 'assets', 'models', 'wasm');

// Source paths in node_modules
const VIPS_WASM_SRC = join(ROOT, 'node_modules', 'wasm-vips', 'lib');
const MAGICK_WASM_SRC = join(ROOT, 'node_modules', '@imagemagick', 'magick-wasm', 'dist');

// ORT WASM threaded files — required for ONNX Runtime multithreading (SharedArrayBuffer).
// These are served from /assets/models/wasm/ and referenced via ort.env.wasm.wasmPaths.
// The files are NOT committed to git (public/assets/models/ is gitignored) so they must
// be copied from node_modules during setup/CI before the build step.
const ORT_WASM_FILES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
];

function findOrtWasmSrc() {
  // pnpm stores packages under node_modules/.pnpm/<name>@<version>/node_modules/<name>/dist
  // Try the pinned dev version first, then other installed versions as fallback.
  const candidates = [
    join(ROOT, 'node_modules', '.pnpm', 'onnxruntime-web@1.21.0-dev.20250206-d981b153d3', 'node_modules', 'onnxruntime-web', 'dist'),
    join(ROOT, 'node_modules', '.pnpm', 'onnxruntime-web@1.21.0', 'node_modules', 'onnxruntime-web', 'dist'),
    join(ROOT, 'node_modules', 'onnxruntime-web', 'dist'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function setup() {
  console.log('--- Setting up WASM assets for Image Studio ---');
  
  if (!existsSync(WASM_TARGET)) {
    mkdirSync(WASM_TARGET, { recursive: true });
  }
  if (!existsSync(ORT_WASM_TARGET)) {
    mkdirSync(ORT_WASM_TARGET, { recursive: true });
  }

  // Copy Vips assets
  if (existsSync(VIPS_WASM_SRC)) {
    console.log('Copying Vips assets from', VIPS_WASM_SRC);
    cpSync(VIPS_WASM_SRC, WASM_TARGET, { 
      recursive: true, 
      filter: (src) => {
        if (statSync(src).isDirectory()) return true;
        return src.endsWith('.wasm') || src.endsWith('.js');
      }
    });
  }

  // Copy Magick assets
  if (existsSync(MAGICK_WASM_SRC)) {
    console.log('Copying Magick assets from', MAGICK_WASM_SRC);
    cpSync(MAGICK_WASM_SRC, WASM_TARGET, { 
      recursive: true,
      filter: (src) => {
        if (statSync(src).isDirectory()) return true;
        return src.endsWith('magick.wasm');
      }
    });
  }

  // Copy ORT WASM threaded files (required for ONNX Runtime multithreading on Android Chrome)
  const ortSrc = findOrtWasmSrc();
  if (ortSrc) {
    console.log('Copying ORT WASM threaded files from', ortSrc);
    for (const file of ORT_WASM_FILES) {
      const src = join(ortSrc, file);
      const dest = join(ORT_WASM_TARGET, file);
      if (existsSync(src)) {
        copyFileSync(src, dest);
        console.log('  Copied:', file);
      } else {
        console.warn('  WARNING: ORT WASM file not found:', src);
      }
    }
  } else {
    console.warn('WARNING: onnxruntime-web dist not found — ORT WASM threaded files not copied.');
    console.warn('  Multithreading will not work in production. Run: pnpm install');
  }

  console.log('WASM assets ready in:', WASM_TARGET);
  console.log('ORT WASM assets ready in:', ORT_WASM_TARGET);
}

try {
  setup();
} catch (err) {
  console.error('Failed to setup WASM assets:', err);
  process.exit(1);
}
