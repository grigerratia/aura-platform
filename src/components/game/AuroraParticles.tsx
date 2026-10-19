'use client';

import { useEffect, useRef } from 'react';

interface Props {
  className?: string;
  count?: number;
  burstTrigger?: number; // Cada vez que este número cambie, dispara una ráfaga de celebración
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  maxAlpha: number;
  color: string;
  decay?: number;
}

const AURORA_COLORS = [
  '#00ffb2', // Verde Aurora Neón
  '#10b981', // Esmeralda Boreal
  '#38bdf8', // Azul Glaciar
  '#c084fc', // Violeta Boreal
  '#ffffff', // Destello Blanco
];

export default function AuroraParticles({
  className = '',
  count = 18,
  burstTrigger = 0,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const burstParticlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 300);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 120);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Inicializar partículas flotantes suaves (18)
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: -0.2 - Math.random() * 0.45,
      radius: 1 + Math.random() * 2,
      alpha: 0.1 + Math.random() * 0.6,
      maxAlpha: 0.3 + Math.random() * 0.5,
      color: AURORA_COLORS[Math.floor(Math.random() * AURORA_COLORS.length)],
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Partículas flotantes de ambiente
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Rebote / Reaparición suave
        if (p.y < -5) {
          p.y = height + 5;
          p.x = Math.random() * width;
        }
        if (p.x < -5) p.x = width + 5;
        if (p.x > width + 5) p.x = -5;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      });

      // 2. Partículas de Ráfaga / Celebración (Burst)
      if (burstParticlesRef.current.length > 0) {
        burstParticlesRef.current.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08; // Gravedad suave
          p.alpha -= p.decay || 0.02;

          if (p.alpha > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.shadowBlur = 14;
            ctx.shadowColor = p.color;
            ctx.fill();
            ctx.restore();
          }
        });

        // Limpiar partículas desvanecidas
        burstParticlesRef.current = burstParticlesRef.current.filter((p) => p.alpha > 0);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [count]);

  // Manejar trigger de celebración (Ráfaga expansiva de 35 partículas luminosas)
  useEffect(() => {
    if (!burstTrigger || burstTrigger <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const newBurst: Particle[] = Array.from({ length: 36 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      return {
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        radius: 1.5 + Math.random() * 2.5,
        alpha: 1,
        maxAlpha: 1,
        color: AURORA_COLORS[Math.floor(Math.random() * AURORA_COLORS.length)],
        decay: 0.015 + Math.random() * 0.02,
      };
    });

    burstParticlesRef.current = [...burstParticlesRef.current, ...newBurst];
  }, [burstTrigger]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-10 ${className}`}
    />
  );
}

