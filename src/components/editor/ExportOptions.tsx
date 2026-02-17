import React from 'react';
import type { ExportFormat } from './types';

interface ExportOptionsProps {
  exportFormat: ExportFormat;
  setExportFormat: (format: ExportFormat) => void;
  exportQuality: number;
  setExportQuality: (quality: number) => void;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({
  exportFormat, setExportFormat, exportQuality, setExportQuality
}) => {
  const formats: ExportFormat[] = ['png', 'jpg', 'webp', 'avif', 'tiff', 'bmp'];
  return (
    <div className="mt-auto pt-2 flex items-center gap-2 justify-between border-t border-white/10">
      <span className="text-xs text-white/40 font-medium">Format:</span>
      <select 
        value={exportFormat} 
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExportFormat(e.target.value as ExportFormat)} 
        className="bg-slate-900/50 border border-white/20 rounded px-2 py-1 text-white text-xs w-24 focus:outline-none focus:border-brand"
      >
        {formats.map(f => (
          <option key={f} value={f}>{f.toUpperCase()}</option>
        ))}
      </select>
      <input 
        type="range" value={exportQuality} min="1" max="100" 
        onChange={(e) => setExportQuality(Number(e.target.value))} 
        className="w-16 accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" 
      />
      <span className="text-xs font-mono text-white/40 w-6 text-right">{exportQuality}%</span>
    </div>
  );
};
