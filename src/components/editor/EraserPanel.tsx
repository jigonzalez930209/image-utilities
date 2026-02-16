import React from 'react';
import { Eraser, Sparkles, Trash2, Check } from 'lucide-react';
import { cn } from '../../utils';

interface EraserPanelProps {
  brushSize: number;
  setBrushSize: (size: number) => void;
  onApply: () => void;
  onClear: () => void;
  isProcessing: boolean;
  hasMask: boolean;
}

export const EraserPanel: React.FC<EraserPanelProps> = ({
  brushSize,
  setBrushSize,
  onApply,
  onClear,
  isProcessing,
  hasMask,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white/60 flex items-center gap-2">
          <Eraser size={16} /> Smart Eraser
        </label>
        {hasMask && (
          <button
            onClick={onClear}
            className="text-white/40 hover:text-red-400 transition-colors"
            title="Clear Selection"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-mono text-white/40">
            <span>BRUSH SIZE</span>
            <span>{brushSize}px</span>
          </div>
          <input
            type="range"
            value={brushSize}
            min="5"
            max="100"
            step="1"
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 leading-relaxed">
          <p>
            <strong>Tip:</strong> Paint over the object you want to remove. 
            Keep the stroke close to the object for better results.
          </p>
        </div>

        <button
          onClick={onApply}
          disabled={isProcessing || !hasMask}
          className={cn(
            "w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium",
            isProcessing
              ? "bg-brand/20 border-brand/30 text-brand animate-pulse"
              : !hasMask
                ? "bg-white/5 border-white/10 text-white/20 cursor-not-allowed"
                : "bg-brand border-brand text-white shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles size={18} /> Apply Magic Erase
            </>
          )}
        </button>
      </div>
      
      {/* Verification indicators */}
      <div className="flex items-center gap-4 text-[10px] text-white/30 uppercase tracking-widest font-bold">
        <div className="flex items-center gap-1">
          <Check size={10} className="text-green-500" /> Local AI
        </div>
        <div className="flex items-center gap-1">
          <Check size={10} className="text-green-500" /> Non-Destructive
        </div>
      </div>
    </div>
  );
};
