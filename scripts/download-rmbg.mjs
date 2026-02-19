#!/usr/bin/env node
/**
 * Downloads Xenova/RMBG-1.4 model files from HuggingFace to
 * public/assets/models/Xenova/RMBG-1.4/ so the app can serve
 * the Pro background removal model without any external requests.
 *
 * Run once: node scripts/download-rmbg.mjs
 * Called automatically by CI before build.
 */

import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { get as httpsGet } from 'https';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'assets', 'models', 'Xenova', 'RMBG-1.4');

const HF_BASE = 'https://huggingface.co/briaai/RMBG-1.4/resolve/main';

// All files needed by transformers.js for RMBG-1.4
const FILES = [
  'config.json',
  'preprocessor_config.json',
  'onnx/model.onnx',
];

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    if (existsSync(destPath)) {
      console.log(`  ✓ Already exists: ${destPath}`);
      resolve();
      return;
    }
    console.log(`  ↓ Downloading: ${url}`);
    const file = createWriteStream(destPath);
    const req = httpsGet(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Follow redirect
        file.close();
        download(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total > 0) {
          const pct = ((downloaded / total) * 100).toFixed(0);
          process.stdout.write(`\r  ${pct}% (${(downloaded / 1e6).toFixed(1)} MB / ${(total / 1e6).toFixed(1)} MB)`);
        }
      });
      res.pipe(file);
      file.on('finish', () => {
        process.stdout.write('\n');
        file.close();
        resolve();
      });
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log('Downloading briaai/RMBG-1.4 → public/assets/models/Xenova/RMBG-1.4/');
  mkdirSync(join(OUT_DIR, 'onnx'), { recursive: true });

  let downloaded = 0;
  for (const file of FILES) {
    const url = `${HF_BASE}/${file}`;
    const dest = join(OUT_DIR, file);
    try {
      await download(url, dest);
      downloaded++;
    } catch (err) {
      console.warn(`  Skipping ${file}: ${err.message}`);
    }
  }

  if (downloaded === 0) {
    console.warn('WARNING: No RMBG files downloaded. Pro model will not be available.');
  } else {
    console.log(`Done. ${downloaded}/${FILES.length} RMBG-1.4 files ready.`);
  }
}

main().catch((err) => {
  console.error(err);
  console.warn('RMBG download failed - Pro model will not be available');
  process.exit(0); // Don't fail the build
});
