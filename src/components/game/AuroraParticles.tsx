'use client';

interface Props {
  className?: string;
  count?: number;
  burstTrigger?: number;
  colors?: string[];
}

/**
 * AuroraParticles
 * Desactivado completamente para optimización móvil (0% CPU / 0% GPU).
 * Los fondos ahora utilizan iluminación radial CSS nativa acelerada por hardware.
 */
export default function AuroraParticles(_props: Props) {
  return null;
}
