'use client';

import { useGameSound } from '@/hooks/useGameSound';
import { Compass, Zap, Users, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';

export type GameMode = 'portal' | 'radar' | 'relampago' | 'manadas' | 'pases';

interface Props {
  activeMode: GameMode;
  onChangeMode: (mode: GameMode) => void;
  hasActiveTicket?: boolean;
}

export default function BottomDock({
  activeMode,
  onChangeMode,
  hasActiveTicket = false,
}: Props) {
  const { playSweep } = useGameSound();

  const MODES: { id: GameMode; label: string; icon: any }[] = [
    { id: 'radar', label: 'Radar', icon: Compass },
    { id: 'relampago', label: 'Relámpago', icon: Zap },
    { id: 'manadas', label: 'Manadas', icon: Users },
    { id: 'pases', label: 'Mis Pases', icon: Ticket },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#020508]/92 backdrop-blur-2xl border-t border-emerald-950/80 px-2 sm:px-6 py-2 select-none">
      <div className="max-w-md mx-auto flex items-center justify-around gap-1">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => {
                if (!isActive) {
                  playSweep();
                  onChangeMode(mode.id);
                }
              }}
              className="relative cursor-pointer flex-1 py-1.5 flex flex-col items-center justify-center gap-1 transition-all group"
            >
              {/* Contenedor del Icono con Resplandor Aurora */}
              <div className="relative">
                <Icon
                  size={20}
                  className={`transition-all duration-300 ${
                    isActive
                      ? 'text-[#00ffb2] scale-110 drop-shadow-[0_0_8px_rgba(0,255,178,0.7)]'
                      : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />

                {/* Badge parpadeante si hay un ticket QR activo */}
                {mode.id === 'pases' && hasActiveTicket && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#00ffb2] animate-ping" />
                )}
              </div>

              {/* Etiqueta limpia (sin píldoras) */}
              <span
                className={`text-[10px] sm:text-[11px] font-black tracking-tight transition-colors ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'
                }`}
              >
                {mode.label}
              </span>

              {/* Indicador de Resplandor Aurora en Modo Activo */}
              {isActive && (
                <motion.div
                  layoutId="activeDockIndicator"
                  className="absolute -bottom-1 w-6 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#00ffb2] to-transparent shadow-[0_0_8px_#00ffb2]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

