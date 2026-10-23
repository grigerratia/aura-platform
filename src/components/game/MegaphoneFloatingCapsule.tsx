'use client';

import { motion } from 'framer-motion';
import { useMegaphoneStore } from '@/store/useMegaphoneStore';
import { useGameSound } from '@/hooks/useGameSound';
import { Megaphone, Sparkles, ChevronRight, X, Loader2 } from 'lucide-react';

interface Props {
  hasActiveReservation?: boolean;
}

export default function MegaphoneFloatingCapsule({ hasActiveReservation = false }: Props) {
  const { playTap, playSweep } = useGameSound();
  const {
    activeRequest,
    quotes,
    isPanelOpen,
    setIsPanelOpen,
    clearActiveMegaphone,
    step,
  } = useMegaphoneStore();

  if (!activeRequest || isPanelOpen) return null;

  const quoteCount = quotes.length;
  const isWinner = step === 'WINNER_REVEALED';

  const bottomClass = hasActiveReservation
    ? 'bottom-32 sm:bottom-34'
    : 'bottom-16 sm:bottom-18';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`fixed ${bottomClass} left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md select-none`}
    >
      <div
        onClick={() => {
          playSweep();
          setIsPanelOpen(true);
        }}
        className="group relative flex items-center justify-between gap-2.5 p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl bg-[#030814]/95 border border-emerald-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl hover:border-emerald-400 transition cursor-pointer"
      >
        {/* Reflejo especular superior */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffb2]/60 to-transparent" />

        {/* Lado izquierdo: Ícono con radar pulsante */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0 w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-[#00ffb2] shadow-[0_0_15px_rgba(0,255,178,0.3)]">
            <Megaphone size={15} className={quoteCount > 0 ? 'animate-bounce' : 'animate-pulse'} />
            {quoteCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00ffb2] animate-ping" />
            )}
          </div>

          {/* Centro: Estado de la búsqueda */}
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate max-w-[170px] sm:max-w-[220px]">
                {activeRequest.query_text}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-[#00ffb2] border border-emerald-500/30 shrink-0">
                {isWinner ? 'Ganador' : 'Megáfono'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
              {quoteCount > 0 ? (
                <span className="font-bold text-[#00ffb2] flex items-center gap-1">
                  <Sparkles size={11} />
                  {quoteCount} {quoteCount === 1 ? 'oferta recibida' : 'ofertas recibidas'}
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin text-emerald-400 shrink-0" />
                  Buscando en vitrinas...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lado derecho: Botón de Abrir y Cancelar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-[#00ffb2] group-hover:bg-[#00ffb2] group-hover:text-black font-bold text-xs transition">
            <span>Ver</span>
            <ChevronRight size={13} />
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playTap();
              if (window.confirm('¿Deseas cerrar esta búsqueda de Megáfono?')) {
                clearActiveMegaphone();
              }
            }}
            className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition"
            title="Descartar megáfono"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
