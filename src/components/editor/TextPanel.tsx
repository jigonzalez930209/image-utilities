import React from 'react';
import { Type } from 'lucide-react';

interface TextPanelProps {
  text: string;
  setText: (text: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  color: string;
  setColor: (color: string) => void;
}

export const TextPanel: React.FC<TextPanelProps> = ({
  text,
  setText,
  fontSize,
  setFontSize,
  color,
  setColor,
}) => (
  <div className="space-y-4">
    <label className="text-sm font-medium text-white/60 flex items-center gap-2">
      <Type size={16} /> Text Overlay
    </label>

    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-mono text-white/40">TEXT</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text"
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-brand"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-mono text-white/40">
          <span>FONT SIZE</span>
          <span>{fontSize}px</span>
        </div>
        <input
          type="range"
          value={fontSize}
          min="12"
          max="72"
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-full accent-brand h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-mono text-white/40">COLOR</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-full h-10 bg-white/10 border border-white/20 rounded-lg cursor-pointer"
        />
      </div>
    </div>
  </div>
);
