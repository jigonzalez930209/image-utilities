#!/usr/bin/env node
/**
 * Downloads @imgly/background-removal-data assets and extracts them to public/assets/background-removal/
 * so the app can serve all 4 models (Express, Medium, Pro) without CORS.
 *
 * Run once: pnpm run download:bg
 * Requires: curl, tar (standard on Linux/macOS)
 */

import { createWriteStream, mkdirSync, existsSync, cpSync, rmSync } from 'fs';
import { get as httpsGet } from 'https';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const DATA_VERSION = '1.7.0'; // must match @imgly/background-removal version
const CDN_URL = `https://staticimgly.com/@imgly/background-removal-data/${DATA_VERSION}/package.tgz`;
const OUT_DIR = join(ROOT, 'public', 'assets', 'background-removal');

function download(url) {
  return new Promise((resolve, reject) => {
    const tmpFile = join(tmpdir(), `background-removal-data-${DATA_VERSION}.tgz`);
    console.log('Downloading', url, '...');
    const file = createWriteStream(tmpFile);
    httpsGet(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(tmpFile);
      });
    }).on('error', (err) => {
      rmSync(tmpFile, { force: true });
      reject(err);
    });
  });
}

function extractAndCopy(tgzPath) {
  const tmpExtract = join(tmpdir(), `background-removal-extract-${Date.now()}`);
  mkdirSync(tmpExtract, { recursive: true });
  try {
    execSync(`tar -xzf "${tgzPath}" -C "${tmpExtract}"`, { stdio: 'inherit' });
    const distSrc = join(tmpExtract, 'package', 'dist');
    if (!existsSync(distSrc)) {
      throw new Error(`Expected package/dist not found in ${tmpExtract}`);
    }
    mkdirSync(OUT_DIR, { recursive: true });
    cpSync(distSrc, OUT_DIR, { recursive: true });
    console.log('Copied to', OUT_DIR);
  } finally {
    rmSync(tmpExtract, { recursive: true, force: true });
    rmSync(tgzPath, { force: true });
  }
}

async function main() {
  console.log('@imgly/background-removal-data → public/assets/background-removal/');
  const tgzPath = await download(CDN_URL);
  extractAndCopy(tgzPath);
  console.log('Done. Start the app with pnpm dev; models will load from /assets/background-removal/');
}

main().catch((err) => {
  console.error(err);
  console.warn('Background-removal download failed - models will load from CDN');
  process.exit(0); // Don't fail the build
});
