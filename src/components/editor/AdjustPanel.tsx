import React from 'react';
import { Sun, Sparkles } from 'lucide-react';
import { cn } from '../../utils';
import type { FilterState, FilterPreset } from './useFilters';

interface AdjustPanelProps {
  filters: FilterState;
  activePreset: FilterPreset;
  updateFilter: (key: keyof FilterState, value: number) => void;
  applyPreset: (preset: FilterPreset) => void;
  applyEnhance: () => void;
  isAnalyzing: boolean;
}

export const AdjustPanel: React.FC<AdjustPanelProps> = ({
  filters,
  activePreset,
  updateFilter,
  applyPreset,
  applyEnhance,
  isAnalyzing,
}) => (
  <div className="space-y-6">
    <label className="text-sm font-medium text-white/60 flex items-center gap-2">
      <Sun size={16} /> Adjustments
    </label>

    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-mono text-white/40">
          <span>BRIGHTNESS</span>
          <span>{filters.brightness}%</span>
        </div>
        <input
          type="range"
          value={filters.brightness}
          min="0"
          max="200"
          onChange={(e) => updateFilter('brightness', Number(e.target.value))}
          className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-mono text-white/40">
          <span>CONTRAST</span>
          <span>{filters.contrast}%</span>
        </div>
        <input
          type="range"
          value={filters.contrast}
          min="0"
          max="200"
          onChange={(e) => updateFilter('contrast', Number(e.target.value))}
          className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-mono text-white/40">
          <span>SATURATION</span>
          <span>{filters.saturate}%</span>
        </div>
        <input
          type="range"
          value={filters.saturate}
          min="0"
          max="200"
          onChange={(e) => updateFilter('saturate', Number(e.target.value))}
          className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-mono text-white/40">
          <span>HUE</span>
          <span>{filters.hue}°</span>
        </div>
        <input
          type="range"
          value={filters.hue}
          min="-180"
          max="180"
          onChange={(e) => updateFilter('hue', Number(e.target.value))}
          className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-mono text-white/40">
          <span>VIBRANCE</span>
          <span>{filters.vibrance}%</span>
        </div>
        <input
          type="range"
          value={filters.vibrance}
          min="0"
          max="200"
          onChange={(e) => updateFilter('vibrance', Number(e.target.value))}
          className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-mono text-white/40">
          <span>TEMPERATURE</span>
          <span>{filters.temperature}</span>
        </div>
        <input
          type="range"
          value={filters.temperature}
          min="-100"
          max="100"
          onChange={(e) => updateFilter('temperature', Number(e.target.value))}
          className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>

    <div className="space-y-2">
      <label className="text-sm font-medium text-white/60">Presets</label>
      <div className="grid grid-cols-2 gap-2">
        {['sepia', 'bw', 'vintage', 'glow'].map((preset) => (
          <button
            key={preset}
            onClick={() => applyPreset(preset as FilterPreset)}
            className={cn(
              'px-3 py-2 rounded-lg border text-sm font-medium transition-all capitalize',
              activePreset === preset
                ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            )}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>

    <button
      onClick={applyEnhance}
      disabled={isAnalyzing}
      className={cn(
        "w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium",
        isAnalyzing 
          ? "bg-brand/20 border-brand/30 text-brand animate-pulse" 
          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
      )}
    >
      {isAnalyzing ? (
        <>
          <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          Analyzing Image...
        </>
      ) : (
        <>
          <Sparkles size={18} /> Enhance with AI
        </>
      )}
    </button>
  </div>
);
