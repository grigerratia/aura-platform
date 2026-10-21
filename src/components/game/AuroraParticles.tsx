'use client';

import { useEffect, useRef } from 'react';

interface Props {
  className?: string;
  count?: number;
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
  sprite: HTMLCanvasElement | null;
  age: number;
}

const AURORA_DEFAULT_COLORS = [
  '#00ffb2', // Verde Neón Aura
  '#10b981', // Esmeralda Boreal
  '#38bdf8', // Azul Glaciar
  '#c084fc', // Violeta Boreal
  '#ffffff', // Destello Blanco
];

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Genera un sprite fuera de pantalla con gradiente radial difuminado ultra-suave.
 * Elimina bordes duros o círculos concéntricos y se renderiza vía GPU a 120 FPS.
 */
function createGlowSprite(colorHex: string, size = 64): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  const center = size / 2;
  const radius = size / 2;
  const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);

  grad.addColorStop(0, hexToRgba(colorHex, 0.95)); // Núcleo suave brillante
  grad.addColorStop(0.2, hexToRgba(colorHex, 0.7));  // Difusión inicial
  grad.addColorStop(0.48, hexToRgba(colorHex, 0.28)); // Halo intermedio
  grad.addColorStop(0.78, hexToRgba(colorHex, 0.08)); // Desvanecimiento etéreo
  grad.addColorStop(1, hexToRgba(colorHex, 0));       // Borde 100% transparente

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return c;
}

export default function AuroraParticles({
  className = '',
  count = 18,
  colors,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const spritesMapRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const palette = colors && colors.length > 0 ? colors : AURORA_DEFAULT_COLORS;
  // Serializar la clave de colores para evitar re-ejecuciones por referencias de array en cada render
  const colorsKey = palette.join(',');

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

    // Precargar o actualizar sprites difusos para los colores actuales
    palette.forEach((color) => {
      if (!spritesMapRef.current.has(color)) {
        spritesMapRef.current.set(color, createGlowSprite(color));
      }
    });

    const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
    const targetCount = isMobile ? Math.max(12, Math.min(count, 16)) : count;

    // PREVENCIÓN DE SALTOS: Si ya existen partículas, NO resetear posiciones
    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: targetCount }, () => {
        const chosenColor = palette[Math.floor(Math.random() * palette.length)];
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: -0.2 - Math.random() * 0.3,
          radius: 2.4 + Math.random() * 2.8, // Tamaño etéreo visible
          alpha: 0.45 + Math.random() * 0.5,
          color: chosenColor,
          sprite: spritesMapRef.current.get(chosenColor) || null,
          age: Math.random() * 300,
        };
      });
    } else {
      // Si cambian los colores, actualizar los sprites de las partículas existentes sin tocar sus coordenadas
      particlesRef.current.forEach((p) => {
        if (!palette.includes(p.color)) {
          p.color = palette[Math.floor(Math.random() * palette.length)];
        }
        p.sprite = spritesMapRef.current.get(p.color) || null;
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particlesRef.current.forEach((p) => {
        p.age += 1;

        // Movimiento armónico continuo, sin saltos
        p.x += p.vx + Math.sin(p.age * 0.02) * 0.18;
        p.y += p.vy;

        // Reaparición suave
        if (p.y < -20) {
          p.y = height + 15;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 15;
        if (p.x > width + 10) p.x = -15;

        const sprite = p.sprite || spritesMapRef.current.get(p.color);
        if (sprite) {
          const drawRadius = p.radius * 3.6;
          // Respiración lumínica sutil
          const dynamicAlpha = p.alpha * (0.85 + Math.sin(p.age * 0.035) * 0.15);
          ctx.globalAlpha = Math.max(0.15, Math.min(1, dynamicAlpha));
          ctx.drawImage(
            sprite,
            p.x - drawRadius,
            p.y - drawRadius,
            drawRadius * 2,
            drawRadius * 2
          );
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
    // colorsKey es string estricto: evita re-renderizar al actualizar estados de padres
  }, [colorsKey, count]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none w-full h-full block ${className}`}
    />
  );
}
