import { useState, useCallback } from 'react';
import type { Layer, FilterState } from './types';

export interface HistoryState {
  rotation: number;
  straighten: number;
  layers: Layer[];
  filters?: FilterState;
  cropRect?: { x: number; y: number; width: number; height: number };
}

const MAX_HISTORY = 20;

export const useHistory = () => {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const pushState = useCallback((newState: HistoryState) => {
    setHistory(prev => {
      const last = prev[currentIndex];
      // Basic check, though Deep equality or specific fields would be better
      if (last && JSON.stringify(last) === JSON.stringify(newState)) return prev;

      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newState);

      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        setCurrentIndex(MAX_HISTORY - 1);
        return newHistory;
      }

      setCurrentIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    currentState: history[currentIndex],
  };
};
