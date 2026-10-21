'use client';

import { emitThanosDust } from '@/components/vfx/AshParticleOverlay';

/**
 * Curvas de aceleración cinematográficas para Aura
 * Inspiradas en transiciones de videojuegos de alta gama (largas y suaves, sin rebote)
 */
export const CINEMATIC_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const CINEMATIC_EXIT_EASE: [number, number, number, number] = [0.32, 0.04, 0.24, 1];

export interface SimpleRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Dispara la desintegración cinematográfica optimizada para 60 FPS en móviles y escritorio.
 * Genera una estela de partículas de ceniza sin saturar el bus del navegador.
 */
export function triggerCinematicThanosDisintegration(
  rect: DOMRect | SimpleRect,
  onComplete?: () => void,
  totalDurationMs?: number
): () => void {
  if (typeof window === 'undefined' || !rect || rect.width <= 0 || rect.height <= 0) {
    onComplete?.();
    return () => {};
  }

  const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
  const finalDuration = totalDurationMs ?? (isMobile ? 520 : 580);
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  // OLEADA 1 (0ms): Núcleo principal de dispersión de ceniza cósmica
  emitThanosDust(
    {
      left: rect.left,
      top: rect.top + rect.height * 0.2,
      width: rect.width * 0.85,
      height: rect.height * 0.8,
    },
    'disintegrate',
    isMobile ? 'fast' : 'epic'
  );

  // OLEADA 2 (120ms): Estela diagonal ascendente
  const t1 = setTimeout(() => {
    emitThanosDust(
      {
        left: rect.left + rect.width * 0.35,
        top: rect.top,
        width: rect.width * 0.65,
        height: rect.height * 0.65,
      },
      'disintegrate',
      'fast'
    );
  }, 120);
  timeouts.push(t1);

  // Callback final después de la estela
  if (onComplete) {
    const tFinal = setTimeout(() => {
      onComplete();
    }, finalDuration);
    timeouts.push(tFinal);
  }

  // Función de limpieza para cancelar timeouts si el componente se desmonta antes
  return () => {
    timeouts.forEach(clearTimeout);
  };
}

