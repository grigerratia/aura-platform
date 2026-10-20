'use client';

import { ReactNode, useRef, useEffect } from 'react';
import { motion, useIsPresent } from 'framer-motion';
import { emitThanosDust, ThanosIntensity } from './AshParticleOverlay';
import { useGameSound } from '@/hooks/useGameSound';

interface ThanosCardProps {
  children: ReactNode;
  intensity?: ThanosIntensity;
  className?: string;
  reconstructDust?: boolean;
}

/**
 * ThanosCard
 * Envolvente para tarjetas de producto en cuadrícula (Radar, Relámpago, etc.).
 * Al filtrarse o desaparecer, emite partículas de ceniza y luz de Thanos en sus coordenadas
 * sin alterar la tipografía ni la nitidez del texto mientras está visible.
 */
export default function ThanosCard({
  children,
  intensity = 'fast',
  className = '',
  reconstructDust = false,
}: ThanosCardProps) {
  const isPresent = useIsPresent();
  const ref = useRef<HTMLDivElement>(null);
  const { playDustSnap } = useGameSound();
  const isEpic = intensity === 'epic';

  // Al desmontarse (cuando el producto se filtra o desaparece)
  useEffect(() => {
    if (!isPresent && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        emitThanosDust(rect, 'disintegrate', intensity);
        playDustSnap(intensity);
      }
    }
  }, [isPresent, intensity, playDustSnap]);

  // Al montarse con efecto de convergencia de polvo (opcional)
  useEffect(() => {
    if (reconstructDust && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        emitThanosDust(rect, 'reconstruct', intensity);
      }
    }
  }, [reconstructDust, intensity]);

  return (
    <motion.div
      ref={ref}
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

