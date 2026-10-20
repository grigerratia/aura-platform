'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Compass, Zap, Users, Ticket } from 'lucide-react';
import { useGameSound } from '@/hooks/useGameSound';
import { GameMode } from './BottomDock';
import {
  CINEMATIC_EASE,
  CINEMATIC_EXIT_EASE,
  triggerCinematicThanosDisintegration,
} from '@/lib/cinemaVfx';

interface Props {
  onSelectMode: (mode: GameMode) => void;
}

interface PortalOption {
  id: GameMode;
  title: string;
  subtitle: string;
  icon: any;
  accentHex: string;
  iconColor: string;
  ambientGlow: string;
  topHighlight: string;
}

const PORTAL_OPTIONS: PortalOption[] = [
  {
    id: 'radar',
    title: 'Radar',
    subtitle: 'Explorar ciudad',
    icon: Compass,
    accentHex: '#10b981',
    iconColor: 'text-emerald-300',
    ambientGlow: 'radial-gradient(120px circle at 50% 0%, rgba(16, 185, 129, 0.16), transparent 75%)',
    topHighlight: 'from-transparent via-emerald-400/40 to-transparent',
  },
  {
    id: 'relampago',
    title: 'Relámpago',
    subtitle: 'Ofertas fugaces',
    icon: Zap,
    accentHex: '#f43f5e',
    iconColor: 'text-rose-300',
    ambientGlow: 'radial-gradient(120px circle at 50% 0%, rgba(244, 63, 94, 0.16), transparent 75%)',
    topHighlight: 'from-transparent via-rose-400/40 to-transparent',
  },
  {
    id: 'manadas',
    title: 'Manada',
    subtitle: 'Compra grupal',
    icon: Users,
    accentHex: '#8b5cf6',
    iconColor: 'text-violet-300',
    ambientGlow: 'radial-gradient(120px circle at 50% 0%, rgba(139, 92, 246, 0.16), transparent 75%)',
    topHighlight: 'from-transparent via-violet-400/40 to-transparent',
  },
  {
    id: 'pases',
    title: 'Pases',
    subtitle: 'Billetera y QR',
    icon: Ticket,
    accentHex: '#06b6d4',
    iconColor: 'text-cyan-300',
    ambientGlow: 'radial-gradient(120px circle at 50% 0%, rgba(6, 182, 212, 0.16), transparent 75%)',
    topHighlight: 'from-transparent via-cyan-400/40 to-transparent',
  },
];

export default function WelcomePortal({ onSelectMode }: Props) {
  const { playDustSnap, playTap } = useGameSound();
  const [selectedId, setSelectedId] = useState<GameMode | null>(null);
  const [hoveredId, setHoveredId] = useState<GameMode | null>(null);
  const [isDisintegrating, setIsDisintegrating] = useState(false);
  const cleanupFnRef = useRef<(() => void) | null>(null);

  // Limpiar cualquier temporizador pendiente si el componente se desmonta
  useEffect(() => {
    return () => {
      cleanupFnRef.current?.();
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, mode: GameMode) => {
    if (isDisintegrating) return;

    playTap();
    playDustSnap('epic');
    setSelectedId(mode);
    setIsDisintegrating(true);

    const rect = e.currentTarget.getBoundingClientRect();

    // Disparar las 3 oleadas cinematográficas de ceniza cósmica
    cleanupFnRef.current = triggerCinematicThanosDisintegration(
      rect,
      () => {
        onSelectMode(mode);
      },
      960
    );
  };

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-5 py-12 select-none overflow-hidden">
      {/* FILTRO SVG INVISIBLE PARA FRAGMENTACIÓN ORGÁNICA TIPO ARENA/CENIZA */}
      <svg className="pointer-events-none absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="aura-cinema-erosion" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.065"
              numOctaves="3"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="24"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* HALO ATMOSFÉRICO DE FONDO (Se apaga suavemente durante la desintegración) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isDisintegrating ? 0 : 0.65 }}
        transition={{ duration: isDisintegrating ? 0.8 : 1.4, ease: CINEMATIC_EASE }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="w-[340px] sm:w-[560px] h-[240px] sm:h-[320px] rounded-full bg-gradient-to-tr from-emerald-950/30 via-cyan-950/20 to-indigo-950/30 blur-[110px]" />
      </motion.div>

      <div className="relative z-10 w-full max-w-2xl mx-auto space-y-12 sm:space-y-16">
        
        {/* 1. CABECERA MONUMENTAL Y ELEGANTE */}
        <motion.div
          initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
          animate={
            isDisintegrating
              ? {
                  opacity: 0,
                  y: -14,
                  filter: 'blur(10px)',
                  transition: { duration: 0.65, ease: CINEMATIC_EASE },
                }
              : {
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  transition: { duration: 1.05, ease: CINEMATIC_EASE },
                }
          }
          className="text-center space-y-3"
        >
          <span className="inline-block text-[10px] sm:text-xs uppercase tracking-[0.38em] text-emerald-300/60 font-light">
            Ecosistema Comercial
          </span>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extralight tracking-tight bg-gradient-to-b from-slate-100 via-slate-200 to-slate-400/80 bg-clip-text text-transparent">
            Bienvenido a{' '}
            <span className="font-semibold bg-gradient-to-r from-emerald-200 via-[#00ffb2] to-cyan-200 bg-clip-text text-transparent">
              Aura
            </span>
          </h1>
        </motion.div>

        {/* 2. LOS CUATRO MONOLITOS (Sin bordes duros, pura luz y desintegración diagonal) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 w-full">
          {PORTAL_OPTIONS.map((opt, index) => {
            const Icon = opt.icon;
            const isTarget = selectedId === opt.id;
            const isHovered = hoveredId === opt.id;

            return (
              <motion.button
                key={opt.id}
                type="button"
                onMouseEnter={() => !isDisintegrating && setHoveredId(opt.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => handleClick(e, opt.id)}
                initial={{
                  opacity: 0,
                  y: 20,
                  filter: 'blur(10px)',
                }}
                animate={
                  isDisintegrating
                    ? isTarget
                      ? {
                          // EL ELEGIDO: Se ilumina y fragmenta sus bordes con el filtro SVG mientras la máscara CSS barre en diagonal
                          opacity: [1, 0.92, 0],
                          y: -8,
                          filter: 'url(#aura-cinema-erosion) brightness(1.3) blur(1.5px)',
                          transition: {
                            duration: 0.88,
                            ease: CINEMATIC_EXIT_EASE,
                          },
                        }
                      : {
                          // LOS NO ELEGIDOS: Se desvanecen silenciosamente en niebla de fondo
                          opacity: 0,
                          y: 6,
                          filter: 'blur(12px)',
                          transition: {
                            duration: 0.5,
                            ease: CINEMATIC_EASE,
                          },
                        }
                    : {
                        // ENTRADA CINEMATOGRÁFICA INICIAL
                        opacity: 1,
                        y: 0,
                        filter: 'blur(0px)',
                        transition: {
                          duration: 0.9,
                          delay: 0.12 * (index + 1),
                          ease: CINEMATIC_EASE,
                        },
                      }
                }
                className={`relative cursor-pointer group overflow-hidden rounded-2xl bg-[#050b16]/80 backdrop-blur-xl p-6 sm:p-7 flex flex-col items-center justify-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.65)] outline-none aura-cinema-mask ${
                  isDisintegrating && isTarget ? 'aura-cinema-mask-exit' : ''
                }`}
              >
                {/* Reflejo especular superior (1px de luz de alta gama) */}
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r ${opt.topHighlight} opacity-40 group-hover:opacity-100 transition-opacity duration-700`}
                />

                {/* Luz ambiental interna que despierta suavemente al pasar o tocar */}
                <div
                  className="pointer-events-none absolute inset-0 transition-opacity duration-700"
                  style={{
                    background: opt.ambientGlow,
                    opacity: isHovered || isTarget ? 1 : 0.28,
                  }}
                />

                {/* Halo sutil detrás del ícono */}
                <div className="relative flex items-center justify-center">
                  <div
                    className="pointer-events-none absolute w-10 h-10 rounded-full blur-xl transition-opacity duration-700"
                    style={{
                      backgroundColor: opt.accentHex,
                      opacity: isHovered || isTarget ? 0.35 : 0.12,
                    }}
                  />
                  <Icon
                    size={28}
                    className={`relative z-10 stroke-[1.5] transition-colors duration-500 ${opt.iconColor}`}
                  />
                </div>

                {/* Textos limpios y serenos */}
                <div className="relative z-10 text-center space-y-1">
                  <span className="block text-sm font-normal text-slate-200 tracking-wide">
                    {opt.title}
                  </span>
                  <span className="block text-[11px] font-light text-slate-500 tracking-wider group-hover:text-slate-400 transition-colors duration-500">
                    {opt.subtitle}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* 3. PIE DE PÁGINA SERENO */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isDisintegrating ? 0 : 1 }}
          transition={{
            duration: isDisintegrating ? 0.4 : 1.1,
            delay: isDisintegrating ? 0 : 0.75,
            ease: CINEMATIC_EASE,
          }}
          className="text-center pt-2"
        >
          <p className="text-xs font-light text-slate-500 tracking-[0.28em] uppercase">
            Elige cómo ahorrar hoy
          </p>
        </motion.div>

      </div>
    </div>
  );
}

}