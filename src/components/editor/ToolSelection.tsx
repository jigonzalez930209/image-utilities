import React from 'react';
import { Crop, Sun, Undo, ImageOff, Layers as LayersIcon } from 'lucide-react';
import { cn } from '../../utils';
import type { EditorPanel } from './types';
import type { ProgressStage } from '../../lib/imageProcessor';

interface ToolSelectionProps {
  activePanel: EditorPanel;
  setActivePanel: (panel: EditorPanel) => void;
  setRotation: (fn: (r: number) => number) => void;
  removeBackground: () => void;
  progress: ProgressStage | null;
  onManipulationEnd: () => void;
}

export const ToolSelection: React.FC<ToolSelectionProps> = ({
  activePanel, setActivePanel, setRotation, removeBackground, progress, onManipulationEnd
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-5 gap-1.5">
        {[
          { id: 'adjust', icon: Sun, label: 'Adjust' },
          { id: 'crop', icon: Crop, label: 'Crop' },
          { id: 'layers', icon: LayersIcon, label: 'Layers' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActivePanel(id as EditorPanel)}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all text-[9px] font-bold uppercase tracking-tighter",
              activePanel === id ? "bg-brand border-brand text-white shadow-lg shadow-brand/20" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
            )}
          >
            <Icon size={14} /> <span className="truncate w-full text-center">{label}</span>
          </button>
        ))}
        
        <button
          onClick={() => {
            setRotation((r) => (r + 90) % 360);
            setTimeout(() => onManipulationEnd(), 0);
          }}
          className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 transition-all text-[9px] font-bold uppercase tracking-tighter"
        >
          <Undo className="rotate-90" size={14} /> <span className="truncate w-full text-center">Rotate</span>
        </button>

        <button
          onClick={removeBackground}
          disabled={!!progress}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all text-[9px] font-bold uppercase tracking-tighter",
            progress ? "bg-brand/20 border-brand text-white shadow-lg" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
          )}
        >
          <ImageOff size={14} /> <span className="truncate w-full text-center">{progress ? 'BG...' : 'RMBG'}</span>
        </button>
      </div>
    </div>
  );
};
