import React, { useState, useCallback, useEffect, useMemo } from 'react';

export type AspectPreset = 'free' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3';
export type CropHandle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropDragState {
  handle: CropHandle;
  startX: number;
  startY: number;
  startRect: CropRect;
}

const MIN_CROP_SIZE = 0.04;
export const ASPECT_OPTIONS: Array<{ id: AspectPreset; label: string; ratio: number | null }> = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '3:4', label: '3:4', ratio: 3 / 4 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '3:2', label: '3:2', ratio: 3 / 2 },
  { id: '2:3', label: '2:3', ratio: 2 / 3 },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const readViewportSize = (viewport: HTMLDivElement) => {
  const rect = viewport.getBoundingClientRect();
  const width = rect.width || viewport.clientWidth || viewport.offsetWidth;
  const height = rect.height || viewport.clientHeight || viewport.offsetHeight;
  return { width, height };
};

const fitMaxRectToAspect = (ratio: number): CropRect => {
  if (ratio >= 1) {
    return { x: 0, y: (1 - 1 / ratio) / 2, width: 1, height: 1 / ratio };
  }
  return { x: (1 - ratio) / 2, y: 0, width: ratio, height: 1 };
};

export const useCrop = (imageNaturalSize: { width: number; height: number }, rotation: number = 0) => {
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 1, height: 1 });
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>('free');
  const [mediaRect, setMediaRect] = useState({ x: 0, y: 0, width: 1, height: 1 });
  const [dragState, setDragState] = useState<CropDragState | null>(null);
  
  // Use callback ref to detect when the element is mounted
  const [cropViewportNode, setCropViewportNode] = useState<HTMLDivElement | null>(null);
  const cropViewportRef = useCallback((node: HTMLDivElement | null) => {
    setCropViewportNode(node);
  }, []);

  const aspectRatio = useMemo(
    () => ASPECT_OPTIONS.find((option) => option.id === aspectPreset)?.ratio ?? null,
    [aspectPreset]
  );

  const computeMediaRect = useCallback(() => {
    const viewport = cropViewportNode;
    if (!viewport) return false;

    if (imageNaturalSize.width <= 0 || imageNaturalSize.height <= 0) {
      return false;
    }

    const { width: viewportWidth, height: viewportHeight } = readViewportSize(viewport);

    if (viewportWidth <= 0 || viewportHeight <= 0) {
      return false;
    }

    const isPortrait = Math.abs(rotation % 180) === 90;
    const visualWidth = isPortrait ? imageNaturalSize.height : imageNaturalSize.width;
    const visualHeight = isPortrait ? imageNaturalSize.width : imageNaturalSize.height;
    
    const imageRatio = visualWidth / visualHeight;
    
    // Default to aspect ratio 1 if invalid
    const validImageRatio = (!Number.isFinite(imageRatio) || imageRatio <= 0) ? 1 : imageRatio;

    const viewportRatio = viewportWidth / viewportHeight;
    if (validImageRatio > viewportRatio) {
      const width = viewportWidth;
      const height = width / validImageRatio;
      setMediaRect({ x: 0, y: (viewportHeight - height) / 2, width, height });
    } else {
      const height = viewportHeight;
      const width = height * validImageRatio;
      setMediaRect({ x: (viewportWidth - width) / 2, y: 0, width, height });
    }
    return true;
  }, [imageNaturalSize, cropViewportNode, rotation]);

  useEffect(() => {
    const viewport = cropViewportNode;
    if (!viewport) return;

    let isMounted = true;
    let retryCount = 0;
    let rafId: number | null = null;
    let observer: ResizeObserver | null = null;
    const MAX_RETRIES = 30;

    const tryCompute = () => {
      if (!isMounted) return;

      const computed = computeMediaRect();
      if (!computed && retryCount < MAX_RETRIES) {
        retryCount += 1;
        rafId = requestAnimationFrame(tryCompute);
      }
    };

    rafId = requestAnimationFrame(tryCompute);

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        computeMediaRect();
      });
      observer.observe(viewport);
    }

    const handleWindowResize = () => {
      computeMediaRect();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleWindowResize);
      observer?.disconnect();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [computeMediaRect, cropViewportNode, imageNaturalSize.height, imageNaturalSize.width, rotation]);

  const normalizeRect = useCallback((nextRect: CropRect, ratio: number | null): CropRect => {
    let { x, y, width, height } = nextRect;

    if (ratio) {
      const minHeight = MIN_CROP_SIZE;
      const minWidth = minHeight * ratio;

      if (height < minHeight) {
        height = minHeight;
        width = height * ratio;
      }

      if (width < minWidth) {
        width = minWidth;
        height = width / ratio;
      }
    } else {
      width = Math.max(width, MIN_CROP_SIZE);
      height = Math.max(height, MIN_CROP_SIZE);
    }

    width = Math.min(width, 1);
    height = Math.min(height, 1);
    x = clamp(x, 0, 1 - width);
    y = clamp(y, 0, 1 - height);

    if (ratio) {
      const maxWidth = 1 - x;
      const maxHeight = 1 - y;

      let fittedWidth = Math.min(width, maxWidth, maxHeight * ratio);
      let fittedHeight = fittedWidth / ratio;

      if (fittedHeight > maxHeight) {
        fittedHeight = maxHeight;
        fittedWidth = fittedHeight * ratio;
      }

      width = fittedWidth;
      height = fittedHeight;
      x = clamp(x, 0, 1 - width);
      y = clamp(y, 0, 1 - height);
    }

    return { x, y, width, height };
  }, []);

  const resizeCropRect = useCallback((startRect: CropRect, handle: CropHandle, deltaX: number, deltaY: number): CropRect => {
    const ratio = aspectRatio;
    const centerX = startRect.x + startRect.width / 2;
    const centerY = startRect.y + startRect.height / 2;

    if (handle === 'move') {
      return normalizeRect(
        {
          ...startRect,
          x: startRect.x + deltaX,
          y: startRect.y + deltaY,
        },
        ratio
      );
    }

    let nextRect: CropRect = { ...startRect };

    if (!ratio) {
      switch (handle) {
        case 'se':
          nextRect = { ...nextRect, width: startRect.width + deltaX, height: startRect.height + deltaY };
          break;
        case 'sw':
          nextRect = { x: startRect.x + deltaX, y: startRect.y, width: startRect.width - deltaX, height: startRect.height + deltaY };
          break;
        case 'ne':
          nextRect = { x: startRect.x, y: startRect.y + deltaY, width: startRect.width + deltaX, height: startRect.height - deltaY };
          break;
        case 'nw':
          nextRect = { x: startRect.x + deltaX, y: startRect.y + deltaY, width: startRect.width - deltaX, height: startRect.height - deltaY };
          break;
        case 'e':
          nextRect = { ...nextRect, width: startRect.width + deltaX };
          break;
        case 'w':
          nextRect = { ...nextRect, x: startRect.x + deltaX, width: startRect.width - deltaX };
          break;
        case 'n':
          nextRect = { ...nextRect, y: startRect.y + deltaY, height: startRect.height - deltaY };
          break;
        case 's':
          nextRect = { ...nextRect, height: startRect.height + deltaY };
          break;
      }

      return normalizeRect(nextRect, null);
    }

    const minHeight = MIN_CROP_SIZE;
    const minWidth = minHeight * ratio;

    switch (handle) {
      case 'se': {
        const rawWidth = Math.max(minWidth, startRect.width + deltaX);
        const rawHeight = Math.max(minHeight, startRect.height + deltaY);
        const width = rawWidth / rawHeight > ratio ? rawWidth : rawHeight * ratio;
        const height = width / ratio;
        nextRect = { x: startRect.x, y: startRect.y, width, height };
        break;
      }
      case 'sw': {
        const rawWidth = Math.max(minWidth, startRect.width - deltaX);
        const rawHeight = Math.max(minHeight, startRect.height + deltaY);
        const width = rawWidth / rawHeight > ratio ? rawWidth : rawHeight * ratio;
        const height = width / ratio;
        nextRect = { x: startRect.x + startRect.width - width, y: startRect.y, width, height };
        break;
      }
      case 'ne': {
        const rawWidth = Math.max(minWidth, startRect.width + deltaX);
        const rawHeight = Math.max(minHeight, startRect.height - deltaY);
        const width = rawWidth / rawHeight > ratio ? rawWidth : rawHeight * ratio;
        const height = width / ratio;
        nextRect = { x: startRect.x, y: startRect.y + startRect.height - height, width, height };
        break;
      }
      case 'nw': {
        const rawWidth = Math.max(minWidth, startRect.width - deltaX);
        const rawHeight = Math.max(minHeight, startRect.height - deltaY);
        const width = rawWidth / rawHeight > ratio ? rawWidth : rawHeight * ratio;
        const height = width / ratio;
        nextRect = { x: startRect.x + startRect.width - width, y: startRect.y + startRect.height - height, width, height };
        break;
      }
      case 'e': {
        const width = Math.max(minWidth, startRect.width + deltaX);
        const height = width / ratio;
        nextRect = { x: startRect.x, y: centerY - height / 2, width, height };
        break;
      }
      case 'w': {
        const width = Math.max(minWidth, startRect.width - deltaX);
        const height = width / ratio;
        nextRect = { x: startRect.x + startRect.width - width, y: centerY - height / 2, width, height };
        break;
      }
      case 's': {
        const height = Math.max(minHeight, startRect.height + deltaY);
        const width = height * ratio;
        nextRect = { x: centerX - width / 2, y: startRect.y, width, height };
        break;
      }
      case 'n': {
        const height = Math.max(minHeight, startRect.height - deltaY);
        const width = height * ratio;
        nextRect = { x: centerX - width / 2, y: startRect.y + startRect.height - height, width, height };
        break;
      }
      default:
        break;
    }

    return normalizeRect(nextRect, ratio);
  }, [aspectRatio, normalizeRect]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (mediaRect.width <= 0 || mediaRect.height <= 0) return;

      const deltaX = (event.clientX - dragState.startX) / mediaRect.width;
      const deltaY = (event.clientY - dragState.startY) / mediaRect.height;
      setCropRect(resizeCropRect(dragState.startRect, dragState.handle, deltaX, deltaY));
    };

    const handlePointerUp = () => setDragState(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, mediaRect.height, mediaRect.width, resizeCropRect]);

  const startCropDrag = useCallback(
    (event: React.PointerEvent, handle: CropHandle) => {
      event.preventDefault();
      event.stopPropagation();
      setDragState({
        handle,
        startX: event.clientX,
        startY: event.clientY,
        startRect: cropRect,
      });
    },
    [cropRect]
  );

  const applyAspectPreset = useCallback((preset: AspectPreset) => {
    setAspectPreset(preset);

    const option = ASPECT_OPTIONS.find((item) => item.id === preset);
    if (!option?.ratio) return;

    setCropRect(fitMaxRectToAspect(option.ratio));
  }, []);

  const getPixelCrop = useCallback((): { x: number; y: number; width: number; height: number } | null => {
    if (!imageNaturalSize.width || !imageNaturalSize.height) return null;

    return {
      x: Math.round(cropRect.x * imageNaturalSize.width),
      y: Math.round(cropRect.y * imageNaturalSize.height),
      width: Math.max(1, Math.round(cropRect.width * imageNaturalSize.width)),
      height: Math.max(1, Math.round(cropRect.height * imageNaturalSize.height)),
    };
  }, [cropRect.height, cropRect.width, cropRect.x, cropRect.y, imageNaturalSize.height, imageNaturalSize.width]);

  const resetCrop = () => {
    setCropRect({ x: 0, y: 0, width: 1, height: 1 });
    setAspectPreset('free');
  };

  return {
    cropRect,
    aspectPreset,
    mediaRect,
    cropViewportRef,
    startCropDrag,
    applyAspectPreset,
    getPixelCrop,
    resetCrop,
    ASPECT_OPTIONS,
    computeMediaRect,
  };
};
