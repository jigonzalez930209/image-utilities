import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PARTICLE_COUNT = 6;
const generateParticles = () => 
  [...Array(PARTICLE_COUNT)].map(() => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    targetX: Math.random() * 100,
    targetY: Math.random() * 100,
    duration: 20 + Math.random() * 20
  }));

export const AnimatedBackground: React.FC<{ active: boolean }> = ({ active }) => {
  const particles = React.useMemo(() => generateParticles(), []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 overflow-hidden pointer-events-none z-0"
        >
          {/* Large subtle animated logo in the background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl opacity-[0.03] rotate-12">
            <svg viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <defs>
                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              
              <motion.circle 
                cx="128" cy="128" r="120" 
                stroke="url(#bgGradient)" 
                strokeWidth="2" 
                strokeDasharray="20 10" 
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              />
              
              <motion.rect 
                x="58" y="58" width="140" height="140" rx="34" 
                stroke="url(#bgGradient)" 
                strokeWidth="2"
                animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              />

              <motion.path 
                d="M128 108C139.046 108 148 116.954 148 128C148 139.046 139.046 148 128 148C116.954 148 108 139.046 108 128C108 116.954 116.954 108 128 108Z" 
                fill="url(#bgGradient)"
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
            </svg>
          </div>

          {/* Floating particle elements inspired by the logo elements */}
          {particles.map((p, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: p.x + "%", 
                y: p.y + "%",
                opacity: 0 
              }}
              animate={{ 
                x: [null, p.targetX + "%"],
                y: [null, p.targetY + "%"],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{ 
                duration: p.duration, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="absolute w-4 h-4 rounded-full bg-brand/20 blur-xl"
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
