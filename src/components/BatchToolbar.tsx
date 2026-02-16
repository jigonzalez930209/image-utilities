import React from 'react';
import { motion } from 'framer-motion';
import { Settings2, Trash2, RefreshCw, ChevronDown, Layers, ShieldCheck } from 'lucide-react';
import { OUTPUT_CATEGORIES, type OutputFormat } from '../lib/formats';
import { cn } from '../lib/utils';
import type { ProcessedImage } from '../hooks/useImageProcessor';

interface BatchToolbarProps {
  onUpdateAll: (options: Partial<ProcessedImage>) => void;
  onProcessAll: () => void;
  onClearAll: () => void;
  imageCount: number;
}

export const BatchToolbar: React.FC<BatchToolbarProps> = ({
  onUpdateAll,
  onProcessAll,
  onClearAll,
  imageCount,
}) => {
  const [format, setFormat] = React.useState<OutputFormat>('PNG');
  const [removeBg, setRemoveBg] = React.useState(false);
  const [stripMetadata, setStripMetadata] = React.useState(true);

  const handleFormatChange = (newFormat: OutputFormat) => {
    setFormat(newFormat);
    onUpdateAll({ format: newFormat });
  };

  const handleToggleBg = () => {
    const newVal = !removeBg;
    setRemoveBg(newVal);
    onUpdateAll({ removeBackground: newVal });
  };

  const handleTogglePrivacy = () => {
    const newVal = !stripMetadata;
    setStripMetadata(newVal);
    onUpdateAll({ stripMetadata: newVal });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-4xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xl"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-brand/10 rounded-2xl flex items-center justify-center text-brand">
          <Settings2 size={20} />
        </div>
        <div>
          <h4 className="text-white font-bold text-sm">Batch Configuration</h4>
          <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest">Applying to {imageCount} images</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Format Selector */}
        <div className="relative group/select">
          <label className="absolute -top-5 left-1 text-[8px] font-black text-white/20 uppercase tracking-widest">Global Format</label>
          <select
            value={format}
            onChange={(e) => handleFormatChange(e.target.value as OutputFormat)}
            className="appearance-none bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold px-4 py-2 pr-10 rounded-xl outline-none border border-white/5 transition-colors cursor-pointer"
          >
            {Object.entries(OUTPUT_CATEGORIES).map(([category, formats]) => (
              <optgroup key={category} label={category} className="bg-[#0f172a]">
                {formats.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
        </div>

        {/* AI Background Toggle */}
        <button
          onClick={handleToggleBg}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl border text-[11px] font-bold transition-all relative overflow-hidden",
            removeBg 
              ? "bg-brand/10 border-brand text-brand" 
              : "bg-white/5 border-white/5 text-white/40 hover:text-white"
          )}
        >
          <Layers size={14} />
          AI Background Removal: {removeBg ? 'ON' : 'OFF'}
        </button>

        {/* Privacy Toggle */}
        <button
          onClick={handleTogglePrivacy}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl border text-[11px] font-bold transition-all relative overflow-hidden",
            stripMetadata 
              ? "bg-green-500/10 border-green-500/50 text-green-500" 
              : "bg-white/5 border-white/5 text-white/40 hover:text-white"
          )}
        >
          <ShieldCheck size={14} />
          Privacy: {stripMetadata ? 'ENABLED' : 'DISABLED'}
        </button>

        <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />

        <div className="flex items-center gap-2">
          <button
            onClick={onClearAll}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-[11px] font-bold transition-all"
          >
            <Trash2 size={14} />
            Clear Queue
          </button>
          
          <button
            onClick={onProcessAll}
            className="flex items-center gap-2 px-6 py-2 bg-brand hover:bg-brand-accent text-white rounded-xl text-[11px] font-black shadow-xl shadow-brand/20 transition-all active:scale-95"
          >
            <RefreshCw size={14} />
            Process All
          </button>
        </div>
      </div>
    </motion.div>
  );
};
