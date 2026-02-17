import React from 'react';
import { DEFAULT_FILTERS } from './editor/useFilters';
import { getCroppedImg, getProcessedImg } from './editor/imageUtils';
import { Sidebar } from './editor/Sidebar';
import { Viewport } from './editor/Viewport';
import { TopBar } from './editor/TopBar';
import { useEditorState } from './editor/useEditorState';
import { useEditorShortcuts } from './editor/useEditorShortcuts';
import type { Layer } from './editor/types';

interface ImageEditorProps {
  image: string;
  onSave: (editedBlob: Blob) => void;
  onCancel: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ image, onSave, onCancel }) => {
  const state = useEditorState(image);
  const {
    rotation, setRotation, straighten, setStraighten, activePanel, setActivePanel,
    exportFormat, setExportFormat, exportQuality, setExportQuality,
    layers, selectedLayerId, setSelectedLayerId, addLayer, updateLayer, removeLayer, reorderLayers,
    selectedLayer, progress, totalRotation, cropRect, mediaRect, 
    cropViewportRef, startCropDrag, applyAspectPreset, resetCrop, aspectPreset,
    undo, redo, canUndo, canRedo, zoom, setZoom, pan, setPan,
    handleManipulationEnd, handleRemoveBackground, getPixelCrop, setLayers,
    updateSelectedLayerFilter, applySelectedLayerPreset, pushState
  } = state;

  const handleCopy = React.useCallback(async () => {
    try {
      const pixelCrop = getPixelCrop();
      const shouldCrop = activePanel === 'crop' && !!pixelCrop;
      const baseLayer = layers.find((l: Layer) => l.id === 'base-layer');
      const blob = shouldCrop
        ? await getCroppedImg(baseLayer?.content || image, pixelCrop, totalRotation, 'none', 'PNG', 1)
        : await getProcessedImg(layers, totalRotation, 'none', 'PNG', 1);
      
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      console.log('[Editor] Image copied to clipboard');
    } catch (err) {
      console.error('[Editor] Failed to copy image:', err);
    }
  }, [activePanel, getPixelCrop, layers, image, totalRotation]);

  useEditorShortcuts({
    selectedLayerId, selectedLayer, handleUndo: undo, handleRedo: redo, 
    removeLayer, updateLayer, setZoom, setPan, handleCopy
  });

  const handleExport = async () => {
    const pixelCrop = getPixelCrop();
    const shouldCrop = activePanel === 'crop' && !!pixelCrop;
    const baseLayer = layers.find((l: Layer) => l.id === 'base-layer');
    const blob = shouldCrop
      ? await getCroppedImg(baseLayer?.content || image, pixelCrop, totalRotation, 'none', exportFormat, exportQuality)
      : await getProcessedImg(layers, totalRotation, 'none', exportFormat, exportQuality);
    onSave(blob);
  };

  const resetEditor = () => {
    setRotation(0); setStraighten(0); resetCrop();
    setZoom(1); setPan({ x: 0, y: 0 });
    const baseLayer = layers.find((l: Layer) => l.id === 'base-layer');
    if (baseLayer) {
      const resetBaseLayer = { ...baseLayer, filters: DEFAULT_FILTERS, x: 0, y: 0, rotation: 0 };
      setLayers([resetBaseLayer]);
      pushState({
        rotation: 0, straighten: 0,
        layers: [resetBaseLayer],
        zoom: 1, pan: { x: 0, y: 0 }
      });
    }
    setActivePanel('adjust');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] flex flex-col h-screen overflow-hidden">
      <TopBar onCancel={onCancel} onSave={handleExport} onUndo={undo} onRedo={redo} onReset={resetEditor} onCopy={handleCopy} canUndo={canUndo} canRedo={canRedo} />
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 min-h-0 order-1 md:order-2 relative bg-black/60 overflow-hidden">
          <Viewport
            layers={layers} selectedLayerId={selectedLayerId} onSelectLayer={setSelectedLayerId}
            onUpdateLayer={updateLayer} activePanel={activePanel} cropRect={cropRect}
            mediaRect={mediaRect} cropViewportRef={cropViewportRef} startCropDrag={startCropDrag}
            totalRotation={totalRotation} onManipulationEnd={handleManipulationEnd}
            zoom={zoom} setZoom={setZoom} pan={pan} setPan={setPan}
            pushState={pushState} rotation={rotation} straighten={straighten}
            imageNaturalSize={state.imageNaturalSize}
          />
        </div>
        <div className="order-2 md:order-1 z-10 md:h-full">
          <Sidebar
            activePanel={activePanel} setActivePanel={setActivePanel}
            rotation={rotation} setRotation={setRotation} straighten={straighten} setStraighten={setStraighten}
            aspectPreset={aspectPreset} applyAspectPreset={applyAspectPreset}
            filters={selectedLayer?.filters || DEFAULT_FILTERS} activePreset="none"
            updateFilter={updateSelectedLayerFilter}
            applyPreset={applySelectedLayerPreset}
            removeBackground={handleRemoveBackground} progress={progress}
            exportFormat={exportFormat} setExportFormat={setExportFormat}
            exportQuality={exportQuality} setExportQuality={setExportQuality}
            layers={layers} selectedLayerId={selectedLayerId} onSelectLayer={setSelectedLayerId}
            onAddLayer={addLayer} onUpdateLayer={updateLayer} onRemoveLayer={removeLayer} onReorderLayers={reorderLayers}
            onManipulationEnd={handleManipulationEnd}
          />
        </div>
      </div>
    </div>
  );
};
