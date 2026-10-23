'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MegaphoneQuote } from '@/types';
import {
  createMegaphoneRequest,
  acceptMegaphoneQuote,
} from '@/lib/megaphone';
import { AURA_OFFICIAL_CATEGORIES } from '@/lib/categories';
import { useMegaphoneStore } from '@/store/useMegaphoneStore';
import { useGameSound } from '@/hooks/useGameSound';
import QRCodeView from '@/components/QRCodeView';
import {
  Megaphone,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Star,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Loader2,
  Sparkles,
  PlusCircle,
} from 'lucide-react';

const CINEMATIC_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface MegaphoneRadarPanelProps {
  bcvRate?: number;
}

export default function MegaphoneRadarPanel({
  bcvRate = 1,
}: MegaphoneRadarPanelProps) {
  const { playTap, playSweep, playUnlockSuccess, playRadarPing } = useGameSound();

  const {
    activeRequest,
    quotes,
    isPanelOpen,
    setIsPanelOpen,
    step,
    setStep,
    winnerStore,
    winnerReservation,
    setActiveRequest,
    setWinner,
    clearActiveMegaphone,
    initialQuery,
    initialCategory,
  } = useMegaphoneStore();

  const [queryText, setQueryText] = useState(initialQuery || '');
  const [categoryId, setCategoryId] = useState(initialCategory || 'moda');
  const [customerPhone, setCustomerPhone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);

  const [scanSecondsRemaining, setScanSecondsRemaining] = useState(1800);
  const [ticketSecondsRemaining, setTicketSecondsRemaining] = useState(5400);

  useEffect(() => {
    if (initialQuery) setQueryText(initialQuery);
    if (initialCategory) setCategoryId(initialCategory);

    if (typeof window !== 'undefined') {
      const savedPhone = localStorage.getItem('aura_customer_phone') || '';
      if (savedPhone) setCustomerPhone(savedPhone);
    }
  }, [initialQuery, initialCategory]);

  useEffect(() => {
    if (isPanelOpen) {
      playSweep();
      setErrorMsg(null);
    }
  }, [isPanelOpen, playSweep]);

  // Temporizador de escaneo
  useEffect(() => {
    if (step !== 'SCANNING' || !activeRequest?.expires_at) return;

    const updateTimer = () => {
      const diffSec = Math.max(0, Math.floor((new Date(activeRequest.expires_at!).getTime() - Date.now()) / 1000));
      setScanSecondsRemaining(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [step, activeRequest]);

  // Temporizador del ticket
  useEffect(() => {
    if (step !== 'WINNER_REVEALED' || !winnerReservation?.expires_at) return;

    const updateTimer = () => {
      const diffSec = Math.max(0, Math.floor((new Date(winnerReservation.expires_at).getTime() - Date.now()) / 1000));
      setTicketSecondsRemaining(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [step, winnerReservation]);

  // Emisión rápida de solicitud
  const handleEmitMegaphone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const cleanQuery = queryText.trim();
    if (!cleanQuery) {
      setErrorMsg('Ingresa qué artículo estás buscando.');
      return;
    }

    setIsSubmitting(true);
    playTap();

    try {
      if (customerPhone) {
        localStorage.setItem('aura_customer_phone', customerPhone);
      }

      const res = await createMegaphoneRequest({
        queryText: cleanQuery,
        categoryId: categoryId,
        city: 'Cumaná',
        customerPhone: customerPhone || undefined,
      });

      if (!res.success || !res.request) {
        setErrorMsg(res.error || 'No se pudo emitir la señal.');
        setIsSubmitting(false);
        return;
      }

      setActiveRequest(res.request);
      playRadarPing();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con la red local.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aceptar cotización ganadora
  const handleAcceptQuote = async (quote: MegaphoneQuote) => {
    setAcceptingQuoteId(quote.id);
    playTap();
    setErrorMsg(null);

    try {
      const res = await acceptMegaphoneQuote({
        quoteId: quote.id,
        customerPhone: customerPhone || undefined,
        bcvRate,
      });

      if (!res.success || !res.revealedStore) {
        setErrorMsg(res.error || 'No se pudo confirmar la cotización.');
        setAcceptingQuoteId(null);
        return;
      }

      setWinner(res.revealedStore, res.reservation);
      playUnlockSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la reserva.');
    } finally {
      setAcceptingQuoteId(null);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isPanelOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25, ease: CINEMATIC_EASE }}
          className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[#050b16]/95 border border-emerald-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffb2]/60 to-transparent" />

          {/* HEADER */}
          <div className="relative z-10 px-5 pt-4 pb-3 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-[#00ffb2]">
                <Megaphone size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  El Megáfono
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-[#00ffb2] border border-emerald-500/30">
                    En Vivo
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {step === 'SCANNING' && (
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    if (window.confirm('¿Deseas iniciar una nueva búsqueda con El Megáfono?')) {
                      clearActiveMegaphone();
                      setStep('EMIT');
                    }
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition"
                  title="Nueva Búsqueda"
                >
                  <PlusCircle size={13} />
                  <span>Nueva</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  playTap();
                  setIsPanelOpen(false);
                }}
                className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Cerrar modal (la búsqueda continúa activa)"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* BODY */}
          <div className="relative z-10 p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* PASO 1: EMISIÓN */}
            {step === 'EMIT' && (
              <form onSubmit={handleEmitMegaphone} className="space-y-3.5">
                <div className="space-y-1">
                  <input
                    type="text"
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder="¿Qué estás buscando? (ej: Pastillas de freno Corsa)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-[#00ffb2] text-white text-xs placeholder:text-slate-500 outline-none transition"
                    maxLength={100}
                    autoFocus
                    required
                  />
                </div>

                {/* Categorías */}
                <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 custom-scrollbar">
                  {AURA_OFFICIAL_CATEGORIES.map((cat) => {
                    const isSelected = categoryId === cat.id;
                    const IconComp = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          playTap();
                          setCategoryId(cat.id);
                        }}
                        className={`p-2 rounded-xl text-left border flex items-center gap-2 transition cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-emerald-950/70 border-[#00ffb2] text-[#00ffb2]'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <IconComp size={14} className={isSelected ? 'text-[#00ffb2]' : 'text-slate-400'} />
                        <span className="font-semibold truncate text-[11px]">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Teléfono opcional */}
                <div>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Tu WhatsApp (opcional)"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Botón de Emisión */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-[#00ffb2] hover:to-emerald-400 text-slate-950 flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Conectando vitrinas...</span>
                    </>
                  ) : (
                    <>
                      <Megaphone size={16} />
                      <span>Emitir señal al comercio local</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* PASO 2: SCANNING & COTIZACIONES */}
            {step === 'SCANNING' && activeRequest && (
              <div className="space-y-4">
                {/* Radar Sonar Wave */}
                <div className="relative py-3 text-center overflow-hidden rounded-2xl bg-[#030812] border border-emerald-500/30 p-3">
                  <div className="relative flex justify-center items-center h-20 my-1">
                    <motion.div
                      animate={{ scale: [1, 2], opacity: [0.6, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                      className="absolute w-20 h-20 rounded-full border border-[#00ffb2]/50"
                    />
                    <div className="relative z-10 w-12 h-12 rounded-full bg-emerald-950 border-2 border-[#00ffb2] flex items-center justify-center text-[#00ffb2] shadow-[0_0_20px_rgba(0,255,178,0.4)]">
                      <Megaphone size={20} className="animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white">
                      Buscando en mostradores de Cumaná...
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      &ldquo;{activeRequest.query_text}&rdquo;
                    </p>
                  </div>

                  <div className="mt-2.5 flex items-center justify-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock size={12} className="text-emerald-400" />
                      {formatTime(scanSecondsRemaining)}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-[#00ffb2]">
                      {quotes.length} {quotes.length === 1 ? 'respuesta' : 'respuestas'}
                    </span>
                  </div>
                </div>

                {/* Lista de Cotizaciones */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {quotes.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-[#030812]/50 border border-slate-900 text-center space-y-1.5">
                      <Loader2 size={18} className="animate-spin text-[#00ffb2] mx-auto" />
                      <p className="text-xs text-slate-400">Esperando respuestas de vitrinas...</p>
                      <p className="text-[11px] text-slate-500">
                        Puedes cerrar este cuadro y navegar en Radar. Te avisaremos apenas responda una tienda.
                      </p>
                    </div>
                  ) : (
                    quotes.map((quote) => {
                      const isAccepting = acceptingQuoteId === quote.id;
                      const sector = quote.store?.sector_zone || quote.store?.zone || 'Sector Centro';
                      const rating = quote.store?.rating ?? 4.9;
                      const priceVes = (quote.price_usd * (bcvRate || 1)).toFixed(2);

                      return (
                        <div
                          key={quote.id}
                          className="p-3 rounded-2xl bg-[#030812] border border-emerald-500/40 shadow-sm flex flex-col gap-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck size={14} className="text-[#00ffb2] shrink-0" />
                                <span className="text-xs font-bold text-white truncate">
                                  Vitrina en {sector}
                                </span>
                                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded-full border border-amber-500/30 flex items-center gap-0.5 shrink-0">
                                  <Star size={9} className="fill-amber-400 text-amber-400" />
                                  {rating}
                                </span>
                              </div>
                              {quote.quick_note && (
                                <p className="text-[11px] text-slate-300 italic mt-0.5">
                                  &ldquo;{quote.quick_note}&rdquo;
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-mono text-base font-black text-[#00ffb2]">
                                ${quote.price_usd.toFixed(2)}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                Bs. {priceVes}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAcceptQuote(quote)}
                            disabled={Boolean(acceptingQuoteId)}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-[#00ffb2] hover:to-emerald-400 text-white hover:text-black font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            {isAccepting ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Apartando...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={13} />
                                <span>Aceptar y Congelar Precio (90 min)</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* PASO 3: VITRINA REVELADA & TICKET */}
            {step === 'WINNER_REVEALED' && winnerStore && winnerReservation && (
              <div className="space-y-3.5 text-center">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-[#030812] border border-emerald-500/40">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-[#00ffb2] flex items-center justify-center mx-auto mb-1 border border-emerald-500/40">
                    <Sparkles size={16} />
                  </div>
                  <h4 className="text-sm font-bold text-white">Precio Congelado con Éxito</h4>
                  <p className="text-[11px] text-slate-400">
                    Resguardado en tienda por los próximos 90 minutos.
                  </p>
                </div>

                {/* Datos de Vitrina */}
                <div className="p-3.5 rounded-2xl bg-[#030812] border border-emerald-500/30 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-bold text-white">{winnerStore.name}</h5>
                    {winnerStore.rating && (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-0.5">
                        <Star size={9} className="fill-amber-400 text-amber-400" />
                        {winnerStore.rating}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-300 flex items-start gap-1">
                    <MapPin size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{winnerStore.address || 'Centro de Cumaná'}</span>
                  </div>

                  {winnerStore.whatsapp && (
                    <a
                      href={`https://wa.me/${String(winnerStore.whatsapp).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hola ${winnerStore.name}, acepté tu cotización de $${winnerReservation.total_price} en Aura Megáfono. Mi PIN es #${winnerReservation.pin_code || winnerReservation.pin}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <MessageCircle size={14} />
                      <span>Contactar Vitrina por WhatsApp</span>
                    </a>
                  )}
                </div>

                {/* PIN y QR */}
                <div className="p-4 rounded-2xl bg-[#030812] border border-emerald-500/40 space-y-2.5">
                  <div className="flex justify-center">
                    <QRCodeView
                      value={winnerReservation.pin_code || winnerReservation.pin || '4821'}
                      size={120}
                    />
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-medium block">
                      PIN para retirar en mostrador:
                    </span>
                    <div className="font-mono text-2xl font-black text-[#00ffb2] tracking-widest">
                      #{winnerReservation.pin_code || winnerReservation.pin}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center gap-1.5 text-xs text-amber-300 font-mono">
                    <Clock size={13} />
                    <span>Vence en: {formatTime(ticketSecondsRemaining)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      clearActiveMegaphone();
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                  >
                    Nueva Búsqueda
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      setIsPanelOpen(false);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#00ffb2] hover:bg-emerald-400 text-black font-bold text-xs transition"
                  >
                    Listo
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
