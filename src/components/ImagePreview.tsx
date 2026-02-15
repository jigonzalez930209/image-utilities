import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, Layers, CheckCircle } from 'lucide-react';

interface ImagePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  originalUrl: string;
  previewUrl: string;
  onConfirmProcess: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  isOpen,
  onClose,
  originalUrl,
  previewUrl,
  onConfirmProcess,
}) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
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
                <h2 className="text-white font-black uppercase tracking-tighter text-3xl md:text-5xl leading-none mb-1">Premium comparison</h2>
                <p className="text-brand text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand animate-ping" /> Drag to compare
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-5 bg-white/5 hover:bg-white/10 text-white rounded-3xl transition-all border border-white/10 group shadow-2xl active:scale-90"
            >
              <XCircle size={36} className="group-hover:rotate-90 transition-transform duration-500" />
            </button>
          </div>

          {/* Main Comparison Area */}
          <div className="relative w-full max-w-6xl flex items-center justify-center z-10 px-4">
            <ComparisonSlider 
              original={originalUrl} 
              processed={previewUrl} 
            />
          </div>

          {/* Footer Actions */}
          <div className="absolute bottom-0 inset-x-0 p-10 md:p-16 text-center z-50 bg-gradient-to-t from-black/90 to-transparent">
            <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-xl mx-auto">
              <button
                onClick={onClose}
                className="flex-1 px-10 py-5 rounded-2xl bg-white/5 text-white/50 font-black uppercase tracking-widest text-xs hover:bg-white/10 hover:text-white transition-all border border-white/5 shadow-xl active:scale-95"
              >
                Back
              </button>
              <button
                onClick={() => {
                  onConfirmProcess();
                  onClose();
                }}
                className="flex-1 px-10 py-5 rounded-2xl bg-brand text-white font-black uppercase tracking-widest text-xs shadow-[0_0_50px_rgba(var(--color-brand),0.4)] hover:bg-brand-accent transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                Process <CheckCircle size={24} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
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
          AI processed
        </div>
      </div>
    </div>
  );
};
