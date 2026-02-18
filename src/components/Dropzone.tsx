import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface DropzoneProps {
  onFilesDropped: (files: File[]) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFilesDropped }) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) onFilesDropped(files);
  }, [onFilesDropped]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) onFilesDropped(files);
      // Reset the input value so the same file can be selected again
      e.target.value = '';
    }
  }, [onFilesDropped]);

  return (
    <div className="w-full">
      <motion.label
        htmlFor="file-upload"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative flex items-center justify-center w-full h-72 rounded-[40px] cursor-pointer transition-all duration-300",
          "bg-white/2 border border-white/5 hover:bg-white/4",
          isDragActive && "bg-brand/5 border-brand/20"
        )}
      >
        <div className={cn(
          "w-full max-w-lg mx-auto h-48 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-300",
          isDragActive ? "border-brand bg-brand/5 scale-105" : "border-white/10"
        )}>
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: isDragActive ? -10 : 0 }}
            className="mb-4 text-white/40"
          >
            {isDragActive ? <ImageIcon size={48} className="text-brand" /> : <Upload size={48} />}
          </motion.div>
          <p className="text-2xl font-black text-white mb-2 tracking-tight">
            {isDragActive ? "Drop here" : "Drag your images here"}
          </p>
          <p className="text-sm text-white/30 font-bold tracking-widest uppercase">
            PNG, JPG, WebP or HEIC
          </p>
        </div>
        <input id="file-upload" type="file" className="hidden" multiple accept="image/*" onChange={handleChange} />
      </motion.label>
    </div>
  );
};
