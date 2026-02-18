import { cpSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const WASM_TARGET = join(ROOT, 'public', 'assets', 'wasm');

// Source paths in node_modules
const VIPS_WASM_SRC = join(ROOT, 'node_modules', 'wasm-vips', 'lib');
const MAGICK_WASM_SRC = join(ROOT, 'node_modules', '@imagemagick', 'magick-wasm', 'dist');

function setup() {
  console.log('--- Setting up WASM assets for Image Studio ---');
  
  if (!existsSync(WASM_TARGET)) {
    mkdirSync(WASM_TARGET, { recursive: true });
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

  console.log('WASM assets ready in:', WASM_TARGET);
}

try {
  setup();
} catch (err) {
  console.error('Failed to setup WASM assets:', err);
  process.exit(1);
}
