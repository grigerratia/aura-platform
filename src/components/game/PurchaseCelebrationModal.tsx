'use client';

import { Reservation } from '@/types';
import { useGameSound } from '@/hooks/useGameSound';
import {
  Sparkles, CheckCircle2, ShieldCheck, ArrowRight,
  Store, MapPin, Award, Star, Ticket, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  reservation: Reservation | null;
  trustScore: number;
  onClose: () => void;
  onViewPases: () => void;
}

export default function PurchaseCelebrationModal({
  reservation,
  trustScore,
  onClose,
  onViewPases,
}: Props) {
  const { playTap, playDustSnap } = useGameSound();

  if (!reservation) return null;

  const handleClose = () => {
    playDustSnap('fast');
    onClose();
  };

  const handleGoToPases = () => {
    playTap();
    onViewPases();
  };

  const getRankName = (score: number) => {
    if (score >= 95) return { name: 'Nivel Oro VIP', color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-950/40' };
    if (score >= 80) return { name: 'Nivel Plata', color: 'text-slate-200', border: 'border-slate-400/40', bg: 'bg-slate-900/40' };
    return { name: 'Nivel Bronce', color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-950/40' };
  };

  const rank = getRankName(trustScore);
  const paidBalance = reservation.store_pay_balance_usd || reservation.price_usd || 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        
        {/* Backdrop Oscuro con Desenfoque */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal de Celebración */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#040913]/95 border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(0,255,178,0.25)] space-y-5 z-10 text-center overflow-hidden"
        >
          {/* Reflejo especular superior fino */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffb2] to-transparent" />

          {/* Botón Cerrar */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-900/80 rounded-full transition cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Ícono de Victoria / Celebración */}
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <span className="absolute w-full h-full rounded-full bg-emerald-500/20 animate-ping" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-[#00ffb2] text-slate-950 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,178,0.5)]">
              <CheckCircle2 size={34} />
            </div>
          </div>

          {/* Encabezado */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-[#00ffb2] text-[11px] font-black uppercase tracking-wider border border-emerald-500/40">
              <Sparkles size={12} />
              <span>¡Compra Concretada en Tienda!</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              ¡Producto Retirado con Éxito!
            </h2>
            <p className="text-xs text-slate-300 font-light max-w-xs mx-auto">
              El cajero validó tu código PIN <strong className="text-white">#{reservation.pin}</strong> y registró el cobro en mostrador.
            </p>
          </div>

          {/* TARJETA DE REPUTACIÓN Y PUNTOS GANADOS */}
          <div className={`p-4 rounded-2xl ${rank.bg} border ${rank.border} text-left space-y-2.5 relative overflow-hidden shadow-inner`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-[#00ffb2] flex items-center justify-center">
                  <Award size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Nivel de Confianza Aura
                  </span>
                  <span className={`text-sm font-black ${rank.color}`}>
                    {rank.name}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-[#00ffb2] bg-emerald-950 border border-emerald-500/40 px-2 py-0.5 rounded-lg inline-block animate-pulse">
                  +10 PUNTOS
                </span>
                <span className="text-[10px] text-slate-300 block font-bold mt-0.5">
                  Total: {trustScore} pts
                </span>
              </div>
            </div>

            {/* Barra de progreso de Nivel */}
            <div className="space-y-1">
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <motion.div
                  initial={{ width: `${Math.max(10, trustScore - 10)}%` }}
                  animate={{ width: `${Math.min(100, trustScore)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-[#00ffb2]"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-light">
                Por tu asistencia puntual, tu confianza sube de nivel para apartados con 0% recargo.
              </p>
            </div>
          </div>

          {/* RECIBO DIGITAL OFICIAL */}
          <div className="bg-[#030812] border border-slate-800/80 rounded-2xl p-4 text-left space-y-2 text-xs shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Recibo Digital:</span>
              <span className="text-[10px] font-mono text-emerald-400">PIN #{reservation.pin}</span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              {reservation.product_image && (
                <div className="w-12 h-12 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800">
                  <img
                    src={reservation.product_image}
                    alt={reservation.product_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white truncate text-xs sm:text-sm">
                  {reservation.product_name}
                </h4>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Store size={11} className="text-emerald-400" />
                  <span className="truncate">{reservation.store_name}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Pagado en Caja:</span>
                <span className="text-base font-black text-white">${paidBalance.toFixed(2)} USD</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-1 rounded-xl">
                <ShieldCheck size={12} />
                <span>Entregado en Mano</span>
              </span>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleGoToPases}
              className="game-sweep w-full cursor-pointer bg-gradient-to-r from-emerald-500 via-[#00ffb2] to-teal-400 text-slate-950 font-black py-3.5 rounded-2xl text-xs transition shadow-lg shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Ticket size={14} />
              <span>Ver en Mis Pases e Historial</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full cursor-pointer bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2.5 rounded-2xl text-xs transition active:scale-95"
            >
              Seguir Explorando en Radar
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}

