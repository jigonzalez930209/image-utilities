import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ListFilter, ArrowRight, LayoutList, Camera } from 'lucide-react';
import { useImageProcessor } from './hooks/useImageProcessor';
import { Dropzone } from './components/Dropzone';
import { ImageCard } from './components/ImageCard';
import { ImageEditor } from './components/ImageEditor';
import { BatchToolbar } from './components/BatchToolbar';
import { AnimatedBackground } from './components/AnimatedBackground';
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
      <AnimatedBackground active={images.length > 0} />
      
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <main className={cn(
        "relative z-10 container mx-auto px-4 transition-all duration-500",
        images.length > 0 ? "py-4 md:py-8" : "py-8 md:py-16"
      )}>
        {/* Header Section */}
        <header className={cn(
          "text-center transition-all duration-500 ease-in-out",
          images.length > 0 ? "mb-6" : "mb-12 md:mb-20"
        )}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: images.length > 0 ? 0 : 1, 
              y: images.length > 0 ? -20 : 0,
              height: images.length > 0 ? 0 : 'auto',
              marginBottom: images.length > 0 ? 0 : 24,
              pointerEvents: images.length > 0 ? 'none' : 'auto'
            }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-brand text-xs font-bold tracking-widest uppercase overflow-hidden"
          >
            <Zap size={14} /> Powered by Magick WASM
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: images.length > 0 ? 0.6 : 1, 
              scale: images.length > 0 ? 0.5 : 1,
              height: images.length > 0 ? 40 : 'auto',
              marginBottom: images.length > 0 ? 0 : 20
            }}
            className="flex justify-center"
          >
            <img 
              src={`${import.meta.env.BASE_URL}logo.svg`.replace(/\/+/g, '/')} 
              alt="Image Studio Logo" 
              className="w-24 h-24 md:w-32 md:h-32" 
            />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: images.length > 0 ? 0.6 : 1,
              y: images.length > 0 ? -20 : 0 
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              "font-black text-white tracking-tighter origin-center transition-all duration-500",
              images.length > 0 ? "text-3xl md:text-5xl -mt-8" : "text-6xl md:text-8xl mb-6"
            )}
          >
            Image<span className="bg-linear-to-r from-brand to-purple-500 bg-clip-text text-transparent">Studio</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: images.length > 0 ? 0 : 1,
              height: images.length > 0 ? 0 : 'auto',
              pointerEvents: images.length > 0 ? 'none' : 'auto',
              marginTop: images.length > 0 ? 0 : 24
            }}
            transition={{ duration: 0.4 }}
            className="text-white/40 text-lg md:text-xl max-w-2xl mx-auto font-medium overflow-hidden"
          >
            Ultra-fast conversion and professional editing powered by AI, 
            right in your browser. Full privacy guaranteed.
          </motion.p>
        </header>

        {/* Premium Tab Interface */}
        <div className={cn(
          "flex justify-center transition-all duration-500",
          images.length > 0 ? "mb-6" : "mb-10"
        )}>
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
              <Dropzone onFilesDropped={addImages} />

              <AnimatePresence mode="popLayout">
                {images.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-8"
                  >
                    <BatchToolbar 
                      imageCount={images.length}
                      onUpdateAll={setGlobalOptions}
                      onProcessAll={processAll}
                      onClearAll={clearAll}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-4">
                        <h2 className="text-white/60 text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                          <ListFilter size={16} /> Processing queue
                        </h2>
                        <span className="px-2 py-0.5 rounded-lg bg-white/5 text-white/40 text-[10px] font-mono border border-white/5">
                          {images.length} {images.length === 1 ? 'IMAGE' : 'IMAGES'}
                        </span>
                      </div>
                      <div className="grid gap-4">
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

      {!editingImage && (
        <footer className="relative z-10 py-6 text-center">
          <a
            href="https://github.com/jigonzalez930209/image-utilities"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white/30 hover:text-white/70 text-xs font-medium transition-colors duration-200 group"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>jigonzalez930209/image-utilities</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
          </a>
        </footer>
      )}
    </div>
  );
};

export default App;
