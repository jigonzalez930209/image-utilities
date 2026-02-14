import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, RefreshCw, CheckCircle, Download, XCircle, ChevronDown, Eye, ChevronUp, Layers } from 'lucide-react';
import { type ProcessedImage } from '../hooks/useImageProcessor';
import { formatBytes, cn } from '../lib/utils';
import { FORMAT_CATEGORIES, type ImageFormat } from '../lib/formats';

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
          disabled={image.status === 'processing' || isPendingPreview}
          className="relative w-24 h-24 rounded-lg overflow-hidden bg-white/10 flex-shrink-0 group/thumb transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          <img src={image.originalUrl} alt={image.originalName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-brand/30 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all duration-200">
            <div className="p-2 bg-brand text-white rounded-full shadow-2xl scale-75 group-hover/thumb:scale-100 transition-transform duration-200">
              {image.status === 'processing' || isPendingPreview ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Eye size={16} />
              )}
            </div>
          </div>
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
          {image.status === 'idle' && !isPendingPreview && (
            <button
              onClick={() => onProcess(image.id)}
              className="p-2.5 rounded-xl bg-brand text-white hover:bg-brand-accent transition-all shadow-lg shadow-brand/20 active:scale-95"
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

      <AnimatePresence>
        {showPreview && image.previewUrl && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999 }}
            className="flex flex-col items-center justify-center backdrop-blur-3xl bg-black/95 p-4 md:p-8"
          >
            {/* Header / Controls */}
            <div className="absolute top-0 inset-x-0 p-6 md:p-12 flex items-center justify-between z-50 max-w-7xl mx-auto w-full">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center text-white shadow-[0_0_40px_rgba(var(--color-brand),0.4)]">
                  <Layers size={28} />
                </div>
                <div>
                  <h2 className="text-white font-black uppercase tracking-tighter text-3xl md:text-5xl leading-none mb-1">Comparador Premium</h2>
                  <p className="text-brand text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand animate-ping" /> Desliza para comparar
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPreview(false)}
                className="p-5 bg-white/5 hover:bg-white/10 text-white rounded-3xl transition-all border border-white/10 group shadow-2xl active:scale-90"
              >
                <XCircle size={36} className="group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>

            {/* Main Comparison Area */}
            <div className="relative w-full max-w-6xl flex items-center justify-center z-10 px-4">
              <ComparisonSlider 
                original={image.originalUrl} 
                processed={image.previewUrl} 
              />
            </div>

            {/* Footer Actions */}
            <div className="absolute bottom-0 inset-x-0 p-10 md:p-16 text-center z-50 bg-gradient-to-t from-black/90 to-transparent">
              <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-xl mx-auto">
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex-1 px-10 py-5 rounded-2xl bg-white/5 text-white/50 font-black uppercase tracking-widest text-xs hover:bg-white/10 hover:text-white transition-all border border-white/5 shadow-xl active:scale-95"
                >
                  Regresar
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    onProcess(image.id);
                  }}
                  className="flex-1 px-10 py-5 rounded-2xl bg-brand text-white font-black uppercase tracking-widest text-xs shadow-[0_0_50px_rgba(var(--color-brand),0.4)] hover:bg-brand-accent transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  Procesar Final <CheckCircle size={24} />
                </button>
              </div>
            </div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface ComparisonSliderProps {
  original: string;
  processed: string;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ original, processed }) => {
  const [position, setPosition] = React.useState(50);
  const [isDragging, setIsDragging] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleMove = React.useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  React.useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleMove(e.touches[0].clientX);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isDragging, handleMove]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video md:aspect-[3/2] rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 select-none group/slider"
    >
      {/* Background (After) */}
      <div className="absolute inset-0 checkerboard bg-opacity-50" />
      <img src={processed} className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" alt="After" />

      {/* Foreground (Before) */}
      <div 
        className="absolute inset-0 overflow-hidden z-20 pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img src={original} className="absolute inset-0 w-full h-full object-contain" alt="Before" />
      </div>

      {/* Draggable Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-brand/50 z-30 cursor-col-resize active:bg-brand transition-colors"
        style={{ left: `${position}%` }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-brand group-active/slider:scale-110 transition-transform cursor-pointer">
          <div className="flex gap-1">
            <div className="w-1 h-4 bg-brand rounded-full opacity-40 shrink-0" />
            <div className="w-1 h-4 bg-brand rounded-full shrink-0" />
            <div className="w-1 h-4 bg-brand rounded-full opacity-40 shrink-0" />
          </div>
        </div>
        
        {/* Visual Line Glow */}
        <div className="absolute inset-0 bg-brand/30 blur-sm -z-10" />
      </div>

      {/* Labels */}
      <div className="absolute top-6 left-6 z-40 flex flex-col gap-2 pointer-events-none">
        <div className="px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white/50 shadow-2xl">
          Original
        </div>
      </div>
      <div className="absolute top-6 right-6 z-40 flex flex-col gap-2 pointer-events-none">
        <div className="px-4 py-2 bg-brand/80 backdrop-blur-xl border border-brand/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl">
          Procesado IA
        </div>
      </div>
    </div>
  );
};
