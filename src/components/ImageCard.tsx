import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, RefreshCw, CheckCircle, Download, ChevronDown, Eye, ChevronUp, Layers } from 'lucide-react';
import { type ProcessedImage } from '../hooks/useImageProcessor';
import { formatBytes, cn } from '../lib/utils';
import { FORMAT_CATEGORIES, type ImageFormat } from '../lib/formats';
import { ImagePreview } from './ImagePreview';

interface ImageCardProps {
  image: ProcessedImage;
  onUpdate: (id: string, options: Partial<ProcessedImage>) => void;
  onProcess: (id: string) => void;
  onPreview: (id: string) => void;
  onRemove: (id: string) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ image, onUpdate, onProcess, onPreview, onRemove }) => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [isPendingPreview, setIsPendingPreview] = React.useState(false);

  // Auto-open preview when URL is ready if requested
  React.useEffect(() => {
    if (isPendingPreview && image.previewUrl) {
      setShowPreview(true);
      setIsPendingPreview(false);
    }
  }, [image.previewUrl, isPendingPreview]);

  const handlePreviewTrigger = async () => {
    if (image.previewUrl) {
      setShowPreview(true);
      return;
    }
    setIsPendingPreview(true);
    try {
      await onPreview(image.id);
    } catch {
      setIsPendingPreview(false);
    }
  };

  const models = [
    { id: 'isnet_quint8', name: 'Express', desc: 'Rápido, ideal para objetos simples.' },
    { id: 'isnet_fp16', name: 'Balanced', desc: 'Equilibrio entre velocidad y precisión.' },
    { id: 'isnet', name: 'Pro', desc: 'Máxima precisión, más lento.' }
  ] as const;


  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden"
    >
      <div className="p-4 flex flex-col sm:flex-row gap-4 items-center">
        <button 
          onClick={handlePreviewTrigger}
          disabled={image.status === 'processing' || isPendingPreview || !image.removeBackground}
          className={cn(
            "relative w-24 h-24 rounded-lg overflow-hidden bg-white/10 flex-shrink-0 group/thumb transition-all active:scale-95 disabled:active:scale-100",
            !image.removeBackground && "cursor-default active:scale-100"
          )}
        >
          <img src={image.originalUrl} alt={image.originalName} className="w-full h-full object-cover" />
          
          {image.removeBackground && (
            <div className="absolute inset-0 bg-brand/30 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all duration-200">
              <div className="p-2 bg-brand text-white rounded-full shadow-2xl scale-75 group-hover/thumb:scale-100 transition-transform duration-200">
                {image.status === 'processing' || isPendingPreview ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Eye size={16} />
                )}
              </div>
            </div>
          )}

          {isPendingPreview && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
              <RefreshCw size={20} className="text-white animate-spin" />
            </div>
          )}
        </button>

        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-medium truncate">{image.originalName}</h3>
            {image.removeBackground && (
              <span className="px-1.5 py-0.5 rounded-md bg-brand/20 text-brand text-[8px] font-black uppercase">IA</span>
            )}
          </div>
          <p className="text-white/40 text-xs mb-3">{formatBytes(image.originalSize)}</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group/select">
              <select
                value={image.format}
                onChange={(e) => onUpdate(image.id, { format: e.target.value as ImageFormat })}
                className="appearance-none bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold px-3 py-1.5 pr-8 rounded-lg outline-none border border-white/5 transition-colors cursor-pointer"
              >
                {Object.entries(FORMAT_CATEGORIES).map(([category, formats]) => (
                  <optgroup key={category} label={category} className="bg-[#0f172a]">
                    {formats.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>

            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all",
                image.removeBackground 
                  ? "bg-brand/10 border-brand text-brand" 
                  : "bg-white/5 border-white/5 text-white/40 hover:text-white"
              )}
            >
              <Layers size={14} />
              {image.removeBackground ? "IA Activa" : "Configurar IA"}
              {isSettingsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {image.status !== 'processing' && !isPendingPreview && (
            <button
              onClick={() => onProcess(image.id)}
              className={cn(
                "p-2.5 rounded-xl transition-all shadow-lg active:scale-95",
                image.status === 'completed' 
                  ? "bg-white/5 text-white/40 hover:bg-brand hover:text-white" 
                  : "bg-brand text-white hover:bg-brand-accent shadow-brand/20"
              )}
            >
              <RefreshCw size={20} />
            </button>
          )}
          {(image.status === 'processing' || isPendingPreview) && (
            <div className="flex flex-col items-end gap-1">
              <div className="animate-spin text-brand text-opacity-80">
                <RefreshCw size={20} />
              </div>
              {image.progress && (
                <div className="flex flex-col items-end leading-tight">
                  <span className="text-[7px] text-brand/60 font-black uppercase tracking-widest whitespace-nowrap">
                    {image.progress.key.includes('model') ? 'Cargando IA' : 'Procesando'}
                  </span>
                  <span className="text-[10px] text-brand font-mono font-black">
                    {image.progress.percent}%
                  </span>
                </div>
              )}
            </div>
          )}
          {image.status === 'completed' && (
            <div className="flex gap-2">
              <a
                href={image.processedUrl}
                download={`processed_${image.originalName.split('.')[0]}.${image.format}`}
                className="p-2.5 rounded-xl bg-green-500/20 text-green-500 hover:bg-green-500/30 transition-colors shadow-lg shadow-green-500/10"
              >
                <Download size={20} />
              </a>
              <CheckCircle size={20} className="text-green-500 self-center" />
            </div>
          )}
          <button
            onClick={() => onRemove(image.id)}
            className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className="border-t border-white/5 bg-white/[0.02] overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Ajustes de Remoción de Fondo</span>
                <label className="flex items-center gap-2 cursor-pointer group/toggle">
                  <span className="text-[11px] font-bold text-white/60 group-hover:text-white transition-colors">
                    {image.removeBackground ? 'Habilitado' : 'Deshabilitado'}
                  </span>
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={image.removeBackground}
                      onChange={(e) => onUpdate(image.id, { removeBackground: e.target.checked })}
                      className="peer absolute opacity-0 w-0 h-0"
                    />
                    <div className="w-9 h-5 bg-white/10 rounded-full transition-colors peer-checked:bg-brand" />
                    <div className="absolute left-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
                  </div>
                </label>
              </div>

              {image.removeBackground && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onUpdate(image.id, { bgModel: m.id })}
                        className={cn(
                          "px-3 py-2 rounded-xl border text-left transition-all relative overflow-hidden",
                          image.bgModel === m.id 
                            ? "bg-brand/10 border-brand text-white" 
                            : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                        )}
                      >
                        <div className="text-[10px] font-black uppercase mb-0.5">{m.name}</div>
                        <div className="text-[8px] leading-tight opacity-60">{m.desc}</div>
                        {image.bgModel === m.id && (
                          <motion.div 
                            layoutId="active-model" 
                            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                            className="absolute inset-0 border-2 border-brand rounded-xl pointer-events-none" 
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handlePreviewTrigger}
                      disabled={image.status === 'processing' || isPendingPreview}
                      className="flex-grow flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all border border-white/5 active:scale-95 disabled:opacity-50"
                    >
                      <Eye size={14} />
                      {image.previewUrl ? 'Actualizar Previsualización' : 'Previsualizar'}
                    </button>
                    {image.previewUrl && (
                      <button
                        onClick={() => setShowPreview(true)}
                        className="p-2.5 rounded-xl bg-brand/20 text-brand border border-brand/20 hover:bg-brand/30 transition-all"
                      >
                        <Layers size={18} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImagePreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        originalUrl={image.originalUrl}
        previewUrl={image.previewUrl || ''}
        onConfirmProcess={() => onProcess(image.id)}
      />
    </motion.div>
  );
};

