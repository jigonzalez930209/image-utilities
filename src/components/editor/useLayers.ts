import { useState, useCallback } from 'react';
import type { Layer, LayerType } from './types';

export const useLayers = (initialImage?: string) => {
  const [layers, setLayers] = useState<Layer[]>(() => {
    if (!initialImage) return [];
    return [{
      id: 'base-layer',
      type: 'image',
      name: 'Background',
      visible: true,
      locked: false,
      opacity: 100,
      x: 0,
      y: 0,
      width: 0, // Will be set once image loads
      height: 0,
      rotation: 0,
      content: initialImage,
      filters: {
        brightness: 100,
        contrast: 100,
        saturate: 100,
        hue: 0,
        vibrance: 100,
        temperature: 0,
      }
    }];
  });

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>('base-layer');

  const addLayer = useCallback((type: LayerType, content: string, width?: number, height?: number) => {
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      type,
      name: type === 'image' ? `Image ${layers.length + 1}` : `Text ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 100,
      x: 0, // Center by default or 0? 0 is fine for now as Viewport centers base-layer
      y: 0,
      width: width || (type === 'text' ? 200 : 0),
      height: height || (type === 'text' ? 50 : 0),
      rotation: 0,
      content,
    };

    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  }, [layers.length]);

  const updateLayer = useCallback((id: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  }, [selectedLayerId]);

  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    setLayers(prev => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  return {
    layers,
    selectedLayerId,
    setSelectedLayerId,
    addLayer,
    updateLayer,
    removeLayer,
    reorderLayers,
    setLayers,
  };
};
