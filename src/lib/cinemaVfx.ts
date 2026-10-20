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
 * Dispara la desintegración cinematográfica en 3 oleadas (0ms, 180ms, 360ms)
 * simulando un frente de erosión que cruza desde la esquina inferior-izquierda hacia la superior-derecha.
 */
export function triggerCinematicThanosDisintegration(
  rect: DOMRect | SimpleRect,
  onComplete?: () => void,
  totalDurationMs = 960
): () => void {
  if (typeof window === 'undefined' || !rect || rect.width <= 0 || rect.height <= 0) {
    onComplete?.();
    return () => {};
  }

  const timeouts: ReturnType<typeof setTimeout>[] = [];

  // OLEADA 1 (0ms): Borde inferior-izquierdo comienza a convertirse en ceniza
  emitThanosDust(
    {
      left: rect.left,
      top: rect.top + rect.height * 0.45,
      width: rect.width * 0.55,
      height: rect.height * 0.55,
    },
    'disintegrate',
    'epic'
  );

  // OLEADA 2 (180ms): El frente de erosión cruza el corazón del elemento
  const t1 = setTimeout(() => {
    emitThanosDust(
      {
        left: rect.left + rect.width * 0.15,
        top: rect.top + rect.height * 0.15,
        width: rect.width * 0.7,
        height: rect.height * 0.7,
      },
      'disintegrate',
      'epic'
    );
  }, 180);
  timeouts.push(t1);

  // OLEADA 3 (360ms): La esquina superior-derecha se desvanece en el viento
  const t2 = setTimeout(() => {
    emitThanosDust(
      {
        left: rect.left + rect.width * 0.4,
        top: rect.top,
        width: rect.width * 0.6,
        height: rect.height * 0.55,
      },
      'disintegrate',
      'epic'
    );
  }, 360);
  timeouts.push(t2);

  // Callback final después de la estela completa
  if (onComplete) {
    const tFinal = setTimeout(() => {
      onComplete();
    }, totalDurationMs);
    timeouts.push(tFinal);
  }

  // Función de limpieza para cancelar timeouts si el componente se desmonta antes
  return () => {
    timeouts.forEach(clearTimeout);
  };
}

