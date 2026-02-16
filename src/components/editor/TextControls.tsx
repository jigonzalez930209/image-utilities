import React from 'react';
import { cn } from '../../utils';
import type { Layer } from './types';
import { Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Layers } from 'lucide-react';

interface TextControlsProps {
  layer: Layer;
  onUpdate: (id: string, updates: Partial<Layer>) => void;
}

const FONTS = [
  { id: 'Inter', label: 'Inter' },
  { id: 'Roboto', label: 'Roboto' },
  { id: 'Playfair Display', label: 'Playfair' },
  { id: 'Montserrat', label: 'Montserrat' },
  { id: 'JetBrains Mono', label: 'Monospace' },
  { id: 'Dancing Script', label: 'Script' },
  { id: 'Oswald', label: 'Oswald' },
];

export const TextControls: React.FC<TextControlsProps> = ({ layer, onUpdate }) => {
  return (
    <div className="space-y-6 p-1">
      {/* Content */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-2">
          <Type size={12} /> Content
        </label>
        <textarea
          value={layer.content}
          onChange={(e) => onUpdate(layer.id, { content: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand/50 min-h-[80px] resize-none transition-all placeholder:text-white/20 shadow-inner"
          placeholder="Enter your message..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Font Size */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Size</label>
          <div className="relative group">
            <input
              type="number"
              value={layer.fontSize || 24}
              onChange={(e) => onUpdate(layer.id, { fontSize: parseInt(e.target.value) || 12 })}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand/50 transition-all font-mono"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/20 group-focus-within:text-brand/50">PX</div>
          </div>
        </div>

        {/* Color */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Color</label>
          <div className="flex gap-2">
            <div 
              className="w-11 h-11 rounded-xl border border-white/10 shrink-0 relative overflow-hidden group shadow-inner"
              style={{ backgroundColor: layer.color || '#ffffff' }}
            >
              <input
                type="color"
                value={layer.color || '#ffffff'}
                onChange={(e) => onUpdate(layer.id, { color: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 rounded-full bg-white shadow-lg" />
              </div>
            </div>
            <input
              type="text"
              value={(layer.color || '#ffffff').toUpperCase()}
              onChange={(e) => onUpdate(layer.id, { color: e.target.value })}
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-2 text-[10px] font-mono text-white focus:outline-none focus:border-brand/50 uppercase transition-all"
            />
          </div>
        </div>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Typography</label>
        <div className="flex flex-wrap gap-1.5">
          {FONTS.map((font) => (
            <button
              key={font.id}
              onClick={() => onUpdate(layer.id, { fontFamily: font.id })}
              className={cn(
                "px-3 py-2 rounded-lg border text-[11px] transition-all",
                layer.fontFamily === font.id 
                  ? "bg-brand border-brand text-white shadow-lg shadow-brand/20 scale-105" 
                  : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
              )}
              style={{ fontFamily: font.id }}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alignment & Style toggles */}
      <div className="space-y-3">
        <div className="flex gap-2">
           <div className="flex-1 flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {(['left', 'center', 'right'] as const).map((align) => {
              const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
              return (
                <button
                  key={align}
                  onClick={() => onUpdate(layer.id, { textAlign: align })}
                  className={cn(
                    "flex-1 p-2 rounded-lg transition-all flex items-center justify-center",
                    layer.textAlign === align ? "bg-white/10 text-white shadow-sm" : "text-white/30 hover:text-white/60"
                  )}
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
             <button
                onClick={() => onUpdate(layer.id, { fontWeight: layer.fontWeight === 'bold' ? 'normal' : 'bold' })}
                className={cn(
                  "p-2 w-9 h-9 rounded-lg transition-all flex items-center justify-center",
                  layer.fontWeight === 'bold' ? "bg-brand text-white shadow-md shadow-brand/20" : "text-white/30 hover:text-white/60"
                )}
              >
                <Bold size={14} />
              </button>
              <button
                onClick={() => onUpdate(layer.id, { fontStyle: layer.fontStyle === 'italic' ? 'normal' : 'italic' })}
                className={cn(
                  "p-2 w-9 h-9 rounded-lg transition-all flex items-center justify-center",
                  layer.fontStyle === 'italic' ? "bg-brand text-white shadow-md shadow-brand/20" : "text-white/30 hover:text-white/60"
                )}
              >
                <Italic size={14} />
              </button>
          </div>
        </div>
      </div>

      {/* Spacing & Line Height */}
      <div className="space-y-4 pt-2 border-t border-white/5">
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Letter Spacing</label>
            <span className="text-[10px] font-mono text-white/20">{layer.letterSpacing || 0}px</span>
          </div>
          <input
            type="range"
            value={layer.letterSpacing || 0}
            min={-5}
            max={20}
            step={0.5}
            onChange={(e) => onUpdate(layer.id, { letterSpacing: parseFloat(e.target.value) })}
            className="w-full accent-brand h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Line Height</label>
            <span className="text-[10px] font-mono text-white/20">{layer.lineHeight || 1.2}</span>
          </div>
          <input
            type="range"
            value={layer.lineHeight || 1.2}
            min={0.5}
            max={3}
            step={0.1}
            onChange={(e) => onUpdate(layer.id, { lineHeight: parseFloat(e.target.value) })}
            className="w-full accent-brand h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Stroke & Shadow */}
      <div className="space-y-4 pt-2 border-t border-white/5">
         <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
              <div className="flex items-center gap-1"><Layers size={10} /> Text Stroke</div>
              <span className="font-mono text-white/20">{layer.textStrokeWidth || 0}px</span>
            </div>
            <div className="flex items-center gap-3">
               <input
                type="color"
                value={layer.textStrokeColor || '#000000'}
                onChange={(e) => onUpdate(layer.id, { textStrokeColor: e.target.value })}
                className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-none"
              />
              <input
                type="range"
                value={layer.textStrokeWidth || 0}
                min={0}
                max={10}
                step={0.5}
                onChange={(e) => onUpdate(layer.id, { textStrokeWidth: parseFloat(e.target.value) })}
                className="flex-1 accent-white h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>
        </div>

        <button
          onClick={() => onUpdate(layer.id, { textShadow: layer.textShadow ? '' : '0 4px 12px rgba(0,0,0,0.5)' })}
          className={cn(
            "w-full p-3 rounded-xl border text-[10px] uppercase font-bold transition-all flex items-center justify-center gap-2",
            layer.textShadow ? "bg-white border-white text-slate-900 shadow-xl" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
          )}
        >
          {layer.textShadow ? 'Remove Shadow' : 'Add Drop Shadow'}
        </button>
      </div>
    </div>
  );
};
