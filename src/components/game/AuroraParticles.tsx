'use client';

import { useEffect, useRef } from 'react';

interface Props {
  className?: string;
  count?: number;
  burstTrigger?: number;
  colors?: string[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

const AURORA_DEFAULT_COLORS = [
  '#00ffb2', // Verde Neón Aura
  '#10b981', // Esmeralda Boreal
  '#38bdf8', // Azul Glaciar
  '#c084fc', // Violeta Boreal
  '#ffffff', // Destello Blanco
];

export default function AuroraParticles({
  className = '',
  count = 18,
  burstTrigger = 0,
  colors,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  const palette = colors && colors.length > 0 ? colors : AURORA_DEFAULT_COLORS;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 300);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 90);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
    const effectiveCount = isMobile ? Math.max(12, Math.min(count, 16)) : count;

    // Inicializar motas luminosas
    particlesRef.current = Array.from({ length: effectiveCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.25 - Math.random() * 0.45,
      radius: 1.5 + Math.random() * 2.2, // Más visibles
      alpha: 0.35 + Math.random() * 0.55, // Luminosas para que se noten
      color: palette[Math.floor(Math.random() * palette.length)],
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Dibujar partículas con halo doble ultra-rápido (0% sobrecarga)
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Reaparición continua
        if (p.y < -8) {
          p.y = height + 8;
          p.x = Math.random() * width;
        }
        if (p.x < -8) p.x = width + 8;
        if (p.x > width + 8) p.x = -8;

        // 1. Halo exterior difuso (brillo atmosférico)
        ctx.globalAlpha = p.alpha * 0.35;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // 2. Núcleo brillante nítido
        ctx.globalAlpha = Math.min(1, p.alpha * 1.25);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [count, palette]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none w-full h-full block ${className}`}
    />
  );
}
