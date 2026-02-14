export const SUPPORTED_FORMATS = [
  '3FR', 'ARW', 'AVIF', 'BMP', 'CR2', 'CR3', 'CRW', 'DCR', 'DNG', 'EPS', 'ERF', 'GIF', 'HEIC', 'HEIF', 'ICNS', 'ICO', 'JFIF', 'JPEG', 'JPG', 'MOS', 'MRW', 'NEF', 'ODD', 'ODG', 'ORF', 'PEF', 'PNG', 'PPM', 'PS', 'PSB', 'PSD', 'PUB', 'RAF', 'RAW', 'RW2', 'SVG', 'TGA', 'TIF', 'TIFF', 'WEBP', 'X3F', 'XCF', 'XPS'
] as const;

export type ImageFormat = typeof SUPPORTED_FORMATS[number];

export const FORMAT_CATEGORIES = {
  'Standard': ['PNG', 'JPEG', 'JPG', 'WEBP', 'BMP', 'GIF', 'AVIF', 'ICO', 'TIFF', 'TIF', 'JFIF'],
  'Professional': ['PSD', 'PSB', 'XCF', 'EPS', 'PS', 'XPS', 'ICNS', 'TGA', 'PPM', 'SVG'],
  'RAW / Digital Photo': ['3FR', 'ARW', 'CR2', 'CR3', 'CRW', 'DCR', 'DNG', 'ERF', 'MOS', 'MRW', 'NEF', 'ORF', 'PEF', 'RAF', 'RAW', 'RW2', 'X3F'],
  'Others': ['HEIC', 'HEIF', 'ODD', 'ODG', 'PUB']
};
