'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export type ThanosIntensity = 'fast' | 'epic';

interface ThanosCardProps {
  children: ReactNode;
  intensity?: ThanosIntensity;
  className?: string;
  reconstructDust?: boolean;
}

/**
 * ThanosCard
 * Envolvente para tarjetas de producto en cuadrícula (Radar, Relámpago, etc.).
 * Transiciones GPU ultra-livianas (clipPath, opacity y scale) sin sobrecarga de partículas.
 */
export default function ThanosCard({
  children,
  intensity = 'fast',
  className = '',
}: ThanosCardProps) {
  const isEpic = intensity === 'epic';

  return (
    <motion.div
      layout
      initial={{
        opacity: 0,
        scale: 0.96,
        y: 8,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        filter: 'none',
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        transition: {
          duration: 0.22,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
      exit={{
        opacity: 0,
        scale: isEpic ? 1.04 : 1.01,
        y: isEpic ? -8 : -4,
        filter: isEpic ? 'brightness(1.35) contrast(1.15) blur(2px)' : 'brightness(1.25) blur(1px)',
        clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)',
        transition: {
          duration: isEpic ? 0.32 : 0.22,
          ease: [0.35, 0.05, 0.2, 1],
        },
      }}
      className={`will-change-[transform,opacity] ${className}`}
    >
      {children}
    </motion.div>
  );
}

