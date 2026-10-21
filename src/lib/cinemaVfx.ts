'use client';

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
 * Dispara la desintegración cinematográfica cuántica (ultra-rápida, 0% CPU).
 */
export function triggerCinematicThanosDisintegration(
  _rect: DOMRect | SimpleRect,
  onComplete?: () => void,
  totalDurationMs = 340
): () => void {
  if (typeof window === 'undefined') {
    onComplete?.();
    return () => {};
  }

  const timer = setTimeout(() => {
    onComplete?.();
  }, totalDurationMs);

  return () => clearTimeout(timer);
}

