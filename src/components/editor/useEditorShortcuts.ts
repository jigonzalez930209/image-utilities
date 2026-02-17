import { useEffect } from 'react';
import type { Layer } from './types';

interface ShortcutsProps {
  selectedLayerId: string | null;
  selectedLayer: Layer | undefined;
  handleUndo: () => void;
  handleRedo: () => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  handleCopy?: () => void;
}

export const useEditorShortcuts = ({
  selectedLayerId, selectedLayer, handleUndo, handleRedo, 
  removeLayer, updateLayer, setZoom, setPan, handleCopy
}: ShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault(); handleRedo(); return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && handleCopy) {
        e.preventDefault(); handleCopy(); return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault(); setZoom(1); setPan({ x: 0, y: 0 }); return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault(); setZoom(prev => Math.min(10, prev * 1.2)); return;
      }
      
      if ((e.ctrlKey || e.metaKey) && (e.key === '-')) {
        e.preventDefault(); setZoom(prev => Math.max(0.1, prev / 1.2)); return;
      }

      if (isTyping) return;

      if (selectedLayerId && selectedLayerId !== 'base-layer' && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault(); removeLayer(selectedLayerId); return;
      }

      if (selectedLayerId && selectedLayer) {
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft') { e.preventDefault(); updateLayer(selectedLayerId, { x: (selectedLayer.x || 0) - step }); }
        if (e.key === 'ArrowRight') { e.preventDefault(); updateLayer(selectedLayerId, { x: (selectedLayer.x || 0) + step }); }
        if (e.key === 'ArrowUp') { e.preventDefault(); updateLayer(selectedLayerId, { y: (selectedLayer.y || 0) - step }); }
        if (e.key === 'ArrowDown') { e.preventDefault(); updateLayer(selectedLayerId, { y: (selectedLayer.y || 0) + step }); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerId, selectedLayer, handleUndo, handleRedo, removeLayer, updateLayer, setZoom, setPan, handleCopy]);
};
