import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ListFilter, ArrowRight, LayoutList, Camera } from 'lucide-react';
import { useImageProcessor } from './hooks/useImageProcessor';
import { Dropzone } from './components/Dropzone';
import { ImageCard } from './components/ImageCard';
import { ImageEditor } from './components/ImageEditor';
import { BatchToolbar } from './components/BatchToolbar';
import { cn } from './lib/utils';

const App: React.FC = () => {
  const { 
    images, 
    addImages, 
    updateImageOptions, 
    processImage, 
    previewBackground, 
    removeImage,
    clearAll,
    setGlobalOptions,
    processAll
  } = useImageProcessor();
  const [activeTab, setActiveTab] = useState<'converter' | 'editor'>('converter');
  const [editingImage, setEditingImage] = useState<string | null>(null);

  const handleEditorSave = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edited-image-${Date.now()}.png`;
    link.click();
    setEditingImage(null);
  };

  return (
    <div className="min-h-screen bg-[#020617] selection:bg-brand/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8 md:py-16 max-w-5xl">
        {/* Header Section */}
        <header className="text-center mb-12 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-brand text-xs font-bold tracking-widest uppercase mb-6"
          >
            <Zap size={14} /> Powered by Magick WASM
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight"
          >
            Image<span className="text-brand">Tools</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/40 text-lg md:text-xl max-w-2xl mx-auto font-medium"
          >
            Ultra-fast conversion and professional editing powered by AI, 
            right in your browser. Full privacy guaranteed.
          </motion.p>
        </header>

        {/* Premium Tab Interface */}
        <div className="flex justify-center mb-10">
          <div className="bg-white/5 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 inline-flex gap-1">
            <button
              onClick={() => setActiveTab('converter')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2",
                activeTab === 'converter' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-white/40 hover:text-white"
              )}
            >
              <LayoutList size={18} /> Converter
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2",
                activeTab === 'editor' ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-white/40 hover:text-white"
              )}
            >
              <Camera size={18} /> Pro Editor
            </button>
          </div>
        </div>

        <section className="space-y-12">
          {activeTab === 'converter' ? (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="glass rounded-4xl p-4 md:p-8 border border-white/5 shadow-2xl">
                <Dropzone onFilesDropped={addImages} />
              </div>

              <AnimatePresence mode="popLayout">
                {images.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <BatchToolbar 
                      imageCount={images.length}
                      onUpdateAll={setGlobalOptions}
                      onProcessAll={processAll}
                      onClearAll={clearAll}
                    />

                    <div className="grid gap-4">
                      <div className="flex items-center justify-between px-4 mb-2">
                        <h2 className="text-white/60 text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                          <ListFilter size={16} /> Processing queue
                        </h2>
                        <span className="px-2 py-0.5 rounded-lg bg-white/5 text-white/40 text-[10px] font-mono border border-white/5">
                          {images.length} {images.length === 1 ? 'IMAGE' : 'IMAGES'}
                        </span>
                      </div>
                      {images.map((image) => (
                        <ImageCard
                          key={image.id}
                          image={image}
                          onUpdate={updateImageOptions}
                          onProcess={processImage}
                          onPreview={previewBackground}
                          onRemove={removeImage}
                        />
                      ))}
                    </div>
                    
                    <motion.div 
                      layout
                      className="flex justify-end pt-6"
                    >
                      <button
                        onClick={processAll}
                        className="group flex items-center gap-3 px-8 py-4 bg-brand hover:bg-brand-accent text-white rounded-2xl font-black shadow-2xl shadow-brand/25 transition-all hover:-translate-y-1 active:translate-y-0"
                      >
                        Process all <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-4xl p-12 md:p-24 border border-white/5 shadow-2xl text-center"
            >
              <div className="max-w-md mx-auto space-y-8">
                <div className="w-24 h-24 bg-brand/10 rounded-3xl flex items-center justify-center mx-auto text-brand">
                  <Camera size={48} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">Professional Image Editor</h3>
                  <p className="text-white/40 font-medium">
                    Upload an image to start cropping, adjusting color, and applying advanced filters.
                  </p>
                </div>
                <label className="block w-full cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setEditingImage(URL.createObjectURL(file));
                    }}
                  />
                  <div className="w-full flex items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-bold transition-all">
                    Select image
                  </div>
                </label>
              </div>
            </motion.div>
          )}
        </section>

        {editingImage && (
          <ImageEditor 
            image={editingImage} 
            onSave={handleEditorSave}
            onCancel={() => setEditingImage(null)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
