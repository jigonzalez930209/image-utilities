/**
 * Image Processor Facade
 * 
 * This module coordinates image processing tasks by delegating to specialized
 * sub-modules. It provides a high-level API for image conversion, 
 * background removal, and model management.
 */

export { initMagick } from './imageProcessor/magick';
export { preloadModels } from './imageProcessor/fastModels';
export { convertImage, previewBackgroundRemoval } from './imageProcessor/convert';
export { initVips, convertWithVips } from './imageProcessor/vips';

// Re-export shared types
export type { 
  ImageFormat, 
  ProcessOptions, 
  BackgroundModel,
  FastBackgroundModel,
  ProgressStage
} from './imageProcessor/types';

/**
 * Migration Note: The core logic has been moved to the ./imageProcessor directory
 * to comply with the 250-line file limit and improve maintainability.
 * 
 * Sub-modules:
 * - rmbgPipeline: Manages Transformers.js (Ultra model)
 * - fastModels: Manages @imgly/background-removal (Express models)
 * - convert: Coordination and final output encoding
 * - normalize: Input format normalization (HEIC, SVG, ICO fallback)
 * - magick: ImageMagick initialization
 */
