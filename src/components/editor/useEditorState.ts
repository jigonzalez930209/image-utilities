import { useState, useEffect, useCallback } from 'react';
import { useLayers } from './useLayers';
import { useAIAutoFix } from './useAIAutoFix';
import { useBackgroundRemoval } from './useBackgroundRemoval';
import { useHistory } from './useHistory';
import { useCrop } from './useCrop';
import { useAIEnhance } from './useAIEnhance';
import { createImage } from './imageUtils';
import { DEFAULT_FILTERS, FILTER_PRESETS } from './useFilters';
import type { FilterState, EditorPanel } from './types';

export const useEditorState = (image: string) => {
  const [rotation, setRotation] = useState(0);
  const [straighten, setStraighten] = useState(0);
  const [activePanel, setActivePanel] = useState<EditorPanel>('adjust');
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp' | 'avif' | 'tiff' | 'bmp'>('png');
  const [exportQuality, setExportQuality] = useState(90);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  const { 
    layers, selectedLayerId, setSelectedLayerId, 
    addLayer, updateLayer, removeLayer, reorderLayers, setLayers 
  } = useLayers(image);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);
  const { analyzeImage, isAnalyzing } = useAIAutoFix();
  const { removeBg, progress } = useBackgroundRemoval();
  const { pushState, undo, redo, canUndo, canRedo } = useHistory();
  const totalRotation = rotation + straighten;
  const cropTools = useCrop(imageNaturalSize, totalRotation);

  const updateSelectedLayerFilter = (key: string, value: number) => {
    if (!selectedLayerId || !selectedLayer) return;
    updateLayer(selectedLayerId, {
      filters: { ...(selectedLayer.filters || DEFAULT_FILTERS), [key]: value } as FilterState
    });
  };

  const applySelectedLayerPreset = (preset: string) => {
    if (!selectedLayerId || !selectedLayer) return;
    const newFilters = { ...(selectedLayer.filters || DEFAULT_FILTERS), ...FILTER_PRESETS[preset as keyof typeof FILTER_PRESETS] } as FilterState;
    updateLayer(selectedLayerId, {
      filters: newFilters
    });
    pushState({ rotation, straighten, layers: layers.map(l => l.id === selectedLayerId ? { ...l, filters: newFilters } : l), zoom, pan });
  };

  const applyEnhance = async () => {
    if (!selectedLayerId || !selectedLayer) return;
    const suggestions = await analyzeImage(selectedLayer.content);
    if (suggestions) {
      const newState = { ...(selectedLayer.filters || DEFAULT_FILTERS), ...suggestions } as FilterState;
      updateLayer(selectedLayerId, {
        filters: newState
      });
      // Push state after AI enhance
      pushState({ rotation, straighten, layers: layers.map(l => l.id === selectedLayerId ? { ...l, filters: newState } : l), zoom, pan });
    }
  };


  const handleUndo = useCallback(() => {
    const s = undo();
    if (s) { 
      setRotation(s.rotation); 
      setStraighten(s.straighten); 
      if (s.layers) setLayers(s.layers);
      setZoom(s.zoom);
      setPan(s.pan);
    }
  }, [undo, setLayers, setZoom, setPan]);

  const handleRedo = useCallback(() => {
    const s = redo();
    if (s) { 
      setRotation(s.rotation); 
      setStraighten(s.straighten); 
      if (s.layers) setLayers(s.layers);
      setZoom(s.zoom);
      setPan(s.pan);
    }
  }, [redo, setLayers, setZoom, setPan]);

  const handleManipulationEnd = useCallback(() => pushState({ rotation, straighten, layers, zoom, pan }), [pushState, rotation, straighten, layers, zoom, pan]);

  // Remove auto-push on every change. Replaced with manual pushes in handlers and ManipulationEnd transitions.
  // useEffect(() => { pushState({ rotation, straighten, layers }); }, [rotation, straighten, layers, pushState]);

  useEffect(() => {
    let cancelled = false;
    createImage(image).then(img => {
      if (cancelled) return;
      setImageNaturalSize({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
    }).catch(() => setImageNaturalSize({ width: 1, height: 1 }));
    return () => { cancelled = true; };
  }, [image]);

  useEffect(() => {
    if (imageNaturalSize.width > 0) {
      updateLayer('base-layer', { width: imageNaturalSize.width, height: imageNaturalSize.height });
      // Push initial state once image dimensions are known
      pushState({ 
        rotation: 0, 
        straighten: 0, 
        layers: [{
          id: 'base-layer',
          type: 'image',
          name: 'Background',
          visible: true,
          locked: false,
          opacity: 100,
          x: 0,
          y: 0,
          width: imageNaturalSize.width,
          height: imageNaturalSize.height,
          rotation: 0,
          content: image,
          filters: DEFAULT_FILTERS
        }],
        zoom: 1, 
        pan: { x: 0, y: 0 } 
      });
    }
  }, [imageNaturalSize, updateLayer, image, pushState]);

  const handleRemoveBackground = async () => {
    if (!selectedLayerId || !selectedLayer || selectedLayer.type !== 'image') return;
    const newContent = await removeBg(selectedLayer.content);
    const finalLayers = layers.map(l => l.id === selectedLayerId ? { ...l, content: newContent } : l);
    updateLayer(selectedLayerId, { content: newContent });
    // Push state after background removal
    pushState({ rotation, straighten, layers: finalLayers, zoom, pan });
  };

  const { upscaleImage, isEnhancing, enhanceProgress, selectedModel, setSelectedModel } = useAIEnhance();

  const handleUpscale = async () => {
    if (!selectedLayerId || !selectedLayer || selectedLayer.type !== 'image') return;
    const newContent = await upscaleImage(selectedLayer.content);
    if (newContent) {
      const img = await createImage(newContent);
      const finalLayers = layers.map(l => l.id === selectedLayerId ? { 
        ...l, 
        content: newContent,
        width: img.naturalWidth,
        height: img.naturalHeight
      } : l);
      
      updateLayer(selectedLayerId, { 
        content: newContent,
        width: img.naturalWidth,
        height: img.naturalHeight
      });

      // If upscaling base layer, update imageNaturalSize too
      if (selectedLayerId === 'base-layer') {
        setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      }

      pushState({ rotation, straighten, layers: finalLayers, zoom, pan });
    }
  };

  return {
    rotation, setRotation, straighten, setStraighten, activePanel, setActivePanel,
    imageNaturalSize, exportFormat, setExportFormat, exportQuality, setExportQuality,
    layers, selectedLayerId, setSelectedLayerId, addLayer, updateLayer, removeLayer, reorderLayers,
    selectedLayer, isAnalyzing, applyEnhance, 
    progress, totalRotation, ...cropTools,
    undo: handleUndo, redo: handleRedo, canUndo, canRedo, zoom, setZoom, pan, setPan,
    handleManipulationEnd, handleRemoveBackground, setLayers,
    handleUpscale, isEnhancing, enhanceProgress, selectedModel, setSelectedModel,
    updateSelectedLayerFilter, applySelectedLayerPreset, pushState
  };
};
