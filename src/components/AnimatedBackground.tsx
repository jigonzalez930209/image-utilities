import React from 'react';

export const AnimatedBackground: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl opacity-[0.03] rotate-12">
        <svg viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          
          <circle 
            cx="128" cy="128" r="120" 
            stroke="url(#bgGradient)" 
            strokeWidth="2" 
            strokeDasharray="20 10" 
          >
            <animateTransform 
              attributeName="transform" 
              type="rotate" 
              from="0 128 128" 
              to="360 128 128" 
              dur="60s" 
              repeatCount="indefinite" 
            />
          </circle>
          
          <rect 
            x="58" y="58" width="140" height="140" rx="34" 
            stroke="url(#bgGradient)" 
            strokeWidth="2"
          >
            <animate 
              attributeName="opacity" 
              values="0.5;0.8;0.5" 
              dur="10s" 
              repeatCount="indefinite" 
            />
          </rect>

          <path 
            d="M128 108C139.046 108 148 116.954 148 128C148 139.046 139.046 148 128 148C116.954 148 108 139.046 108 128C108 116.954 116.954 108 128 108Z" 
            fill="url(#bgGradient)"
          >
            <animate 
              attributeName="opacity" 
              values="0.3;0.6;0.3" 
              dur="8s" 
              repeatCount="indefinite" 
            />
          </path>
        </svg>
      </div>
    </div>
  );
};
