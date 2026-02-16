import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCrop } from './editor/useCrop';
import { DEFAULT_FILTERS, FILTER_PRESETS, getFilterString } from './editor/useFilters';
import { useHistory } from './editor/useHistory';
import { useBackgroundRemoval } from './editor/useBackgroundRemoval';
import { getCroppedImg, getProcessedImg, createImage } from './editor/imageUtils';
import { useLayers } from './editor/useLayers';
import { Sidebar } from './editor/Sidebar';
import { Viewport } from './editor/Viewport';
import { TopBar } from './editor/TopBar';
import type { FilterState } from './editor/types';

import { useAIAutoFix } from './editor/useAIAutoFix';
import { inpaintTelea } from '../lib/imageProcessor/inpainting';

export type EditorPanel = 'crop' | 'adjust' | 'straighten' | 'layers' | 'eraser';

interface ImageEditorProps {
  image: string;
  onSave: (editedBlob: Blob) => void;
  onCancel: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ image, onSave, onCancel }) => {
  const [rotation, setRotation] = useState(0);
  const [straighten, setStraighten] = useState(0);
  const [activePanel, setActivePanel] = useState<EditorPanel>('adjust');
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp' | 'avif' | 'tiff' | 'bmp'>('png');
  const [exportQuality, setExportQuality] = useState(90);

  const { 
    layers, 
    selectedLayerId, 
    setSelectedLayerId, 
    addLayer, 
    updateLayer, 
    removeLayer, 
    reorderLayers,
    setLayers,
  } = useLayers(image);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // Filter adjustment helpers (work on selected layer)
  const updateSelectedLayerFilter = (key: string, value: number) => {
    if (!selectedLayerId || !selectedLayer) return;
    const currentFilters = selectedLayer.filters || DEFAULT_FILTERS;
    updateLayer(selectedLayerId, {
      filters: { ...currentFilters, [key]: value } as FilterState
    });
  };

  const applySelectedLayerPreset = (preset: string) => {
    if (!selectedLayerId || !selectedLayer) return;
    const currentFilters = selectedLayer.filters || DEFAULT_FILTERS;
    const presetValues = FILTER_PRESETS[preset as keyof typeof FILTER_PRESETS];
    updateLayer(selectedLayerId, {
      filters: { ...currentFilters, ...presetValues } as FilterState
    });
  };

  const { analyzeImage, isAnalyzing } = useAIAutoFix();

  const applyEnhance = async () => {
    if (!selectedLayerId || !selectedLayer) return;
    
    // For now base layer or any image layer
    const suggestions = await analyzeImage(selectedLayer.content);
    if (suggestions) {
      updateLayer(selectedLayerId, {
        filters: {
          ...(selectedLayer.filters || DEFAULT_FILTERS),
          ...suggestions
        } as FilterState
      });
    }
  };

  const [brushSize, setBrushSize] = useState(30);
  const [isProcessingErase, setIsProcessingErase] = useState(false);
  const eraserMaskRef = useRef<HTMLCanvasElement | null>(null);

  const handleMagicErase = async () => {
    if (!selectedLayerId || !selectedLayer || !eraserMaskRef.current) return;
    
    setIsProcessingErase(true);
    try {
      const img = new Image();
      img.src = selectedLayer.content;
      await img.decode();

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Get mask data scaled to original image size
      const maskCanvas = eraserMaskRef.current;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) return;

      const scaledMaskCanvas = document.createElement('canvas');
      scaledMaskCanvas.width = canvas.width;
      scaledMaskCanvas.height = canvas.height;
      const smCtx = scaledMaskCanvas.getContext('2d');
      if (!smCtx) return;
      smCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
      const maskData = smCtx.getImageData(0, 0, canvas.width, canvas.height).data;

      // Run Inpainting
      const resultData = inpaintTelea(imageData, maskData, { radius: Math.max(3, Math.floor(brushSize / 10)) });
      ctx.putImageData(resultData, 0, 0);

      const resultUrl = canvas.toDataURL('image/png');
      updateLayer(selectedLayerId, { content: resultUrl });
      
      // Clear mask after success
      const mCtx = maskCanvas.getContext('2d');
      if (mCtx) mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    } catch (err) {
      console.error('Magic Erase failed:', err);
    } finally {
      setIsProcessingErase(false);
    }
  };

  const totalRotation = rotation + straighten;

  const { cropRect, aspectPreset, mediaRect, cropViewportRef, startCropDrag, applyAspectPreset, getPixelCrop, resetCrop } = useCrop(imageNaturalSize, totalRotation);
  const { removeBg, progress } = useBackgroundRemoval();

  const { pushState, undo, redo, canUndo, canRedo } = useHistory();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // ONLY push state when layers change and we are NOT manipulating
  // We'll use a ref or a flag if needed, but for now let's just push when panel changes or manual actions occur.
  // Precise history pushing will be handled via callbacks from Viewport.
  useEffect(() => {
    pushState({ rotation, straighten, layers });
  }, [rotation, straighten, layers, pushState]); // Pushing layers here might still be spammy, but since we remove 'layers' from intermediate moves, it's safer.

  const handleManipulationEnd = useCallback(() => {
    pushState({ rotation, straighten, layers });
  }, [pushState, rotation, straighten, layers]);

  const handleUndo = useCallback(() => {
    const prevState = undo();
    if (prevState) {
      setRotation(prevState.rotation);
      setStraighten(prevState.straighten);
      if (prevState.layers) {
        setLayers(prevState.layers);
      }
    }
  }, [undo, setLayers]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setRotation(nextState.rotation);
      setStraighten(nextState.straighten);
      if (nextState.layers) {
        setLayers(nextState.layers);
      }
    }
  }, [redo, setLayers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
      
      // Ctrl+Z: Undo (Always allowed)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
           e.preventDefault();
           handleRedo();
        } else {
           e.preventDefault();
           handleUndo();
        }
        return;
      }

      // Ctrl+Y: Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl + 0: Reset View
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
        return;
      }

      // Ctrl + +/-: Zoom
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom(prev => Math.min(10, prev * 1.2));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '-')) {
        e.preventDefault();
        setZoom(prev => Math.max(0.1, prev / 1.2));
        return;
      }

      if (isTyping) return;

      // Delete/Backspace: Remove selected layer
      if (selectedLayerId && selectedLayerId !== 'base-layer' && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        removeLayer(selectedLayerId);
        return;
      }

      // Arrows: Move selected layer
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
  }, [selectedLayerId, selectedLayer, handleUndo, handleRedo, removeLayer, updateLayer]);

  useEffect(() => {
    let cancelled = false;
    // Reset natural size when image changes
    setImageNaturalSize({ width: 0, height: 0 });
    
    void createImage(image).then((img) => {
      if (cancelled) return;
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      
      if (width > 0 && height > 0) {
        setImageNaturalSize({ width, height });
      } else {
        // Fallback if measurement fails completely (e.g., broken image)
        setImageNaturalSize({ width: 1, height: 1 });
      }
    }).catch(err => {
      console.error('Failed to measure image:', err);
      // Fallback on error
      setImageNaturalSize({ width: 1, height: 1 });
    });
    return () => { cancelled = true; };
  }, [image]);

  useEffect(() => {
    if (imageNaturalSize.width > 0 && imageNaturalSize.height > 0) {
      updateLayer('base-layer', { 
        width: imageNaturalSize.width, 
        height: imageNaturalSize.height 
      });
    }
  }, [imageNaturalSize, updateLayer]);

  const handleRemoveBackground = async () => {
    if (!selectedLayerId || !selectedLayer || selectedLayer.type !== 'image') return;
    try {
      const newImageUrl = await removeBg(selectedLayer.content);
      updateLayer(selectedLayerId, { content: newImageUrl });
    } catch (e) {
      console.error('Background removal failed:', e);
      alert('Background removal failed.');
    }
  };

  const resetEditor = () => {
    setRotation(0);
    setStraighten(0);
    resetCrop();
    updateLayer('base-layer', { filters: DEFAULT_FILTERS });
    setActivePanel('adjust');
  };

  const handleExport = async () => {
    const pixelCrop = getPixelCrop();
    const shouldCrop = activePanel === 'crop' && !!pixelCrop;

    const baseLayer = layers.find(l => l.id === 'base-layer');
    const imageToExport = baseLayer ? baseLayer.content : image;
    
    // For now, global filters are determined by the base layer or none if we use per-layer
    const baseFilters = (baseLayer?.filters ? getFilterString(baseLayer.filters) : 'none');

    const blob = shouldCrop
      ? await getCroppedImg(imageToExport, pixelCrop, totalRotation, baseFilters, exportFormat, exportQuality)
      : await getProcessedImg(layers, totalRotation, 'none', exportFormat, exportQuality);

    onSave(blob);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] flex flex-col h-screen overflow-hidden">
      <TopBar 
        onCancel={onCancel}
        onSave={handleExport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onReset={resetEditor}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 min-h-0 order-1 md:order-2 relative bg-black/60 overflow-hidden">
           <Viewport
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onUpdateLayer={updateLayer}
            activePanel={activePanel}
            cropRect={cropRect}
            mediaRect={mediaRect}
            cropViewportRef={cropViewportRef}
            startCropDrag={startCropDrag}
            totalRotation={totalRotation}
            onManipulationEnd={handleManipulationEnd}
            zoom={zoom}
            setZoom={setZoom}
            pan={pan}
            setPan={setPan}
            // Eraser props
            brushSize={brushSize}
            eraserMaskRef={eraserMaskRef}
          />
        </div>
        <div className="order-2 md:order-1 z-10 md:h-full">
          <Sidebar
            activePanel={activePanel}
            setActivePanel={setActivePanel}
            rotation={rotation}
            setRotation={setRotation}
            straighten={straighten}
            setStraighten={setStraighten}
            aspectPreset={aspectPreset}
            applyAspectPreset={applyAspectPreset}
            filters={selectedLayer?.filters || DEFAULT_FILTERS}
            activePreset="none"
            updateFilter={updateSelectedLayerFilter}
            applyPreset={applySelectedLayerPreset}
            applyEnhance={applyEnhance}
            isAnalyzing={isAnalyzing}
            removeBackground={handleRemoveBackground}
            progress={progress}
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            exportQuality={exportQuality}
            setExportQuality={setExportQuality}
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onAddLayer={addLayer}
            onUpdateLayer={updateLayer}
            onRemoveLayer={removeLayer}
            onReorderLayers={reorderLayers}
            // Eraser props
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            isProcessingErase={isProcessingErase}
            onApplyErase={handleMagicErase}
            onClearMask={() => {
              const ctx = eraserMaskRef.current?.getContext('2d');
              if (ctx) ctx.clearRect(0, 0, eraserMaskRef.current!.width, eraserMaskRef.current!.height);
            }}
          />
        </div>
      </div>
    </div>
  );
};
