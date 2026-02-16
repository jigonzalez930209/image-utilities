import {
  Crop,
  Sun,
  Undo,
  SlidersHorizontal,
  ImageOff,
  Layers as LayersIcon,
  Eraser
} from 'lucide-react';
import { cn } from '../../utils';
import type { AspectPreset } from './useCrop';
import type { FilterState, FilterPreset } from './useFilters';
import { CropPanel } from './CropPanel';
import { AdjustPanel } from './AdjustPanel';
import { LayersPanel } from './LayersPanel';
import { TextControls } from './TextControls';
import { EraserPanel } from './EraserPanel';
import type { EditorPanel } from '../ImageEditor';
import type { ProgressStage } from '../../lib/imageProcessor';
import type { Layer } from './types';

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
  applyEnhance: () => void;
  isAnalyzing: boolean;
  removeBackground: () => void;
  progress: ProgressStage | null;
  exportFormat: 'png' | 'jpg' | 'webp' | 'avif' | 'tiff' | 'bmp';
  setExportFormat: (format: 'png' | 'jpg' | 'webp' | 'avif' | 'tiff' | 'bmp') => void;
  exportQuality: number;
  setExportQuality: (quality: number) => void;
  // Layer management props
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onAddLayer: (type: 'image' | 'text', content: string, width?: number, height?: number) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onRemoveLayer: (id: string) => void;
  onReorderLayers: (from: number, to: number) => void;
  // Eraser props
  brushSize: number;
  setBrushSize: (size: number) => void;
  isProcessingErase: boolean;
  onApplyErase: () => void;
  onClearMask: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePanel,
  setActivePanel,
  setRotation,
  straighten,
  setStraighten,
  aspectPreset,
  applyAspectPreset,
  filters,
  activePreset,
  updateFilter,
  applyPreset,
  applyEnhance,
  isAnalyzing,
  removeBackground,
  progress,
  exportFormat,
  setExportFormat,
  exportQuality,
  setExportQuality,
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onUpdateLayer,
  onRemoveLayer,
  onReorderLayers,
  brushSize,
  setBrushSize,
  isProcessingErase,
  onApplyErase,
  onClearMask,
}) => {
  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  return (
  <div className="w-full md:w-80 bg-slate-900/90 backdrop-blur-xl border-t md:border-t-0 md:border-r border-white/10 p-4 md:p-6 flex flex-col gap-6 h-[40vh] md:h-full overflow-y-auto scrollbar-hide">
    
    {/* Tool Selection */}
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => setActivePanel('adjust')}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest",
            activePanel === 'adjust' ? "bg-brand border-brand text-white shadow-lg shadow-brand/20" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
          )}
        >
          <Sun size={16} /> <span>Adjust</span>
        </button>
        <button
          onClick={() => setActivePanel('crop')}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest",
            activePanel === 'crop' ? "bg-brand border-brand text-white shadow-lg shadow-brand/20" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
          )}
        >
          <Crop size={16} /> <span>Crop</span>
        </button>
        <button
          onClick={() => setActivePanel('layers')}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest",
            activePanel === 'layers' ? "bg-brand border-brand text-white shadow-lg shadow-brand/20" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
          )}
        >
          <LayersIcon size={16} /> <span>Layers</span>
        </button>
        <button
          onClick={() => setActivePanel('eraser')}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest",
            activePanel === 'eraser' ? "bg-brand border-brand text-white shadow-lg shadow-brand/20" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
          )}
        >
          <Eraser size={16} /> <span>Erase</span>
        </button>
      </div>

      <button
          onClick={() => setRotation((r) => (r + 90) % 360)}
          className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-widest"
        >
          <Undo className="rotate-90" size={16} /> <span>Rotate</span>
        </button>

      <button
        onClick={removeBackground}
        disabled={!!progress}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all text-sm font-medium disabled:opacity-50"
      >
        <ImageOff size={18} /> {progress ? `Removing: ${progress}` : 'Remove Background'}
      </button>
    </div>

    <div className="h-px bg-white/10 w-full" />

    {/* Tool Controls */}
    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
      
      {activePanel === 'straighten' && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-white/60 flex items-center gap-2">
            <SlidersHorizontal size={16} /> Straighten Angle
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-mono text-white/40">
              <span>ANGLE</span>
              <span>{straighten.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              value={straighten}
              min={-45}
              max={45}
              step={0.1}
              onChange={(e) => setStraighten(Number(e.target.value))}
              className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}

      {activePanel === 'crop' && <CropPanel aspectPreset={aspectPreset} applyAspectPreset={applyAspectPreset} />}

      {activePanel === 'adjust' && (
        <AdjustPanel
          filters={filters}
          activePreset={activePreset}
          updateFilter={updateFilter}
          applyPreset={applyPreset}
          applyEnhance={applyEnhance}
          isAnalyzing={isAnalyzing}
        />
      )}

      {activePanel === 'eraser' && (
        <EraserPanel 
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          onApply={onApplyErase}
          onClear={onClearMask}
          isProcessing={isProcessingErase}
          hasMask={true} // Simplified, ideally check if canvas is dirty
        />
      )}

      {activePanel === 'layers' && (
        <div className="space-y-6">
          <LayersPanel
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={onSelectLayer}
            onAddLayer={onAddLayer}
            onUpdateLayer={onUpdateLayer}
            onRemoveLayer={onRemoveLayer}
            onReorderLayers={onReorderLayers}
          />
          
          {selectedLayer?.type === 'text' && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-brand">
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Text Properties</h3>
              </div>
              <TextControls layer={selectedLayer} onUpdate={onUpdateLayer} />
            </div>
          )}
        </div>
      )}
    </div>

    {/* Export Options (Small Footer inside Sidebar) */}
    <div className="mt-auto pt-2 flex items-center gap-2 justify-between border-t border-white/10">
        <span className="text-xs text-white/40 font-medium">Format:</span>
        <select value={exportFormat} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExportFormat(e.target.value as "png" | "jpg" | "webp" | "avif" | "tiff" | "bmp")} className="bg-slate-900/50 border border-white/20 rounded px-2 py-1 text-white text-xs w-24 focus:outline-none focus:border-brand">
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
          <option value="webp">WebP</option>
          <option value="avif">AVIF</option>
          <option value="tiff">TIFF</option>
          <option value="bmp">BMP</option>
        </select>
        <input type="range" value={exportQuality} min="1" max="100" onChange={(e) => setExportQuality(Number(e.target.value))} className="w-16 accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
        <span className="text-xs font-mono text-white/40 w-6 text-right">{exportQuality}%</span>
    </div>

  </div>
);
};
