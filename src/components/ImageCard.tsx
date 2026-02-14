import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, RefreshCw, CheckCircle, Download, XCircle, ChevronDown } from 'lucide-react';
import { type ProcessedImage } from '../hooks/useImageProcessor';
import { formatBytes } from '../lib/utils';
import { FORMAT_CATEGORIES, type ImageFormat } from '../lib/formats';

interface ImageCardProps {
  image: ProcessedImage;
  onUpdate: (id: string, options: Partial<ProcessedImage>) => void;
  onProcess: (id: string) => void;
  onRemove: (id: string) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ image, onUpdate, onProcess, onRemove }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center"
    >
      <div className="w-24 h-24 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
        <img src={image.originalUrl} alt={image.originalName} className="w-full h-full object-cover" />
      </div>

      <div className="flex-grow min-w-0">
        <h3 className="text-white font-medium truncate mb-1">{image.originalName}</h3>
        <p className="text-white/40 text-xs mb-3">{formatBytes(image.originalSize)}</p>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <select
              value={image.format}
              onChange={(e) => onUpdate(image.id, { format: e.target.value as ImageFormat })}
              className="appearance-none bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 pr-8 rounded-lg outline-none border border-white/10 transition-colors cursor-pointer"
            >
              {Object.entries(FORMAT_CATEGORIES).map(([category, formats]) => (
                <optgroup key={category} label={category} className="bg-[#1e293b]">
                  {formats.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={image.removeBackground}
                onChange={(e) => onUpdate(image.id, { removeBackground: e.target.checked })}
                className="peer absolute opacity-0 w-0 h-0"
              />
              <div className="w-10 h-5 bg-white/10 rounded-full transition-colors peer-checked:bg-brand" />
              <div className="absolute left-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-xs text-white/70 font-medium">Quitar Fondo</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {image.status === 'idle' && (
          <button
            onClick={() => onProcess(image.id)}
            className="p-2 rounded-full bg-brand/20 text-brand hover:bg-brand/30 transition-colors"
          >
            <RefreshCw size={20} />
          </button>
        )}
        {image.status === 'processing' && (
          <div className="flex flex-col items-end gap-1">
            <div className="animate-spin text-brand">
              <RefreshCw size={20} />
            </div>
            {image.progress && (
              <span className="text-[10px] text-brand whitespace-nowrap">
                {image.progress.percent}% {image.progress.key.split(':').pop()}
              </span>
            )}
          </div>
        )}
        {image.status === 'completed' && (
          <div className="flex gap-2">
            <a
              href={image.processedUrl}
              download={`processed_${image.originalName.split('.')[0]}.${image.format}`}
              className="p-2 rounded-full bg-green-500/20 text-green-500 hover:bg-green-500/30 transition-colors"
            >
              <Download size={20} />
            </a>
            <CheckCircle size={20} className="text-green-500 self-center" />
          </div>
        )}
        {image.status === 'error' && (
            <XCircle size={20} className="text-red-500" />
        )}
        <button
          onClick={() => onRemove(image.id)}
          className="p-2 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </motion.div>
  );
};
