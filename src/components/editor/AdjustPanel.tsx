import React from 'react';
import { Sun } from 'lucide-react';
import { cn } from '../../utils';
import type { FilterState, FilterPreset } from './useFilters';

interface AdjustPanelProps {
  filters: FilterState;
  activePreset: FilterPreset;
  updateFilter: (key: keyof FilterState, value: number) => void;
  applyPreset: (preset: FilterPreset) => void;
  onManipulationEnd: () => void;
}

export const AdjustPanel: React.FC<AdjustPanelProps> = ({
  filters,
  activePreset,
  updateFilter,
  applyPreset,
  onManipulationEnd,
}) => {


  return (
    <div className="space-y-6">
      <label className="text-sm font-medium text-white/60 flex items-center gap-2">
        <Sun size={16} /> Adjustments
      </label>

      <div className="space-y-4">
        {Object.entries({
          BRIGHTNESS: 'brightness',
          CONTRAST: 'contrast',
          SATURATION: 'saturate',
          VIBRANCE: 'vibrance',
          TEMPERATURE: 'temperature'
        }).map(([label, key]) => (
          <div key={key} className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-mono text-white/40">
              <span>{label}</span>
              <span>{filters[key as keyof FilterState]}%</span>
            </div>
            <input
              type="range"
              value={filters[key as keyof FilterState]}
              min={key === 'temperature' ? -100 : 0}
              max={key === 'temperature' ? 100 : 200}
              onChange={(e) => updateFilter(key as keyof FilterState, Number(e.target.value))}
              onPointerUp={() => onManipulationEnd()}
              className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        ))}
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

      <div className="space-y-4 pt-4 border-t border-white/10">



      </div>
    </div>
  );
};
