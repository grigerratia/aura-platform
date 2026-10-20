'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, Zap, Users, Ticket } from 'lucide-react';
import { emitThanosDust } from '@/components/vfx/AshParticleOverlay';
import { useGameSound } from '@/hooks/useGameSound';
import { GameMode } from './BottomDock';

interface Props {
  onSelectMode: (mode: GameMode) => void;
}

interface PortalOption {
  id: GameMode;
  title: string;
  icon: any;
  iconColor: string;
  iconDropShadow: string;
  hoverBg: string;
}

const PORTAL_OPTIONS: PortalOption[] = [
  {
    id: 'radar',
    title: 'Radar',
    icon: Compass,
    iconColor: 'text-[#00ffb2]',
    iconDropShadow: 'drop-shadow-[0_0_10px_rgba(0,255,178,0.45)]',
    hoverBg: 'hover:bg-emerald-950/25',
  },
  {
    id: 'relampago',
    title: 'Relámpago',
    icon: Zap,
    iconColor: 'text-rose-400',
    iconDropShadow: 'drop-shadow-[0_0_10px_rgba(244,63,94,0.45)]',
    hoverBg: 'hover:bg-rose-950/25',
  },
  {
    id: 'manadas',
    title: 'Manada',
    icon: Users,
    iconColor: 'text-violet-400',
    iconDropShadow: 'drop-shadow-[0_0_10px_rgba(168,85,247,0.45)]',
    hoverBg: 'hover:bg-violet-950/25',
  },
  {
    id: 'pases',
    title: 'Pases',
    icon: Ticket,
    iconColor: 'text-cyan-400',
    iconDropShadow: 'drop-shadow-[0_0_10px_rgba(6,182,212,0.45)]',
    hoverBg: 'hover:bg-cyan-950/25',
  },
];

export default function WelcomePortal({ onSelectMode }: Props) {
  const { playDustSnap, playTap } = useGameSound();
  const [selectedId, setSelectedId] = useState<GameMode | null>(null);
  const [isDisintegrating, setIsDisintegrating] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, mode: GameMode) => {
    if (isDisintegrating) return;

    playTap();
    playDustSnap('fast');
    setSelectedId(mode);
    setIsDisintegrating(true);

    // Obtener las coordenadas del cuadro pulsado para emitir polvo de Thanos
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      emitThanosDust(rect, 'disintegrate', 'epic');
    }

    // Retardo táctil de 320ms para disfrutar la desintegración visual antes de cambiar
    setTimeout(() => {
      onSelectMode(mode);
    }, 320);
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-8 select-none">
      <div className="w-full max-w-xl mx-auto space-y-10 sm:space-y-12">
        
        {/* 1. TÍTULO HEADER GRUESO CON DEGRADADOS AURORA DE LA APP (SIN BLANCO PURO) */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-emerald-300 via-[#00ffb2] via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
            Bienvenido a Aura
          </h1>
        </motion.div>

        {/* 2. LOS CUATRO CUADROS: SIN BORDES, TOTALMENTE LIMPIOS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
          {PORTAL_OPTIONS.map((opt, index) => {
            const Icon = opt.icon;
            const isTarget = selectedId === opt.id;

            return (
              <motion.button
                key={opt.id}
                type="button"
                onClick={(e) => handleClick(e, opt.id)}
                initial={{
                  opacity: 0,
                  scale: 0.92,
                  y: 16,
                }}
                animate={
                  isDisintegrating
                    ? isTarget
                      ? {
                          opacity: 0,
                          scale: 1.05,
                          y: -10,
                          filter: 'brightness(1.35) blur(3px)',
                          clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)',
                          transition: { duration: 0.3, ease: [0.35, 0.05, 0.2, 1] },
                        }
                      : {
                          opacity: 0,
                          scale: 0.94,
                          y: -6,
                          filter: 'blur(2px)',
                          transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
                        }
                    : {
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        filter: 'none',
                        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                        transition: {
                          duration: 0.38,
                          delay: 0.12 * (index + 1),
                          ease: [0.22, 1, 0.36, 1],
                        },
                      }
                }
                whileHover={!isDisintegrating ? { scale: 1.04, y: -3 } : {}}
                whileTap={!isDisintegrating ? { scale: 0.96 } : {}}
                className={`relative cursor-pointer group bg-[#040a14]/85 ${opt.hoverBg} rounded-3xl p-6 sm:p-7 flex flex-col items-center justify-center gap-3.5 transition-all duration-300 shadow-xl`}
              >
                {/* Ícono de sección: flotante directo, sin caja ni bordes */}
                <div className={`transition-transform duration-300 group-hover:scale-120 ${opt.iconColor} ${opt.iconDropShadow}`}>
                  <Icon size={30} className="stroke-[1.8]" />
                </div>

                {/* Título en letra ligera, tono slate perlado suave (sin blanco puro) */}
                <span className="text-xs sm:text-sm font-light text-slate-300 tracking-wider group-hover:text-slate-200 transition-colors">
                  {opt.title}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* 3. FRASE EN LETRA LIGERA: TONO SUAVE (SIN BLANCO PURO) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="text-center pt-2"
        >
          <p className="text-xs sm:text-sm font-light text-slate-400 tracking-widest">
            Elige cómo ahorrar.
          </p>
        </motion.div>

      </div>
    </div>
  );
}
