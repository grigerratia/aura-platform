'use client';

export type ThanosMode = 'disintegrate' | 'reconstruct';
export type ThanosIntensity = 'fast' | 'epic';

export interface ThanosRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Función global para emitir partículas de ceniza/polvo de Thanos.
 * Desactivada para garantizar 120 FPS sin consumo de CPU/GPU.
 */
export function emitThanosDust(
  _rect: DOMRect | ThanosRect,
  _mode: ThanosMode = 'disintegrate',
  _intensity: ThanosIntensity = 'fast'
) {
  // Desactivado: reemplazado por transiciones cuánticas GPU ultra-livianas
}

export default function AshParticleOverlay() {
  return null;
}

