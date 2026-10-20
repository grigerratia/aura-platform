'use client';

import { ReactNode } from 'react';
import ThanosTransition from '../vfx/ThanosTransition';
import { ThanosIntensity } from '../vfx/AshParticleOverlay';

interface Props {
  children: ReactNode;
  modeKey: string;
  className?: string;
  intensity?: ThanosIntensity;
  reconstructDust?: boolean;
}

/**
 * SmokeTransition / ThanosTransition
 * Envolvente para transiciones entre modos de juego y vistas en Aura
 * con efecto de desintegración y reconstrucción estilo chasquido de Thanos.
 */
export default function SmokeTransition({
  children,
  modeKey,
  className = '',
  intensity = 'fast',
  reconstructDust = true,
}: Props) {
  return (
    <ThanosTransition
      elementKey={modeKey}
      className={className}
      intensity={intensity}
      reconstructDust={reconstructDust}
    >
      {children}
    </ThanosTransition>
  );
}
