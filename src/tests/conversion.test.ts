import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertImage } from '../lib/imageProcessor/convert';
import { OUTPUT_FORMATS } from '../lib/formats';
import { ImageMagick } from '@imagemagick/magick-wasm';

// Mock dependencies
vi.mock('@imagemagick/magick-wasm', () => ({
  ImageMagick: {
    read: vi.fn(),
  },
  MagickFormat: {
    Svg: 'SVG',
    Png: 'PNG',
    Ico: 'ICO',
  },
  initializeImageMagick: vi.fn(),
}));

vi.mock('../lib/imageProcessor/normalize', () => ({
  normalizeToPNG: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}));

vi.mock('../lib/imageProcessor/vips', () => ({
  initVips: vi.fn().mockResolvedValue(undefined),
  convertWithVips: vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
}));

vi.mock('../lib/imageProcessor/fastModels', () => ({
  runFastModelBackgroundRemoval: vi.fn(),
  isCorsOrFetchError: vi.fn(),
}));

describe('convertImage', () => {
  const mockFile = new File([''], 'test.png', { type: 'image/png' });
  const mockId = 'test-id';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should default to PNG if format is invalid', async () => {
    // We expect the function to proceed but strictly speaking it logs a warning and uses PNG.
    // Since we can't easily check internal variables without deeper mocking, we check the result type if possible,
    // or checks mocks.
    
    const mockImage = {
      write: vi.fn((_fmt, cb) => cb(new Uint8Array([]))),
      resize: vi.fn(),
    };
    (ImageMagick.read as any).mockImplementation((_bytes:any, cb:any) => cb(mockImage));
    
    await convertImage(mockFile, { format: 'INVALID_FORMAT' as any }, mockId);
    
    // Should have written as PNG (implicit default in mock if not forced, but logically it falls back)
    // The "format" arg passed to write should be 'PNG' (or whatever the fallback logic resolved to)
    // Actually, our code sets formatStr = 'PNG' inside.
    // The mockImage.write first arg should be verified.
    expect(mockImage.write).toHaveBeenCalledWith(expect.stringMatching(/PNG/i), expect.any(Function));
  });

  it('should accept all valid OUTPUT_FORMATS', async () => {
    for (const fmt of OUTPUT_FORMATS) {
       const mockImage = {
        write: vi.fn((_f, cb) => cb(new Uint8Array([]))),
        resize: vi.fn(),
      };
      (ImageMagick.read as any).mockImplementation((_bytes:any, cb:any) => cb(mockImage));
      
      await convertImage(mockFile, { format: fmt }, mockId);
      
      // Should not throw
      expect(mockImage.write).toHaveBeenCalled();
    }
  });

  it('should resize ICO images if larger than 256x256', async () => {
     const mockImage = {
        write: vi.fn((_f, cb) => cb(new Uint8Array([]))),
        resize: vi.fn(),
        width: 500,
        height: 500,
      };
      (ImageMagick.read as any).mockImplementation((_bytes:any, cb:any) => cb(mockImage));
      
      await convertImage(mockFile, { format: 'ICO' }, mockId);
      
      expect(mockImage.resize).toHaveBeenCalledWith(256, 256);
  });

  it('should NOT resize ICO images if smaller than 256x256', async () => {
     const mockImage = {
        write: vi.fn((_f, cb) => cb(new Uint8Array([]))),
        resize: vi.fn(),
        width: 100,
        height: 100,
      };
      (ImageMagick.read as any).mockImplementation((_bytes:any, cb:any) => cb(mockImage));
      
      await convertImage(mockFile, { format: 'ICO' }, mockId);
      
      expect(mockImage.resize).not.toHaveBeenCalled();
  });
});
