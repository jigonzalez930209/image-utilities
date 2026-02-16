import React from 'react';
import { Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Plus, Type } from 'lucide-react';
import { cn } from '../../utils';
import type { Layer } from './types';

interface LayersPanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onRemoveLayer: (id: string) => void;
  onReorderLayers: (from: number, to: number) => void;
  onAddLayer: (type: 'image' | 'text', content: string, width?: number, height?: number) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onRemoveLayer,
  onReorderLayers,
  onAddLayer,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-white/60">Layers</label>
        <div className="flex gap-2">
          <button
            onClick={() => onAddLayer('text', 'New Text')}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors"
            title="Add Text Layer"
          >
            <Type size={14} />
          </button>
          <button
             onClick={() => {
               const input = document.createElement('input');
               input.type = 'file';
               input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    const img = new Image();
                    img.onload = () => {
                      onAddLayer('image', url, img.naturalWidth, img.naturalHeight);
                    };
                    img.src = url;
                  }
                };
               input.click();
             }}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors"
            title="Add Image Layer"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
        {[...layers].reverse().map((layer, index) => {
          const actualIndex = layers.length - 1 - index;
          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={cn(
                "group flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer",
                selectedLayerId === layer.id 
                  ? "bg-brand/10 border-brand/50 text-white" 
                  : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateLayer(layer.id, { visible: !layer.visible });
                  }}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold truncate">{layer.name}</span>
                  <span className="text-[10px] text-white/20 uppercase tracking-tighter">{layer.type}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  disabled={actualIndex === layers.length - 1}
                  onClick={(e) => { e.stopPropagation(); onReorderLayers(actualIndex, actualIndex + 1); }}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-20"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  disabled={actualIndex === 0}
                  onClick={(e) => { e.stopPropagation(); onReorderLayers(actualIndex, actualIndex - 1); }}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-20"
                >
                  <ChevronDown size={12} />
                </button>
                {layer.id !== 'base-layer' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                    className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
