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

    // Ajuste de resolución Retina / HiDPI
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Bucle de renderizado a 60 FPS
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
          p.x += p.vx + Math.sin(p.age * 0.18) * 0.7;
          p.y += p.vy;
          p.rotation += p.rotationSpeed;
          p.alpha = Math.max(0, 1 - progress);
        } else {
          // Reconstrucción: convergen desde la dispersión exterior hacia el objetivo
          const easeOut = 1 - Math.pow(1 - progress, 2.5);
          p.x = p.originX + (p.targetX - p.originX) * easeOut;
          p.y = p.originY + (p.targetY - p.originY) * easeOut;
          p.rotation += p.rotationSpeed * (1 - progress);
          // Aparecen rápido y se disuelven al llegar a la posición
          p.alpha = Math.sin(progress * Math.PI) * 0.85;
        }

        // Dibujar partícula
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        const currentSize = p.size * (1 - progress * 0.35);

        if (p.shape === 0) {
          // Rombo / Fragmento angulado
          ctx.beginPath();
          ctx.moveTo(0, -currentSize);
          ctx.lineTo(currentSize * 0.8, 0);
          ctx.lineTo(0, currentSize);
          ctx.lineTo(-currentSize * 0.8, 0);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 1) {
          // Polígono irregular de ceniza
          ctx.beginPath();
          ctx.moveTo(-currentSize * 0.6, -currentSize * 0.4);
          ctx.lineTo(currentSize * 0.7, -currentSize * 0.7);
          ctx.lineTo(currentSize * 0.5, currentSize * 0.6);
          ctx.lineTo(-currentSize * 0.8, currentSize * 0.5);
          ctx.closePath();
          ctx.fill();
        } else {
          // Mota circular suave
          ctx.beginPath();
          ctx.arc(0, 0, currentSize * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
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

      const isEpic = intensity === 'epic';
      const count = isEpic
        ? Math.floor(85 + Math.random() * 45) // 85-130 partículas
        : Math.floor(38 + Math.random() * 25); // 38-63 partículas

      // Limitar a máximo 260 partículas simultáneas para garantizar 60 FPS en móviles
      if (particlesRef.current.length > 200) {
        particlesRef.current = particlesRef.current.slice(-100);
      }

      const newParticles: AshParticle[] = [];

      for (let i = 0; i < count; i++) {
        // Coordenadas aleatorias dentro del rectángulo del elemento
        const targetX = left + Math.random() * width;
        const targetY = top + Math.random() * height;

        const size = 1.5 + Math.random() * 3.0;
        const color = AURA_ASH_COLORS[Math.floor(Math.random() * AURA_ASH_COLORS.length)];
        const shape = Math.floor(Math.random() * 3) as 0 | 1 | 2;
        const maxLife = isEpic ? 45 + Math.random() * 35 : 24 + Math.random() * 18;

        if (mode === 'disintegrate') {
          // Velocidad ascendente y hacia la derecha estilo viento cósmico
          const vx = (Math.random() * 3.5 + 1.2) * (isEpic ? 1.3 : 1.0);
          const vy = -(Math.random() * 2.8 + 0.8) * (isEpic ? 1.3 : 1.0);

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
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.25,
            alpha: 1,
            maxLife,
            age: 0,
            mode: 'disintegrate',
            shape,
          });
        } else {
          // Reconstrucción: nacen dispersas a 30-55px de distancia arriba a la derecha y convergen
          const disperseX = targetX + (Math.random() * 45 + 18);
          const disperseY = targetY - (Math.random() * 40 + 12);

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
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.15,
            alpha: 0,
            maxLife: 20 + Math.random() * 8, // ~300ms de convergencia
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

