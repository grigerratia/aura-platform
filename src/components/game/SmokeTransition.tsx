'use client';

import { ReactNode, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useIsPresent } from 'framer-motion';
import { emitThanosDust } from '../vfx/AshParticleOverlay';
import { useGameSound } from '@/hooks/useGameSound';

interface Props {
  children: ReactNode;
  modeKey: string;
  className?: string;
}

function ModeContentWrapper({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const isPresent = useIsPresent();
  const ref = useRef<HTMLDivElement>(null);
  const { playDustSnap } = useGameSound();

  // Al desmontarse el modo anterior, emitir una ráfaga de polvo/ceniza de Thanos
  useEffect(() => {
    if (!isPresent && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        emitThanosDust(
          {
            left: rect.left,
            top: Math.max(rect.top, 60),
            width: rect.width,
            height: Math.min(rect.height, 350),
          },
          'disintegrate',
          'fast'
        );
        playDustSnap('fast');
      }
    }
  }, [isPresent, playDustSnap]);

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        y: 8,
        scale: 0.99,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 0.22,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
      exit={{
        opacity: 0,
        y: -8,
        scale: 1.01,
        transition: {
          duration: 0.16,
          ease: [0.4, 0, 0.2, 1],
        },
      }}
      className={`w-full ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * SmokeTransition
 * Envolvente ultra-rápida (60 FPS) para cambiar entre Radar, Relámpago, Manadas y Pases.
 * Utiliza useIsPresent para garantizar que las vistas NUNCA se queden bloqueadas o invisibles.
 */
export default function SmokeTransition({
  children,
  modeKey,
  className = '',
}: Props) {
  return (
    <AnimatePresence mode="wait">
      <ModeContentWrapper key={modeKey} className={className}>
        {children}
      </ModeContentWrapper>
    </AnimatePresence>
  );
}
