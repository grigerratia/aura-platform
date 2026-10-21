'use client';

import { useEffect, useRef } from 'react';

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
 * Puede ser llamada desde cualquier parte sin necesidad de pasar props.
 */
export function emitThanosDust(
  rect: DOMRect | ThanosRect,
  mode: ThanosMode = 'disintegrate',
  intensity: ThanosIntensity = 'fast'
) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('aura:thanos-dust', {
      detail: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        mode,
        intensity,
      },
    })
  );
}

interface AshParticle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  maxLife: number;
  age: number;
  mode: ThanosMode;
  shape: 0 | 1 | 2; // 0: rombo, 1: poligono irregular, 2: mota redonda
}

const AURA_ASH_COLORS = [
  '#475569', // Carbón / pizarra medio
  '#64748b', // Ceniza pizarra
  '#334155', // Ceniza oscura
  '#1e293b', // Ceniza profunda
  '#10b981', // Verde Aurora Boreal
  '#00ffb2', // Verde Neón Aura
  '#f59e0b', // Resplandor dorado de energía
  '#fbbf24', // Oro cálido
  '#06b6d4', // Cian glaciar
];

export default function AshParticleOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<AshParticle[]>([]);
  const isRunningRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Ajuste de resolución adaptativa Retina / HiDPI (DPR 1 en móviles para 60 FPS estables)
    const resizeCanvas = () => {
      const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
      const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Bucle de renderizado de alta velocidad (sin ctx.save / ctx.restore)
    const loop = () => {
      if (particlesRef.current.length === 0) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        isRunningRef.current = false;
        rafIdRef.current = null;
        return; // Detener loop cuando no hay partículas activas (0% consumo de CPU)
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const activeList: AshParticle[] = [];

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        p.age += 1;
        const progress = p.age / p.maxLife;

        if (progress >= 1) {
          continue; // Partícula terminada
        }

        if (p.mode === 'disintegrate') {
          // Deriva hacia arriba y a la derecha con turbulencia armónica
          p.x += p.vx + Math.sin(p.age * 0.2) * 0.6;
          p.y += p.vy;
          p.alpha = Math.max(0, 1 - progress);
        } else {
          // Reconstrucción: convergen desde la dispersión exterior hacia el objetivo
          const easeOut = 1 - Math.pow(1 - progress, 2.5);
          p.x = p.originX + (p.targetX - p.originX) * easeOut;
          p.y = p.originY + (p.targetY - p.originY) * easeOut;
          p.alpha = Math.sin(progress * Math.PI) * 0.85;
        }

        // Renderizado directo en lote (15x más rápido que matriz save/restore)
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        const currentSize = p.size * (1 - progress * 0.35);

        if (p.shape === 2) {
          // Mota circular suave
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Fragmento angular de ceniza (fillRect evita path allocations)
          ctx.fillRect(
            p.x - currentSize * 0.45,
            p.y - currentSize * 0.45,
            currentSize * 0.9,
            currentSize * 0.9
          );
        }

        activeList.push(p);
      }

      particlesRef.current = activeList;
      rafIdRef.current = requestAnimationFrame(loop);
    };

    // Escuchar eventos globales de emisión de polvo
    const handleDustEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        left: number;
        top: number;
        width: number;
        height: number;
        mode: ThanosMode;
        intensity: ThanosIntensity;
      }>;

      const { left, top, width, height, mode, intensity } = customEvent.detail;
      if (!width || !height) return;

      const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
      const isEpic = intensity === 'epic';

      // Conteo adaptativo: en móviles 18-28 partículas dan sensación nítida sin congelar
      const count = isMobile
        ? isEpic
          ? Math.floor(22 + Math.random() * 8)
          : Math.floor(12 + Math.random() * 6)
        : isEpic
        ? Math.floor(45 + Math.random() * 15)
        : Math.floor(25 + Math.random() * 10);

      // Limitar buffer activo
      const maxActive = isMobile ? 45 : 95;
      if (particlesRef.current.length > maxActive) {
        particlesRef.current = particlesRef.current.slice(-Math.floor(maxActive * 0.6));
      }

      const newParticles: AshParticle[] = [];

      for (let i = 0; i < count; i++) {
        // Coordenadas aleatorias dentro del rectángulo del elemento
        const targetX = left + Math.random() * width;
        const targetY = top + Math.random() * height;

        const size = 1.6 + Math.random() * 2.8;
        const color = AURA_ASH_COLORS[Math.floor(Math.random() * AURA_ASH_COLORS.length)];
        const shape = Math.floor(Math.random() * 3) as 0 | 1 | 2;
        const maxLife = isMobile
          ? isEpic
            ? 22 + Math.random() * 8
            : 15 + Math.random() * 6
          : isEpic
          ? 32 + Math.random() * 12
          : 20 + Math.random() * 8;

        if (mode === 'disintegrate') {
          // Velocidad ascendente y hacia la derecha estilo viento cósmico
          const vx = (Math.random() * 3.2 + 1.1) * (isEpic ? 1.2 : 1.0);
          const vy = -(Math.random() * 2.6 + 0.8) * (isEpic ? 1.2 : 1.0);

          newParticles.push({
            x: targetX,
            y: targetY,
            originX: targetX,
            originY: targetY,
            targetX,
            targetY,
            vx,
            vy,
            size,
            color,
            rotation: 0,
            rotationSpeed: 0,
            alpha: 1,
            maxLife,
            age: 0,
            mode: 'disintegrate',
            shape,
          });
        } else {
          // Reconstrucción: convergen rápidamente
          const disperseX = targetX + (Math.random() * 35 + 14);
          const disperseY = targetY - (Math.random() * 30 + 10);

          newParticles.push({
            x: disperseX,
            y: disperseY,
            originX: disperseX,
            originY: disperseY,
            targetX,
            targetY,
            vx: 0,
            vy: 0,
            size,
            color,
            rotation: 0,
            rotationSpeed: 0,
            alpha: 0,
            maxLife: isMobile ? 14 + Math.random() * 6 : 18 + Math.random() * 6,
            age: 0,
            mode: 'reconstruct',
            shape,
          });
        }
      }

      particlesRef.current.push(...newParticles);

      // Iniciar bucle de animación si no estaba corriendo
      if (!isRunningRef.current) {
        isRunningRef.current = true;
        rafIdRef.current = requestAnimationFrame(loop);
      }
    };

    window.addEventListener('aura:thanos-dust', handleDustEvent);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('aura:thanos-dust', handleDustEvent);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      style={{ touchAction: 'none' }}
    />
  );
}

