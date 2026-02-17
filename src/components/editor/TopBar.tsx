import React from 'react';
import { ArrowLeft, Undo, Redo, RotateCcw, Download, Copy } from 'lucide-react';

// Sidebar.tsx imports { cn } from '../../utils';
// ImageEditor is in src/components.
// TopBar is in src/components/editor.
// So ../../utils seems correct if utils.ts is in src/utils.ts?
// ImageCard is in src/components/ImageCard.tsx, imports from ../lib/utils.
// Sidebar is in src/components/editor/Sidebar.tsx, imports from ../../utils.
// Let's check where `cn` is.
// Sidebar import: `import { cn } from '../../utils';`
// ImageCard import: `import { formatBytes, cn } from '../lib/utils';`
// This suggests inconsistency or utils.ts exists in both? Or I should check.
// I'll check generic location first. `src/lib/utils.ts` is standard.
// If Sidebar uses `../../utils`, that points to `src/utils.ts`.
// I'll assume `src/lib/utils.ts` is the robust one and import from there relative to `src/components/editor` -> `../../lib/utils`.

interface TopBarProps {
  onCancel: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onCopy: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isMobile?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onCancel,
  onSave,
  onUndo,
  onRedo,
  onReset,
  onCopy,
  canUndo,
  canRedo,
}) => {
  return (
    <div className="w-full flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-50">
      <div className="flex items-center gap-4">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
          title="Close Editor"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-white hidden md:block">Image Editor</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 flex items-center gap-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Undo"
        >
          <Undo size={18} />
          <span className="hidden md:inline text-sm font-medium">Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 flex items-center gap-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Redo"
        >
          <Redo size={18} />
          <span className="hidden md:inline text-sm font-medium">Redo</span>
        </button>

        <button
          onClick={onReset}
          className="p-2 flex items-center gap-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
          title="Reset All"
        >
          <RotateCcw size={18} />
          <span className="hidden md:inline text-sm font-medium">Reset</span>
        </button>

        <button
          onClick={onCopy}
          className="p-2 flex items-center gap-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
          title="Copy to Clipboard"
        >
          <Copy size={18} />
          <span className="hidden md:inline text-sm font-medium">Copy</span>
        </button>

        <div className="h-6 w-px bg-white/10 mx-2" />

        <button
          onClick={onSave}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-accent text-white rounded-lg font-medium shadow-lg shadow-brand/20 transition-all hover:scale-105 active:scale-95"
          title="Save Image"
        >
          <Download size={18} />
          <span className="hidden md:inline">Save</span>
        </button>
      </div>
    </div>
  );
};
