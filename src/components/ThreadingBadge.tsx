import React, { useState } from 'react';
import { Cpu } from 'lucide-react';
import { cn } from '../lib/utils';

interface ThreadingInfo {
  isolated: boolean;
  threads: number;
  hasSharedArrayBuffer: boolean;
  hardwareConcurrency: number;
  origin: string;
}

function getThreadingInfo(): ThreadingInfo {
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const isolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
  const threads = isolated ? (navigator.hardwareConcurrency ?? 4) : 1;
  
  // Debug log
  console.log('[ThreadingBadge]', {
    crossOriginIsolated: crossOriginIsolated,
    hasSharedArrayBuffer,
    hardwareConcurrency: navigator.hardwareConcurrency,
    origin: window.location.origin
  });
  
  return { 
    isolated, 
    threads,
    hasSharedArrayBuffer,
    hardwareConcurrency: navigator.hardwareConcurrency ?? 0,
    origin: window.location.origin
  };
}

export const ThreadingBadge: React.FC = () => {
  const [info] = useState<ThreadingInfo>(getThreadingInfo);

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold',
        'bg-black/80 backdrop-blur-sm',
        info.isolated
          ? 'border border-emerald-500/30 text-emerald-400'
          : 'border border-amber-500/30 text-amber-400'
      )}
    >
      <Cpu size={12} />
      {info.isolated ? `${info.threads}T` : '1T'} | SAB:{info.hasSharedArrayBuffer ? '✓' : '✗'} HC:{info.hardwareConcurrency}
    </div>
  );
};
