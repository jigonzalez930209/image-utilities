import React from 'react';
import { Crop } from 'lucide-react';
import { cn } from '../../utils';
import type { AspectPreset } from './useCrop';
import { ASPECT_OPTIONS } from './useCrop';

interface CropPanelProps {
  aspectPreset: AspectPreset;
  applyAspectPreset: (preset: AspectPreset) => void;
}

export const CropPanel: React.FC<CropPanelProps> = ({
  aspectPreset,
  applyAspectPreset,
}) => (
  <div className="space-y-4">
    <label className="text-sm font-medium text-white/60 flex items-center gap-2">
      <Crop size={16} /> Aspect ratio
    </label>
    <div className="grid grid-cols-3 gap-2">
      {ASPECT_OPTIONS.map((option: { id: AspectPreset; label: string; ratio: number | null }) => (
        <button
          key={option.id}
          onClick={() => applyAspectPreset(option.id)}
          className={cn(
            'px-2 py-2 rounded-lg border text-xs font-medium transition-all',
            aspectPreset === option.id
              ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20'
              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
    <p className="text-[11px] text-white/45 leading-relaxed">
      Drag from corners or edges. The dark area is the ghost crop.
    </p>
  </div>
);
