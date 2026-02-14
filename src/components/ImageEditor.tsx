import React, { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { 
  Crop, 
  Sun, 
  Download, 
  Undo, 
  Scissors, 
  X,
  Layers
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ImageEditorProps {
  image: string;
  onSave: (editedBlob: Blob) => void;
  onCancel: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ image, onSave, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [isCropping, setIsCropping] = useState(true);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0,
    filters: string
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No context');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.filter = filters;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/png');
    });
  };

  const handleExport = async () => {
    if (!croppedAreaPixels) return;
    const filters = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;
    const blob = await getCroppedImg(image, croppedAreaPixels, rotation, filters);
    onSave(blob);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] flex flex-col md:flex-row h-screen">
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 bg-slate-900/50 backdrop-blur-xl border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col gap-8 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="text-brand" size={24} />
            Editor
          </h2>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tools Section */}
        <div className="flex flex-col gap-6">
          <div className="space-y-4">
            <label className="text-sm font-medium text-white/60 flex items-center gap-2">
              <Scissors size={16} /> Transformación
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setIsCropping(true)}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium",
                  isCropping ? "bg-brand border-brand text-white shadow-lg shadow-brand/20" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                )}
              >
                <Crop size={18} /> Recortar
              </button>
              <button 
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all text-sm font-medium"
              >
                <Undo className="rotate-90" size={18} /> Rotar
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <label className="text-sm font-medium text-white/60 flex items-center gap-2">
              <Sun size={16} /> Ajustes
            </label>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-mono text-white/40">
                  <span>BRIGHTNESS</span>
                  <span>{brightness}%</span>
                </div>
                <input 
                  type="range" value={brightness} min="0" max="200"
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-mono text-white/40">
                  <span>CONTRAST</span>
                  <span>{contrast}%</span>
                </div>
                <input 
                  type="range" value={contrast} min="0" max="200"
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-mono text-white/40">
                  <span>SATURATION</span>
                  <span>{saturate}%</span>
                </div>
                <input 
                  type="range" value={saturate} min="0" max="200"
                  onChange={(e) => setSaturate(Number(e.target.value))}
                  className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 flex flex-col gap-3">
          <button 
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-3 p-4 bg-brand hover:bg-brand-accent text-white rounded-2xl font-bold shadow-xl shadow-brand/30 transition-all hover:-translate-y-1 active:translate-y-0"
          >
            <Download size={20} /> Guardar Cambios
          </button>
          <p className="text-[10px] text-center text-white/20 font-medium tracking-wider uppercase">
            Procesado 100% en local
          </p>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 bg-black/40 relative overflow-hidden flex items-center justify-center p-4 md:p-12">
        <div className="w-full h-full relative rounded-3xl overflow-hidden glass border border-white/5">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={undefined}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            style={{
              containerStyle: { backgroundColor: 'transparent' },
              mediaStyle: {
                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`,
              }
            }}
          />
        </div>
        
        {/* Zoom Controls Overlay */}
        <div className="absolute bottom-10 left-12 right-12 md:left-auto md:right-24 flex items-center gap-6 bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
          <Sun size={18} className="text-white/40" />
          <input 
            type="range" value={zoom} min={1} max={3} step={0.1}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-32 md:w-48 accent-brand h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs font-bold text-white/60 min-w-[3ch]">{zoom.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
};
