import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { AspectPreset } from './useCrop';
import { CropPanel } from './CropPanel';
import { AdjustPanel } from './AdjustPanel';
import { LayersPanel } from './LayersPanel';
import { TextControls } from './TextControls';
import type { FilterState, EditorPanel, Layer } from './types';
import type { FilterPreset } from './useFilters';
import type { ProgressStage } from '../../lib/imageProcessor';
import { ToolSelection } from './ToolSelection';
import { ExportOptions } from './ExportOptions';

interface SidebarProps {
  activePanel: EditorPanel;
  setActivePanel: (panel: EditorPanel) => void;
  rotation: number;
  setRotation: (fn: (r: number) => number) => void;
  straighten: number;
  setStraighten: (value: number) => void;
  aspectPreset: AspectPreset;
  applyAspectPreset: (preset: AspectPreset) => void;
  filters: FilterState;
  activePreset: FilterPreset;
  updateFilter: (key: keyof FilterState, value: number) => void;
  applyPreset: (preset: FilterPreset) => void;
  removeBackground: () => void;
  progress: ProgressStage | null;
  exportFormat: 'png' | 'jpg' | 'webp' | 'avif' | 'tiff' | 'bmp';
  setExportFormat: (format: 'png' | 'jpg' | 'webp' | 'avif' | 'tiff' | 'bmp') => void;
  exportQuality: number;
  setExportQuality: (quality: number) => void;
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onAddLayer: (type: 'image' | 'text', content: string, width?: number, height?: number) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onRemoveLayer: (id: string) => void;
  onReorderLayers: (from: number, to: number) => void;
  onManipulationEnd: () => void;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const {
    activePanel, setActivePanel, setRotation, straighten, setStraighten,
    aspectPreset, applyAspectPreset, filters, activePreset, updateFilter,
    applyPreset, removeBackground, progress,
    exportFormat, setExportFormat, exportQuality, setExportQuality,
    layers, selectedLayerId, onSelectLayer, onAddLayer, onUpdateLayer,
    onRemoveLayer, onReorderLayers, onManipulationEnd,
  } = props;

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  return (
    <div className="w-full md:w-80 bg-slate-900/90 backdrop-blur-xl border-t md:border-t-0 md:border-r border-white/10 p-4 md:p-6 flex flex-col gap-6 h-[40vh] md:h-full overflow-y-auto scrollbar-hide">
      <ToolSelection activePanel={activePanel} setActivePanel={setActivePanel} setRotation={setRotation} removeBackground={removeBackground} progress={progress} onManipulationEnd={onManipulationEnd} />
      <div className="h-px bg-white/10 w-full" />
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
        {activePanel === 'straighten' && (
          <div className="space-y-4">
            <label className="text-sm font-medium text-white/60 flex items-center gap-2"><SlidersHorizontal size={16} /> Straighten Angle</label>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-mono text-white/40"><span>ANGLE</span><span>{straighten.toFixed(1)}°</span></div>
              <input type="range" value={straighten} min={-45} max={45} step={0.1} 
                onChange={(e) => setStraighten(Number(e.target.value))} 
                onPointerUp={() => onManipulationEnd()}
                className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        )}
        {activePanel === 'crop' && <CropPanel aspectPreset={aspectPreset} applyAspectPreset={applyAspectPreset} />}
        {activePanel === 'adjust' && <AdjustPanel filters={filters} activePreset={activePreset} updateFilter={updateFilter} applyPreset={applyPreset} onManipulationEnd={onManipulationEnd} />}
        {activePanel === 'layers' && (
          <div className="space-y-6">
            <LayersPanel layers={layers} selectedLayerId={selectedLayerId} onSelectLayer={onSelectLayer} onAddLayer={onAddLayer} onUpdateLayer={onUpdateLayer} onRemoveLayer={onRemoveLayer} onReorderLayers={onReorderLayers} />
            {selectedLayer?.type === 'text' && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-brand"><div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" /><h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Text Properties</h3></div>
                <TextControls layer={selectedLayer} onUpdate={onUpdateLayer} />
              </div>
            )}
          </div>
        )}
      </div>
      <ExportOptions exportFormat={exportFormat} setExportFormat={setExportFormat} exportQuality={exportQuality} setExportQuality={setExportQuality} />
    </div>
  );
};

