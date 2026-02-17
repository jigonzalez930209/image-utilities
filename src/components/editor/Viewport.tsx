import React, { useCallback } from 'react';
import { cn } from '../../utils';
import type { CropHandle } from './useCrop';
import type { Layer } from './types';
import { useViewportEvents } from './useViewportEvents';
import { CropOverlay } from './CropOverlay';
import { LayerRenderer } from './LayerRenderer';
import type { HistoryState } from './useHistory';

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
  onManipulationEnd?: () => void;
  // History and state for manipulation end
  pushState: (state: HistoryState) => void;
  rotation: number;
  straighten: number;
  imageNaturalSize: { width: number; height: number };
}

export const Viewport: React.FC<ViewportProps> = (props) => {
  const {
    layers, selectedLayerId, onSelectLayer, onUpdateLayer, activePanel,
    cropRect, mediaRect, cropViewportRef, startCropDrag,
    totalRotation, zoom, setZoom, pan, setPan,
    onManipulationEnd,
    pushState, rotation, straighten // Destructure new props
  } = props;

  const imageNaturalSize = props.imageNaturalSize || { width: 1, height: 1 };
  const mediaRectWidth = mediaRect?.width || 1;
  const isPortrait = Math.abs(totalRotation % 180) === 90;
  const visualWidth = isPortrait ? (imageNaturalSize.height || 1) : (imageNaturalSize.width || 1);
  const canvasScale = mediaRectWidth / visualWidth;

  // Define handleManipulationEnd using useCallback
  const handleManipulationEnd = useCallback(() => {
    onManipulationEnd?.(); // Call original prop if it exists
    pushState({ rotation, straighten, layers, zoom, pan });
  }, [pushState, rotation, straighten, layers, zoom, pan, onManipulationEnd]);

  const {
    internalRef, isPanning, handleViewportPointerDown,
    startLayerDrag, startResizeDrag, dragState, resizeState
  } = useViewportEvents({
    layers, zoom, setZoom, pan, setPan, mediaRect, onUpdateLayer, onManipulationEnd: handleManipulationEnd, onSelectLayer, totalRotation, imageNaturalSize
  });

  return (
    <div 
      ref={internalRef}
      onPointerDown={handleViewportPointerDown}
      className={cn(
        "h-full w-full min-h-0 bg-black/40 relative overflow-hidden flex items-center justify-center p-4 md:p-12 shadow-inner",
        isPanning && "cursor-grabbing"
      )}
      style={{ overscrollBehavior: 'none' }}
    >
      <div 
        ref={cropViewportRef}
        className="w-full h-full min-h-0 relative rounded-3xl overflow-hidden glass border border-white/5"
      >
        {activePanel === 'crop' ? (
          <CropOverlay 
            layers={layers} 
            mediaRect={mediaRect} 
            cropRect={cropRect} 
            totalRotation={totalRotation} 
            startCropDrag={startCropDrag} 
          />
        ) : (
          <div 
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
              <LayerRenderer
                layers={layers} selectedLayerId={selectedLayerId} canvasScale={canvasScale} 
                mediaRect={mediaRect} 
                dragState={dragState} resizeState={resizeState} onSelectLayer={onSelectLayer}
                startLayerDrag={startLayerDrag} startResizeDrag={startResizeDrag}
              />
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
