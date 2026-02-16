/**
 * Telea Inpainting Algorithm Implementation
 * Based on "An Image Inpainting Technique Based on the Fast Marching Method" by Alexandru Telea.
 * 
 * This implementation works directly on Canvas ImageData.
 */

export interface InpaintOptions {
  radius?: number;
}

export const inpaintTelea = (
  imageData: ImageData,
  maskData: Uint8ClampedArray, // Alpha channel of the mask: 0 = keep, >0 = erase
  options: InpaintOptions = {}
): ImageData => {
  const { width, height } = imageData;
  const pixels = imageData.data;
  const radius = options.radius || 3;
  
  // Clone pixels to modify
  const result = new Uint8ClampedArray(pixels);
  
  // 1. Initialize states: 
  // 0: KNOWN (outside mask), 1: BAND (boundary), 2: UNKNOWN (inside mask)
  const state = new Uint8Array(width * height);
  const dist = new Float32Array(width * height).fill(Infinity);
  
  // Initialize Band and Unknown
  const band: number[] = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (maskData[idx * 4 + 3] > 0) { // Mask pixel (partially or fully opaque)
        state[idx] = 2; // UNKNOWN
      } else {
        state[idx] = 0; // KNOWN
        dist[idx] = 0;
        
        // Check neighbors to see if this is a boundary pixel
        let isBoundary = false;
        if (x > 0 && maskData[(idx - 1) * 4 + 3] > 0) isBoundary = true;
        else if (x < width - 1 && maskData[(idx + 1) * 4 + 3] > 0) isBoundary = true;
        else if (y > 0 && maskData[(idx - width) * 4 + 3] > 0) isBoundary = true;
        else if (y < height - 1 && maskData[(idx + width) * 4 + 3] > 0) isBoundary = true;
        
        if (isBoundary) {
          state[idx] = 1; // BAND
          band.push(idx);
        }
      }
    }
  }

  // 2. Fast Marching Method loop
  // (Simplified for pure JS performance - using a simple priority queue or just a sorted list)
  // For true Telea we need a priority queue by distance.
  
  while (band.length > 0) {
    // Sort band by distance (Smallest distance first)
    // Optimization: true priority queue is better, but for medium masks this is fine.
    band.sort((a, b) => dist[a] - dist[b]);
    const i = band.shift()!;
    state[i] = 0; // Set to KNOWN
    
    const x = i % width;
    const y = Math.floor(i / width);
    
    // Check 4 neighbors
    const neighbors = [
      [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
    ];
    
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const ni = ny * width + nx;
        if (state[ni] !== 0) {
          if (state[ni] === 2) {
            state[ni] = 1; // Change UNKNOWN to BAND
            // Calculate pixel value for the new BAND pixel
            inpaintPixel(ni, nx, ny, width, height, result, state, dist, radius);
            band.push(ni);
          }
          // Update distance (rough Eikonal equation solver)
          updateDistance(ni, nx, ny, width, height, state, dist);
        }
      }
    }
  }

  return new ImageData(result, width, height);
};

function inpaintPixel(
  i: number, x: number, y: number, 
  w: number, h: number, 
  pixels: Uint8ClampedArray, 
  state: Uint8Array, 
  dist: Float32Array, 
  radius: number
) {
  let sumR = 0, sumG = 0, sumB = 0, sumW = 0;
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const ni = ny * w + nx;
        if (state[ni] === 0) { // Only use KNOWN pixels
          const distSq = dx * dx + dy * dy;
          if (distSq > radius * radius) continue;
          
          // Weight calculation (simplified Telea)
          // Based on distance to boundary and distance between pixels
          const weight = 1.0 / (distSq * Math.max(0.0001, dist[ni] * dist[ni]));
          
          sumR += pixels[ni * 4] * weight;
          sumG += pixels[ni * 4 + 1] * weight;
          sumB += pixels[ni * 4 + 2] * weight;
          sumW += weight;
        }
      }
    }
  }
  
  if (sumW > 0) {
    pixels[i * 4] = sumR / sumW;
    pixels[i * 4 + 1] = sumG / sumW;
    pixels[i * 4 + 2] = sumB / sumW;
  }
}

function updateDistance(i: number, x: number, y: number, w: number, h: number, state: Uint8Array, dist: Float32Array) {
  // Rough distance update (Manhattan approximation or simple step)
  const left = x > 0 && state[i - 1] === 0 ? dist[i - 1] : Infinity;
  const right = x < w - 1 && state[i + 1] === 0 ? dist[i + 1] : Infinity;
  const up = y > 0 && state[i - w] === 0 ? dist[i - w] : Infinity;
  const down = y < h - 1 && state[i + w] === 0 ? dist[i + w] : Infinity;
  
  const minH = Math.min(left, right);
  const minV = Math.min(up, down);
  
  if (minH !== Infinity && minV !== Infinity) {
    dist[i] = Math.min(minH, minV) + 1;
  } else if (minH !== Infinity) {
    dist[i] = minH + 1;
  } else if (minV !== Infinity) {
    dist[i] = minV + 1;
  }
}
