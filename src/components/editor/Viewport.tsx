import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../../utils';
import type { CropHandle } from './useCrop';
import type { Layer } from './types';
import { getFilterString } from './useFilters';

interface ViewportProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  activePanel: string;
  cropRect: { x: number; y: number; width: number; height: number };
  mediaRect: { x: number; y: number; width: number; height: number };
  cropViewportRef: (node: HTMLDivElement | null) => void;
  startCropDrag: (event: React.PointerEvent, handle: CropHandle) => void;
  totalRotation: number;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  // Eraser props
  brushSize: number;
  eraserMaskRef: React.RefObject<HTMLCanvasElement | null>;
  onManipulationEnd?: () => void;
}

export const Viewport: React.FC<ViewportProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  activePanel,
  cropRect,
  mediaRect,
  cropViewportRef,
  startCropDrag,
  totalRotation,
  zoom,
  setZoom,
  pan,
  setPan,
  brushSize,
  eraserMaskRef,
  onManipulationEnd,
}) => {
  const isPaintingRef = useRef(false);
  const internalRef = useRef<HTMLDivElement | null>(null);

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    internalRef.current = node;
    cropViewportRef(node);
  }, [cropViewportRef]);

  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    initialLayerX: number;
    initialLayerY: number;
  } | null>(null);

  const [resizeState, setResizeState] = useState<{
    id: string;
    handle: CropHandle;
    startX: number;
    startY: number;
    initialRect: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const spacePressed = React.useRef(false);

  useEffect(() => {
    if (!dragState && !resizeState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const baseLayer = layers.find(l => l.id === 'base-layer');
      const canvasScale = (baseLayer && baseLayer.width > 0) ? mediaRect.width / baseLayer.width : 1;

      // DELTAS must be scaled by zoom to maintain 1:1 mouse tracking
      const zoomedScale = canvasScale * zoom;

      if (isPanning) {
        // If we were implementation panning via state, but we'll use a specific panning logic 
        // to avoid conflicts with layer drag.
        return;
      }

      if (dragState) {
        const dx = (e.clientX - dragState.startX) / zoomedScale;
        const dy = (e.clientY - dragState.startY) / zoomedScale;

        onUpdateLayer(dragState.id, {
          x: dragState.initialLayerX + dx,
          y: dragState.initialLayerY + dy,
        });
      }

      if (resizeState) {
        const dx = (e.clientX - resizeState.startX) / zoomedScale;
        const dy = (e.clientY - resizeState.startY) / zoomedScale;
        
        const { x, y, width, height } = resizeState.initialRect;
        const { handle } = resizeState;

        let deltaW = 0;
        let deltaH = 0;

        if (handle.includes('e')) deltaW = dx;
        if (handle.includes('w')) deltaW = -dx;
        if (handle.includes('s')) deltaH = dy;
        if (handle.includes('n')) deltaH = -dy;

        const nextWidth = Math.max(20, width + deltaW);
        const nextHeight = Math.max(20, height + deltaH);
        
        const actualDeltaW = nextWidth - width;
        const actualDeltaH = nextHeight - height;

        let nextX = x;
        let nextY = y;

        if (handle.includes('e')) nextX += actualDeltaW / 2;
        if (handle.includes('w')) nextX -= actualDeltaW / 2;
        if (handle.includes('s')) nextY += actualDeltaH / 2;
        if (handle.includes('n')) nextY -= actualDeltaH / 2;

        onUpdateLayer(resizeState.id, { 
          x: nextX, 
          y: nextY, 
          width: nextWidth, 
          height: nextHeight 
        });
      }
    };

    const handlePointerUp = () => {
      if (dragState || resizeState) {
        onManipulationEnd?.();
      }
      setDragState(null);
      setResizeState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, resizeState, layers, mediaRect.width, onUpdateLayer, onManipulationEnd, zoom, isPanning]);

  // Handle Wheel Zoom and Spacebar Pan
  useEffect(() => {
    const viewport = internalRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(10, Math.max(0.1, prev * delta)));
      } else if (!spacePressed.current) {
        setPan(prev => ({
          x: prev.x - e.deltaX / zoom,
          y: prev.y - e.deltaY / zoom
        }));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed.current) {
        spacePressed.current = true;
        viewport.style.setProperty('cursor', 'grab');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressed.current = false;
        viewport.style.setProperty('cursor', '');
        setIsPanning(false);
      }
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      viewport.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setPan, setZoom, zoom]);
 // Removed zoom from dependency as we don't need it for unscaled panning

  // Eraser Mask Painting Logic
  const handleMaskPointerDown = (e: React.PointerEvent) => {
    if (activePanel !== 'eraser') return;
    isPaintingRef.current = true;
    handleMaskPaint(e);
  };

  const handleMaskPointerUp = () => {
    isPaintingRef.current = false;
  };

  const handleMaskPaint = (e: React.PointerEvent) => {
    if (!isPaintingRef.current || !eraserMaskRef.current || activePanel !== 'eraser') return;

    const canvas = eraserMaskRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Visual feedback mask
    ctx.beginPath();
    ctx.arc(x, y, brushSize / (2 * zoom), 0, Math.PI * 2);
    ctx.fill();
    
    // We also need a "pure" mask for AI processing (red channel = mask)
    // Actually the logic in ImageEditor uses the whole canvas alpha channel
  };

  // Pointer Down for Global Panning
  const handleViewportPointerDown = (e: React.PointerEvent) => {
    if (spacePressed.current) {
      e.preventDefault();
      setIsPanning(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const initialPan = { ...pan };

      const onMove = (moveEvent: PointerEvent) => {
        setPan({
          x: initialPan.x + (moveEvent.clientX - startX),
          y: initialPan.y + (moveEvent.clientY - startY)
        });
      };

      const onUp = () => {
        setIsPanning(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    }
  };

  const handleLayerPointerDown = (e: React.PointerEvent, layer: Layer) => {
    if (layer.locked) return;
    if (spacePressed.current) return; // Don't drag layers if panning
    e.stopPropagation();
    onSelectLayer(layer.id);
    
    setDragState({
      id: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      initialLayerX: layer.x || 0,
      initialLayerY: layer.y || 0,
    });
  };

  const handleResizePointerDown = (e: React.PointerEvent, layer: Layer, handle: CropHandle) => {
    e.stopPropagation();
    setResizeState({
      id: layer.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialRect: { x: layer.x || 0, y: layer.y || 0, width: layer.width || 0, height: layer.height || 0 },
    });
  };

  const baseLayer = layers.find(l => l.id === 'base-layer');
  const canvasScale = (baseLayer && baseLayer.width > 0) ? mediaRect.width / baseLayer.width : 1;

  return (
    <div 
      ref={cropViewportRef}
      onPointerDown={handleViewportPointerDown}
      className={cn(
        "h-full w-full min-h-0 bg-black/40 relative overflow-hidden flex items-center justify-center p-4 md:p-12 shadow-inner",
        isPanning && "cursor-grabbing"
      )}
    >
      <div className="w-full h-full min-h-0 relative rounded-3xl overflow-hidden glass border border-white/5 flex items-center justify-center">
        {activePanel === 'crop' ? (
          <div
            className="h-full w-full relative select-none touch-none overflow-hidden bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),rgba(15,23,42,0.4)_45%,rgba(2,6,23,0.85)_90%)]"
          >
            {/* Image and layers in crop mode should NOT be affected by main zoom/pan for now to avoid complexity, 
                as useCrop manages its own mediaRect framing. */}
            {layers.filter(l => l.visible).map(layer => {
              const baseLayer = layers.find(l => l.id === 'base-layer');
              const canvasScale = (baseLayer && baseLayer.width > 0) ? mediaRect.width / (Math.abs(totalRotation % 180) === 90 ? baseLayer.height : baseLayer.width) : 1;
              
              return layer.type === 'image' && (
                <img
                  key={layer.id}
                  src={layer.content}
                  alt={layer.name}
                  className="absolute pointer-events-none"
                  style={{
                    left: mediaRect.x + mediaRect.width / 2 + (layer.x * canvasScale),
                    top: mediaRect.y + mediaRect.height / 2 + (layer.y * canvasScale),
                    width: (layer.width || baseLayer?.width || 0) * canvasScale,
                    height: (layer.height || baseLayer?.height || 0) * canvasScale,
                    opacity: (layer.opacity ?? 100) / 100,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    zIndex: 1,
                    filter: layer.filters ? getFilterString(layer.filters) : 'none',
                    transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
                  }}
                />
              );
            })}

            {/* Overlays */}
            <div
              className="absolute bg-black/55 backdrop-blur-[1px] pointer-events-none"
              style={{ left: mediaRect.x, top: mediaRect.y, width: mediaRect.width, height: mediaRect.height * cropRect.y, zIndex: 10 }}
            />
            <div
              className="absolute bg-black/55 backdrop-blur-[1px] pointer-events-none"
              style={{
                left: mediaRect.x,
                top: mediaRect.y + mediaRect.height * (cropRect.y + cropRect.height),
                width: mediaRect.width,
                height: mediaRect.height * (1 - cropRect.y - cropRect.height),
                zIndex: 10
              }}
            />
            <div
              className="absolute bg-black/55 backdrop-blur-[1px] pointer-events-none"
              style={{
                left: mediaRect.x,
                top: mediaRect.y + mediaRect.height * cropRect.y,
                width: mediaRect.width * cropRect.x,
                height: mediaRect.height * cropRect.height,
                zIndex: 10
              }}
            />
            <div
              className="absolute bg-black/55 backdrop-blur-[1px] pointer-events-none"
              style={{
                left: mediaRect.x + mediaRect.width * (cropRect.x + cropRect.width),
                top: mediaRect.y + mediaRect.height * cropRect.y,
                width: mediaRect.width * (1 - cropRect.x - cropRect.width),
                height: mediaRect.height * cropRect.height,
                zIndex: 10
              }}
            />

            <div
              className="absolute border-2 border-brand/90 shadow-[0_0_0_1px_rgba(15,23,42,0.75)] cursor-move"
              style={{
                left: mediaRect.x + mediaRect.width * cropRect.x,
                top: mediaRect.y + mediaRect.height * cropRect.y,
                width: mediaRect.width * cropRect.width,
                height: mediaRect.height * cropRect.height,
                zIndex: 20
              }}
              onPointerDown={(event) => startCropDrag(event, 'move')}
            >
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className="border border-white/20" />
                ))}
              </div>

              {/* Resize Handles */}
              <div className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-sm bg-white border border-slate-900 cursor-nwse-resize" onPointerDown={(event) => startCropDrag(event, 'nw')} />
              <div className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-sm bg-white border border-slate-900 cursor-nesw-resize" onPointerDown={(event) => startCropDrag(event, 'ne')} />
              <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-sm bg-white border border-slate-900 cursor-nesw-resize" onPointerDown={(event) => startCropDrag(event, 'sw')} />
              <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-sm bg-white border border-slate-900 cursor-nwse-resize" onPointerDown={(event) => startCropDrag(event, 'se')} />
            </div>
          </div>
        ) : (
          <div 
            ref={setRefs}
            className="relative w-full h-full flex items-center justify-center p-4 md:p-8 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),rgba(15,23,42,0.4)_45%,rgba(2,6,23,0.85)_90%)] overflow-hidden"
          >
            <div
              className="relative flex-none will-change-transform"
              style={{
                width: mediaRect.width,
                height: mediaRect.height,
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px) rotate(${totalRotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
             {/* AI Eraser Mask Overlay */}
            <canvas
              ref={eraserMaskRef}
              width={mediaRect.width}
              height={mediaRect.height}
              className={cn(
                "absolute inset-0 z-40 transition-opacity duration-300",
                activePanel === 'eraser' ? "opacity-100 pointer-events-auto cursor-crosshair" : "opacity-0 pointer-events-none"
              )}
              onPointerDown={handleMaskPointerDown}
              onPointerMove={handleMaskPaint}
              onPointerUp={handleMaskPointerUp}
              onPointerLeave={handleMaskPointerUp}
            />
              {layers.filter(l => l.visible).map((layer, index) => {
                const left = mediaRect.width / 2 + (layer.x * canvasScale);
                const top = mediaRect.height / 2 + (layer.y * canvasScale);
                
                const isSelected = selectedLayerId === layer.id;
                const isManipulating = (dragState?.id === layer.id) || (resizeState?.id === layer.id);
                const someLayerIsManipulating = !!dragState || !!resizeState;

                return (
                  <div
                    key={layer.id}
                    onPointerDown={(e) => handleLayerPointerDown(e, layer)}
                    className={cn(
                      "absolute origin-center touch-none select-none",
                      !isManipulating && "transition-all duration-300 ease-out",
                      isSelected ? "ring-2 ring-brand ring-offset-2 ring-offset-transparent z-50" : "z-10",
                      isManipulating ? "ring-brand ring-4 opacity-80 cursor-grabbing shadow-2xl scale-[1.01]" : "cursor-move",
                      someLayerIsManipulating && !isManipulating ? "pointer-events-none opacity-40 grayscale-[0.2]" : ""
                    )}
                    style={{
                      left,
                      top,
                      width: layer.width ? layer.width * canvasScale : 'auto',
                      height: layer.height ? layer.height * canvasScale : 'auto',
                      opacity: isManipulating ? 0.9 : ((layer.opacity ?? 100) / 100),
                      zIndex: isSelected ? 1000 : index,
                      transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
                      filter: layer.filters ? getFilterString(layer.filters) : 'none',
                    }}
                  >
                    {layer.type === 'image' ? (
                      <img
                        src={layer.content}
                        alt={layer.name}
                        className="w-full h-full object-contain select-none pointer-events-none"
                      />
                    ) : (
                      <div
                        className="p-1 select-none whitespace-pre-wrap wrap-break-word"
                        style={{
                          fontSize: (layer.fontSize || 24) * canvasScale,
                          color: layer.color || '#ffffff',
                          fontFamily: layer.fontFamily || 'sans-serif',
                          textAlign: layer.textAlign || 'center',
                          fontWeight: layer.fontWeight || 'normal',
                          fontStyle: layer.fontStyle || 'normal',
                          textShadow: layer.textShadow || 'none',
                          letterSpacing: layer.letterSpacing ? `${layer.letterSpacing}px` : 'normal',
                          lineHeight: layer.lineHeight || 1.2,
                          WebkitTextStroke: layer.textStrokeWidth ? `${layer.textStrokeWidth * canvasScale}px ${layer.textStrokeColor || '#000000'}` : 'none',
                          maxWidth: (layer.width || 0) * canvasScale || 'none',
                        }}
                      >
                        {layer.content}
                      </div>
                    )}

                    {isSelected && (
                      <>
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-900 rounded-sm cursor-nwse-resize z-50" onPointerDown={(e) => handleResizePointerDown(e, layer, 'nw')} />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-900 rounded-sm cursor-nesw-resize z-50" onPointerDown={(e) => handleResizePointerDown(e, layer, 'ne')} />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-900 rounded-sm cursor-nesw-resize z-50" onPointerDown={(e) => handleResizePointerDown(e, layer, 'sw')} />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-900 rounded-sm cursor-nwse-resize z-50" onPointerDown={(e) => handleResizePointerDown(e, layer, 'se')} />
                        
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-slate-900 rounded-sm cursor-ns-resize z-50" onPointerDown={(e) => handleResizePointerDown(e, layer, 'n')} />
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-slate-900 rounded-sm cursor-ns-resize z-50" onPointerDown={(e) => handleResizePointerDown(e, layer, 's')} />
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-slate-900 rounded-sm cursor-ew-resize z-50" onPointerDown={(e) => handleResizePointerDown(e, layer, 'w')} />
                        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-slate-900 rounded-sm cursor-ew-resize z-50" onPointerDown={(e) => handleResizePointerDown(e, layer, 'e')} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-6 right-6 z-50">
              <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/10 p-1.5 rounded-full shadow-2xl">
                <button
                  onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
                >
                  -
                </button>
                <div 
                  className="px-2 py-1 text-xs font-medium text-white/70 min-w-14 text-center cursor-pointer hover:text-white"
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                >
                  {Math.round(zoom * 100)}%
                </div>
                <button
                  onClick={() => setZoom(prev => Math.min(10, prev + 0.1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
