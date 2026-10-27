'use client';

import { useState } from 'react';
import { Reservation } from '@/types';
import { useGameSound } from '@/hooks/useGameSound';
import {
  Sparkles, CheckCircle2, ShieldCheck, ArrowRight,
  Store, MapPin, Award, Star, Ticket, X, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

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

  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  if (!reservation) return null;

  const handleRateStore = async (rating: number) => {
    if (ratingSubmitted || isSubmittingRating || !reservation?.store_id) return;
    setSelectedRating(rating);
    setIsSubmittingRating(true);
    playTap();

    try {
      // 1. Guardar calificación individual en store_reviews
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('store_reviews').insert({
        store_id: reservation.store_id,
        user_id: user?.id || null,
        rating: rating,
        comment: `Calificación de atención para compra PIN #${reservation.pin || reservation.pin_code}`,
      });

      // 2. Obtener rating y conteo actual de la tienda para calcular nuevo promedio real
      const { data: storeData } = await supabase
        .from('stores')
        .select('rating, reviews_count')
        .eq('id', reservation.store_id)
        .single();

      const prevRating = Number(storeData?.rating || 5.0);
      const prevCount = Number(storeData?.reviews_count || 0);
      const newCount = prevCount + 1;
      const newAverage = Number((((prevRating * prevCount) + rating) / newCount).toFixed(2));

      // 3. Actualizar tienda con su nuevo promedio real
      await supabase
        .from('stores')
        .update({
          rating: newAverage,
          reviews_count: newCount,
        })
        .eq('id', reservation.store_id);

      setRatingSubmitted(true);

      // 4. Notificar a la app para actualizar estrellas en vivo
      window.dispatchEvent(
        new CustomEvent('aura_store_rating_updated', {
          detail: {
            storeId: reservation.store_id,
            rating: newAverage,
            reviewsCount: newCount,
          },
        })
      );
    } catch (err) {
      console.error('Error al registrar calificación:', err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 select-none overflow-y-auto">
        
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
          className="relative w-full max-w-md bg-[#040913]/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.85)] space-y-5 z-10 text-center max-h-[90vh] overflow-y-auto my-auto"
        >
          {/* Reflejo especular superior fino */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-600/30 to-transparent" />

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
            <span className="absolute w-full h-full rounded-full bg-slate-800/40 animate-ping" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-[#00ffb2] text-slate-950 flex items-center justify-center shadow-lg">
              <CheckCircle2 size={34} />
            </div>
          </div>

          {/* Encabezado */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900 text-emerald-400 text-[11px] font-black uppercase tracking-wider border border-slate-800">
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
                <span className="text-xs font-black text-[#00ffb2] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg inline-block animate-pulse">
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
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
                <ShieldCheck size={12} />
                <span>Entregado en Mano</span>
              </span>
            </div>
          </div>

          {/* CALIFICACIÓN DE ATENCIÓN EN TIENDA */}
          {reservation.store_id && (
            <div className="bg-[#030812] border border-slate-800/80 rounded-2xl p-4 text-center space-y-2 shadow-inner">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  {ratingSubmitted ? '¡Calificación Registrada!' : 'Califica la Atención en Tienda'}
                </span>
                <p className="text-xs text-slate-300 font-medium">
                  ¿Cómo te atendieron en <strong className="text-white">{reservation.store_name}</strong>?
                </p>
              </div>

              {ratingSubmitted ? (
                <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-emerald-400 font-bold animate-in fade-in zoom-in-95">
                  <CheckCircle2 size={15} />
                  <span>¡Gracias! Calificaste con {selectedRating} {selectedRating === 1 ? 'estrella' : 'estrellas'}.</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = (hoverRating || selectedRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          disabled={isSubmittingRating}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => handleRateStore(star)}
                          className="p-1 text-slate-600 hover:text-amber-400 transition-all hover:scale-125 active:scale-95 cursor-pointer disabled:opacity-50"
                          title={`${star} de 5 estrellas`}
                        >
                          <Star
                            size={24}
                            className={
                              active
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                                : 'text-slate-600'
                            }
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-slate-400 block font-light">
                    {hoverRating === 5 ? '¡Excelente atención! (5.0)' :
                     hoverRating === 4 ? 'Muy buena atención (4.0)' :
                     hoverRating === 3 ? 'Buena atención (3.0)' :
                     hoverRating === 2 ? 'Regular (2.0)' :
                     hoverRating === 1 ? 'Mala atención (1.0)' :
                     'Toca una estrella para registrar tu voto'}
                  </span>
                </div>
              )}
            </div>
          )}

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

