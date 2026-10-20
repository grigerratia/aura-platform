'use client';

import { ReactNode, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useIsPresent } from 'framer-motion';
import { emitThanosDust, ThanosIntensity } from './AshParticleOverlay';
import { useGameSound } from '@/hooks/useGameSound';

interface ThanosItemProps {
  children: ReactNode;
  intensity?: ThanosIntensity;
  className?: string;
  reconstructDust?: boolean;
}

function ThanosItem({
  children,
  intensity = 'fast',
  className = '',
  reconstructDust = false,
}: ThanosItemProps) {
  const isPresent = useIsPresent();
  const ref = useRef<HTMLDivElement>(null);
  const { playDustSnap } = useGameSound();
  const isEpic = intensity === 'epic';
  const duration = isEpic ? 0.75 : 0.38;

  // Al desmontarse (disintegrate)
  useEffect(() => {
    if (!isPresent && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        emitThanosDust(rect, 'disintegrate', intensity);
        playDustSnap(intensity);
      }
    }
  }, [isPresent, intensity, playDustSnap]);

  // Al montarse (reconstruct), si está habilitado
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
      initial={{
        opacity: 0,
        scale: 0.98,
        y: 8,
        filter: 'blur(4px)',
      }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: {
          duration: 0.25,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
      exit={{
        opacity: 0,
        scale: isEpic ? 1.03 : 1.01,
        y: isEpic ? -8 : -4,
        filter: 'blur(6px)',
        transition: {
          duration: duration * 0.5,
          ease: [0.35, 0.05, 0.2, 1],
        },
      }}
      className={`will-change-[transform,opacity] ${className}`}
    >
      {children}
    </motion.div>
  );
}

interface ThanosTransitionProps {
  children: ReactNode;
  elementKey: string | number;
  intensity?: ThanosIntensity;
  className?: string;
  mode?: 'wait' | 'sync' | 'popLayout';
  reconstructDust?: boolean;
}

/**
 * ThanosTransition
 * Envolvente para Framer Motion con el chasquido de desintegración y reconstrucción.
 * Reemplaza o complementa transiciones con efecto de polvo y partículas en canvas.
 */
export default function ThanosTransition({
  children,
  elementKey,
  intensity = 'fast',
  className = '',
  mode = 'wait',
  reconstructDust = true,
}: ThanosTransitionProps) {
  return (
    <AnimatePresence mode={mode}>
      <ThanosItem
        key={elementKey}
        intensity={intensity}
        className={className}
        reconstructDust={reconstructDust}
      >
        {children}
      </ThanosItem>
    </AnimatePresence>
  );
}

