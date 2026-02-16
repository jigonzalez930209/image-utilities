// scripts/check-vips-formats.mjs
import fs from 'fs';
import Vips from 'wasm-vips';

const checkVips = async () => {
  try {
    const vips = await Vips();
    console.log('Vips Version:', vips.version());
    
    // Create a simple test image
    const im = vips.Image.black(100, 100);
    
    const formatsToCheck = [
      'png', 'jpg', 'webp', 'tiff', 'gif', 'avif', 'heic', 
      'jxl', 'svg', 'pdf', 'ico', 'bmp', 'jp2', 'magick',
      'pptm', 'ppt', 'pptx', 'psd', 'xcf' 
    ];

    console.log('\nChecking Write Support:');
    for (const fmt of formatsToCheck) {
      try {
        // Try to save to buffer with suffix
        const suffix = '.' + fmt;
        im.writeToBuffer(suffix);
        console.log(`[SUCCESS] ${fmt}`);
      } catch (err) {
        console.log(`[FAILED] ${fmt}:`, err.message.split('\n')[0]);
      }
    }
  } catch (err) {
    console.error('Init failed:', err);
  }
};

checkVips();
