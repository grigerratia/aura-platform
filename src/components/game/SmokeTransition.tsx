'use client';

import { ReactNode, useRef, useEffect } from 'react';
import { motion, AnimatePresence, usePresence } from 'framer-motion';
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
  const [isPresent] = usePresence();
  const ref = useRef<HTMLDivElement>(null);
  const { playDustSnap } = useGameSound();

  // Al desmontarse el modo anterior, emitir una suave ráfaga de polvo/ceniza
  useEffect(() => {
    if (!isPresent && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Emitir polvo en el área superior/central visible para no saturar
        emitThanosDust(
          {
            left: rect.left,
            top: Math.max(rect.top, 70),
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
        y: 10,
        scale: 0.99,
        filter: 'blur(6px)',
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: {
          duration: 0.24,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
      exit={{
        opacity: 0,
        y: -8,
        scale: 1.01,
        filter: 'blur(6px)',
        transition: {
          duration: 0.18,
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
 * Envolvente de alta velocidad (60 FPS) para cambiar entre Radar, Relámpago, Manadas y Pases.
 * Garantiza texto nítido, sin deformaciones y con partículas sutiles de juego.
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
