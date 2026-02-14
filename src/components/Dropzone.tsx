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
    }
  }, [onFilesDropped]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.label
        htmlFor="file-upload"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300",
          "bg-white/5 backdrop-blur-sm border-white/20 hover:border-brand/50 hover:bg-white/10",
          isDragActive && "border-brand bg-brand/10 scale-[1.02]"
        )}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: isDragActive ? -10 : 0 }}
            className="mb-4 text-white/60"
          >
            {isDragActive ? <ImageIcon size={48} className="text-brand" /> : <Upload size={48} />}
          </motion.div>
          <p className="mb-2 text-xl font-semibold text-white">
            {isDragActive ? "Sueltalo aquí" : "Arrastra tus imágenes aquí"}
          </p>
          <p className="text-sm text-white/40">
            PNG, JPG, WebP o HEIC (Max. 10MB)
          </p>
        </div>
        <input id="file-upload" type="file" className="hidden" multiple accept="image/*" onChange={handleChange} />
      </motion.label>
    </div>
  );
};
