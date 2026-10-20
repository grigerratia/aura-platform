'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  colorClass: string;
  borderClass: string;
  hoverGlow: string;
}

const PORTAL_OPTIONS: PortalOption[] = [
  {
    id: 'radar',
    title: 'Radar',
    icon: Compass,
    colorClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/20 group-hover:border-emerald-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_-4px_rgba(0,255,178,0.25)]',
  },
  {
    id: 'relampago',
    title: 'Relámpago',
    icon: Zap,
    colorClass: 'text-rose-400',
    borderClass: 'border-rose-500/20 group-hover:border-rose-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_-4px_rgba(244,63,94,0.25)]',
  },
  {
    id: 'manadas',
    title: 'Manada',
    icon: Users,
    colorClass: 'text-violet-400',
    borderClass: 'border-violet-500/20 group-hover:border-violet-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_-4px_rgba(168,85,247,0.25)]',
  },
  {
    id: 'pases',
    title: 'Pases',
    icon: Ticket,
    colorClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/20 group-hover:border-cyan-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_-4px_rgba(6,182,212,0.25)]',
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

    // Obtener las coordenadas del botón pulsado para emitir polvo de Thanos
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      emitThanosDust(rect, 'disintegrate', 'epic');
    }

    // Pequeño retardo de 320ms para disfrutar visualmente el chasquido antes de cambiar de sección
    setTimeout(() => {
      onSelectMode(mode);
    }, 320);
  };

  return (
    <div className="min-h-[72vh] flex flex-col items-center justify-center px-4 py-8 select-none">
      <div className="w-full max-w-xl mx-auto space-y-8 sm:space-y-10">
        
        {/* 1. FRASE ELEGANTE Y SIN ILUMINADO INTENSO */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-1"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-light text-slate-100 tracking-wide font-sans">
            Bienvenido a Aura
          </h1>
        </motion.div>

        {/* 2. LOS CUATRO BOTONES (UNO POR UNO CON EFECTO THANOS DE APARICIÓN) */}
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
                  y: 14,
                }}
                animate={
                  isDisintegrating
                    ? isTarget
                      ? {
                          opacity: 0,
                          scale: 1.05,
                          y: -10,
                          filter: 'brightness(1.4) blur(3px)',
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
                whileHover={!isDisintegrating ? { scale: 1.03, y: -2 } : {}}
                whileTap={!isDisintegrating ? { scale: 0.96 } : {}}
                className={`relative cursor-pointer group bg-[#030910]/85 border ${opt.borderClass} ${opt.hoverGlow} rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center gap-3 transition-colors duration-300 shadow-lg`}
              >
                {/* Ícono de sección */}
                <div className={`p-2.5 rounded-xl bg-slate-950/60 border border-slate-900 group-hover:scale-110 transition-transform duration-300 ${opt.colorClass}`}>
                  <Icon size={24} className="stroke-[1.75]" />
                </div>

                {/* Título en letra ligera */}
                <span className="text-xs sm:text-sm font-light text-slate-300 group-hover:text-white tracking-wider transition-colors">
                  {opt.title}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* 3. FRASE EN LETRA LIGERA: ELIGE CÓMO AHORRAR */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="text-center pt-2"
        >
          <p className="text-xs sm:text-sm font-light text-slate-400 tracking-wider">
            Elige cómo ahorrar.
          </p>
        </motion.div>

      </div>
    </div>
  );
}

