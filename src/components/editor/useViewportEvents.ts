import React, { useState, useEffect, useRef } from 'react';
import type { Layer } from './types';
import type { CropHandle } from './useCrop';

interface ViewportEventsProps {
  layers: Layer[];
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  mediaRect: { x: number; y: number; width: number; height: number };
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onSelectLayer?: (id: string | null) => void;
  onManipulationEnd?: () => void;
  totalRotation: number;
  imageNaturalSize: { width: number; height: number };
}

export const useViewportEvents = ({
  layers, zoom, setZoom, pan, setPan, mediaRect, onUpdateLayer, onSelectLayer, onManipulationEnd: handleManipulationEnd, totalRotation, imageNaturalSize
}: ViewportEventsProps) => {
  const internalRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<{
    id: string; startX: number; startY: number; initialLayerX: number; initialLayerY: number;
  } | null>(null);

  const [resizeState, setResizeState] = useState<{
    id: string; handle: CropHandle; startX: number; startY: number;
    initialRect: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const spacePressed = useRef(false);

  useEffect(() => {
    if (!dragState && !resizeState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const isPortrait = Math.abs(totalRotation % 180) === 90;
      const visualWidth = isPortrait ? (imageNaturalSize.height || 1) : (imageNaturalSize.width || 1);
      const canvasScale = mediaRect.width / visualWidth;
      const zoomedScale = canvasScale * zoom;

      // 1. Un-project zoom
      const screenDx = (e.clientX - (dragState?.startX || resizeState?.startX || 0)) / zoomedScale;
      const screenDy = (e.clientY - (dragState?.startY || resizeState?.startY || 0)) / zoomedScale;

      // Calculate container vector for Dragging (Panning layer)
      // Container only needs Total Rotation un-applied
      const containerMatrix = new DOMMatrix();
      containerMatrix.rotateSelf(-(totalRotation || 0));
      const cPt = containerMatrix.transformPoint({ x: screenDx, y: screenDy });
      const containerDx = cPt.x;
      const containerDy = cPt.y;
      
        if (isPanning) return;

        if (dragState) {
          onUpdateLayer(dragState.id, { x: dragState.initialLayerX + containerDx, y: dragState.initialLayerY + containerDy });
        }

        if (resizeState) {
          const { x: initialX, y: initialY, width: initialW, height: initialH } = resizeState.initialRect;
          const { handle } = resizeState;

          // Get current layer rotation
          const layer = layers.find(l => l.id === resizeState.id);
          const layerRot = (layer?.rotation || 0) * (Math.PI / 180);

          // Transform container deltas (Rotation-aware) to layer-local coordinates for proper resizing
          let localDx = containerDx;
          let localDy = containerDy;

          if (Math.abs(layerRot) > 0.001) {
            const cosR = Math.cos(-layerRot);
            const sinR = Math.sin(-layerRot);
            localDx = containerDx * cosR - containerDy * sinR;
            localDy = containerDx * sinR + containerDy * cosR;
          }

          // Calculate new dimensions
          let deltaW = 0, deltaH = 0;

          switch (handle) {
            case 'e': deltaW = localDx; break;
            case 'w': deltaW = -localDx; break;
            case 's': deltaH = localDy; break;
            case 'n': deltaH = -localDy; break;
            case 'se': deltaW = localDx; deltaH = localDy; break;
            case 'sw': deltaW = -localDx; deltaH = localDy; break;
            case 'ne': deltaW = localDx; deltaH = -localDy; break;
            case 'nw': deltaW = -localDx; deltaH = -localDy; break;
          }

          // Lock aspect ratio for corner handles
          if (handle.length === 2) {
            const aspect = initialW / initialH;
            const absDeltaW = Math.abs(deltaW);
            const absDeltaH = Math.abs(deltaH);

            if (absDeltaW / initialW > absDeltaH / initialH) {
              const nextW = initialW + deltaW;
              const nextH = nextW / aspect;
              deltaH = nextH - initialH;
            } else {
              const nextH = initialH + deltaH;
              const nextW = nextH * aspect;
              deltaW = nextW - initialW;
            }
          }

          const nextWidth = Math.max(20, initialW + deltaW);
          const nextHeight = Math.max(20, initialH + deltaH);

          // Calculate center position adjustment to keep opposite edge stationary
          // The center must shift by half the delta in local space
          let centerDeltaX = 0, centerDeltaY = 0;

          if (handle.includes('e')) centerDeltaX += deltaW / 2;
          if (handle.includes('w')) centerDeltaX -= deltaW / 2;
          if (handle.includes('s')) centerDeltaY += deltaH / 2;
          if (handle.includes('n')) centerDeltaY -= deltaH / 2;

          // Apply rotation to the center delta to map back to container space
          const cosR = Math.cos(layerRot);
          const sinR = Math.sin(layerRot);
          const worldCenterDeltaX = centerDeltaX * cosR - centerDeltaY * sinR;
          const worldCenterDeltaY = centerDeltaX * sinR + centerDeltaY * cosR;

          const nextX = initialX + worldCenterDeltaX;
          const nextY = initialY + worldCenterDeltaY;

          onUpdateLayer(resizeState.id, {
            x: nextX, y: nextY,
            width: nextWidth, height: nextHeight
          });
        }
        

    };

    const handlePointerUp = () => {
      if (dragState || resizeState) handleManipulationEnd?.();
      setDragState(null); setResizeState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, resizeState, layers, mediaRect.width, onUpdateLayer, handleManipulationEnd, zoom, isPanning, totalRotation, imageNaturalSize.width, imageNaturalSize.height]);

  useEffect(() => {
    const viewport = internalRef.current;
    if (!viewport) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(10, Math.max(0.1, prev * delta)));
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed.current) { spacePressed.current = true; viewport.style.setProperty('cursor', 'grab'); }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') { spacePressed.current = false; viewport.style.setProperty('cursor', ''); setIsPanning(false); }
    };
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);

    return () => {
      viewport.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setZoom]);

  const handleViewportPointerDown = (e: React.PointerEvent) => {
    if (spacePressed.current) {
      e.preventDefault(); setIsPanning(true);
      const startX = e.clientX; const startY = e.clientY;
      const initialPan = { ...pan };
      const onMove = (moveEvent: PointerEvent) => {
        setPan({ x: initialPan.x + (moveEvent.clientX - startX), y: initialPan.y + (moveEvent.clientY - startY) });
      };
      const onUp = () => { setIsPanning(false); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
      window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    }
  };

  const startLayerDrag = (e: React.PointerEvent, layer: Layer) => {
    if (layer.locked || spacePressed.current) return;
    onSelectLayer?.(layer.id);
    setDragState({ id: layer.id, startX: e.clientX, startY: e.clientY, initialLayerX: layer.x || 0, initialLayerY: layer.y || 0 });
  };

  const startResizeDrag = (e: React.PointerEvent, layer: Layer, handle: CropHandle) => {
    setResizeState({ id: layer.id, handle, startX: e.clientX, startY: e.clientY, initialRect: { x: layer.x || 0, y: layer.y || 0, width: layer.width || 0, height: layer.height || 0 } });
  };

  return { internalRef, dragState, resizeState, isPanning, handleViewportPointerDown, startLayerDrag, startResizeDrag };
};
