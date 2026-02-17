import React from 'react';
import { cn } from '../../utils';
import type { Layer } from './types';
import type { CropHandle } from './useCrop';
import { getFilterString } from './useFilters';

interface LayerRendererProps {
  layers: Layer[];
  selectedLayerId: string | null;
  canvasScale: number;
  mediaRect: { width: number; height: number };
  dragState: { id: string } | null;
  resizeState: { id: string } | null;
  onSelectLayer: (id: string | null) => void;
  startLayerDrag: (e: React.PointerEvent, layer: Layer) => void;
  startResizeDrag: (e: React.PointerEvent, layer: Layer, handle: CropHandle) => void;
}

export const LayerRenderer: React.FC<LayerRendererProps> = ({
  layers,
  selectedLayerId,
  canvasScale,
  mediaRect,
  dragState,
  resizeState,
  onSelectLayer,
  startLayerDrag,
  startResizeDrag,
}) => {
  return (
    <>
      {layers.filter(l => l.visible).map((layer, index) => {
        const left = mediaRect.width / 2 + (layer.x * canvasScale);
        const top = mediaRect.height / 2 + (layer.y * canvasScale);
        const isSelected = selectedLayerId === layer.id;
        const isManipulating = (dragState?.id === layer.id) || (resizeState?.id === layer.id);
        const someLayerIsManipulating = !!dragState || !!resizeState;

        return (
          <div
            key={layer.id}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelectLayer(layer.id);
              startLayerDrag(e, layer);
            }}
            className={cn(
              "absolute origin-center touch-none select-none",
              !isManipulating && "transition-all duration-300 ease-out",
              isSelected ? "ring-2 ring-brand ring-offset-1 ring-offset-transparent z-50 border border-brand/50" : "z-10",
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
              <img src={layer.content} alt={layer.name} className="w-full h-full block select-none pointer-events-none" />
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
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-brand rounded-full cursor-nwse-resize z-50 shadow-md hover:scale-125 transition-transform" onPointerDown={(e) => { e.stopPropagation(); startResizeDrag(e, layer, 'nw'); }} />
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-brand rounded-full cursor-nesw-resize z-50 shadow-md hover:scale-125 transition-transform" onPointerDown={(e) => { e.stopPropagation(); startResizeDrag(e, layer, 'ne'); }} />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-brand rounded-full cursor-nesw-resize z-50 shadow-md hover:scale-125 transition-transform" onPointerDown={(e) => { e.stopPropagation(); startResizeDrag(e, layer, 'sw'); }} />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-brand rounded-full cursor-nwse-resize z-50 shadow-md hover:scale-125 transition-transform" onPointerDown={(e) => { e.stopPropagation(); startResizeDrag(e, layer, 'se'); }} />
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-brand rounded-full cursor-ns-resize z-50 shadow-md hover:scale-125 transition-transform" onPointerDown={(e) => { e.stopPropagation(); startResizeDrag(e, layer, 'n'); }} />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-brand rounded-full cursor-ns-resize z-50 shadow-md hover:scale-125 transition-transform" onPointerDown={(e) => { e.stopPropagation(); startResizeDrag(e, layer, 's'); }} />
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-brand rounded-full cursor-ew-resize z-50 shadow-md hover:scale-125 transition-transform" onPointerDown={(e) => { e.stopPropagation(); startResizeDrag(e, layer, 'w'); }} />
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-brand rounded-full cursor-ew-resize z-50 shadow-md hover:scale-125 transition-transform" onPointerDown={(e) => { e.stopPropagation(); startResizeDrag(e, layer, 'e'); }} />
              </>
            )}
          </div>
        );
      })}
    </>
  );
};
