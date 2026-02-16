// Comprehensive list of formats we can read (via Browser, Magick, or Vips)
export const INPUT_FORMATS = [
  '3FR', 'ARW', 'AVIF', 'BMP', 'CR2', 'CR3', 'CRW', 'DCR', 'DNG', 'EPS', 'ERF', 'GIF', 'HEIC', 'HEIF', 'ICNS', 'ICO', 'JFIF', 'JPEG', 'JPG', 'MOS', 'MRW', 'NEF', 'ODD', 'ODG', 'ORF', 'PEF', 'PNG', 'PPM', 'PS', 'PSB', 'PSD', 'PUB', 'RAF', 'RAW', 'RW2', 'SVG', 'TGA', 'TIF', 'TIFF', 'WEBP', 'X3F', 'XCF', 'XPS'
] as const;

// Legacy alias for backward compatibility
export const SUPPORTED_FORMATS = INPUT_FORMATS;

export type ImageFormat = typeof INPUT_FORMATS[number];

// Formats we can reliably write to (via Browser, Magick, or Vips)
// Excludes RAW formats, complex document formats, and professional layers (XCF - unless flattened, but usually read-only in this context)
export const OUTPUT_FORMATS = [
  'PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'BMP', 'ICO', 'TIFF', 'TIF', 'SVG', 'AVIF', 'PDF'
] as const;

export type OutputFormat = typeof OUTPUT_FORMATS[number];

// Categories for input display / informational purposes
export const INPUT_CATEGORIES = {
  'Standard': ['PNG', 'JPEG', 'JPG', 'WEBP', 'BMP', 'GIF', 'AVIF', 'ICO', 'TIFF', 'TIF', 'JFIF'],
  'Professional': ['PSD', 'PSB', 'XCF', 'EPS', 'PS', 'XPS', 'ICNS', 'TGA', 'PPM', 'SVG', 'PDF'],
  'RAW / Digital Photo': ['3FR', 'ARW', 'CR2', 'CR3', 'CRW', 'DCR', 'DNG', 'ERF', 'MOS', 'MRW', 'NEF', 'ORF', 'PEF', 'RAF', 'RAW', 'RW2', 'X3F'],
  'Others': ['HEIC', 'HEIF', 'ODD', 'ODG', 'PUB']
};

// Legacy alias
export const FORMAT_CATEGORIES = INPUT_CATEGORIES;

// Categories strictly for the "Convert To" dropdown
export const OUTPUT_CATEGORIES = {
  'Standard': ['PNG', 'JPEG', 'JPG', 'WEBP', 'BMP', 'GIF', 'AVIF', 'ICO'],
  'Print / Pro': ['TIFF', 'TIF', 'SVG', 'PDF']
};
