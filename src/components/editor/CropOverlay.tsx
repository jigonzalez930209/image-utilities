import React from 'react';
import type { Layer } from './types';
import { getFilterString } from './useFilters';
import type { CropHandle } from './useCrop';

interface CropOverlayProps {
  layers: Layer[];
  mediaRect: { x: number; y: number; width: number; height: number };
  cropRect: { x: number; y: number; width: number; height: number };
  totalRotation: number;
  startCropDrag: (event: React.PointerEvent, handle: CropHandle) => void;
}

export const CropOverlay: React.FC<CropOverlayProps> = ({
  layers,
  mediaRect,
  cropRect,
  totalRotation,
  startCropDrag,
}) => {
  const baseLayer = layers.find(l => l.id === 'base-layer');
  const canvasScale = (baseLayer && baseLayer.width > 0) ? mediaRect.width / (Math.abs(totalRotation % 180) === 90 ? baseLayer.height : baseLayer.width) : 1;

  return (
    <div className="h-full w-full relative select-none touch-none overflow-hidden bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),rgba(15,23,42,0.4)_45%,rgba(2,6,23,0.85)_90%)]">
      {layers.filter(l => l.visible).map(layer => {
        const isBase = layer.id === 'base-layer';
        return (
          layer.type === 'image' && (
            <img
              key={layer.id}
              src={layer.content}
              alt={layer.name}
              className="absolute pointer-events-none"
              style={{
                left: mediaRect.x + mediaRect.width / 2 + (isBase ? 0 : layer.x * canvasScale),
                top: mediaRect.y + mediaRect.height / 2 + (isBase ? 0 : layer.y * canvasScale),
                width: (layer.width || baseLayer?.width || 0) * canvasScale,
                height: (layer.height || baseLayer?.height || 0) * canvasScale,
                opacity: (layer.opacity ?? 100) / 100,
                maxWidth: 'none',
                maxHeight: 'none',
                zIndex: 1,
                filter: layer.filters ? getFilterString(layer.filters) : 'none',
                transform: `translate(-50%, -50%) rotate(${(layer.rotation || 0) + totalRotation}deg)`,
              }}
            />
          )
        );
      })}

      {/* Overlays */}
      <div className="absolute bg-black/55 backdrop-blur-[1px] pointer-events-none" style={{ left: mediaRect.x, top: mediaRect.y, width: mediaRect.width, height: mediaRect.height * cropRect.y, zIndex: 10 }} />
      <div className="absolute bg-black/55 backdrop-blur-[1px] pointer-events-none" style={{ left: mediaRect.x, top: mediaRect.y + mediaRect.height * (cropRect.y + cropRect.height), width: mediaRect.width, height: mediaRect.height * (1 - cropRect.y - cropRect.height), zIndex: 10 }} />
      <div className="absolute bg-black/55 backdrop-blur-[1px] pointer-events-none" style={{ left: mediaRect.x, top: mediaRect.y + mediaRect.height * cropRect.y, width: mediaRect.width * cropRect.x, height: mediaRect.height * cropRect.height, zIndex: 10 }} />
      <div className="absolute bg-black/55 backdrop-blur-[1px] pointer-events-none" style={{ left: mediaRect.x + mediaRect.width * (cropRect.x + cropRect.width), top: mediaRect.y + mediaRect.height * cropRect.y, width: mediaRect.width * (1 - cropRect.x - cropRect.width), height: mediaRect.height * cropRect.height, zIndex: 10 }} />

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
  );
};
