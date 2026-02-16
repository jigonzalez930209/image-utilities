// @vitest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCrop } from '../components/editor/useCrop';
import { describe, it, expect } from 'vitest';

describe('useCrop', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCrop({ width: 100, height: 100 }));
    expect(result.current.cropRect).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it('should compute media rect correctly when node is set', async () => {
    const { result } = renderHook(() => useCrop({ width: 800, height: 600 })); // 4:3 image
    
    // Mock a viewport div
    const mockDiv = document.createElement('div');
    Object.defineProperty(mockDiv, 'clientWidth', { value: 1000 });
    Object.defineProperty(mockDiv, 'clientHeight', { value: 1000 });
    
    // Trigger callback ref
    act(() => {
      // simulate the callback ref usage in Viewport
      result.current.cropViewportRef(mockDiv);
    });

    // Expect media rect to fit 800x600 into 1000x1000
    // Width should be 1000, Height should be 1000 / (4/3) = 750
    await waitFor(() => {
      const mediaRect = result.current.mediaRect;
      expect(mediaRect.width).toBe(1000);
      expect(mediaRect.height).toBe(750);
      expect(mediaRect.y).toBe((1000 - 750) / 2); // 125
    });
  });
});
