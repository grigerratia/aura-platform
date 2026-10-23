'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { MegaphoneRequest, MegaphoneQuote, Store } from '@/types';
import {
  createMegaphoneRequest,
  acceptMegaphoneQuote,
  fetchQuotesForRequest,
  getUser24hMegaphoneCount,
} from '@/lib/megaphone';
import { AURA_OFFICIAL_CATEGORIES } from '@/lib/categories';
import { useGameSound } from '@/hooks/useGameSound';
import QRCodeView from '@/components/QRCodeView';
import {
  Radio,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Store as StoreIcon,
  MapPin,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  ChevronRight,
  Send,
  Loader2,
  Flame,
  Zap,
  Info,
} from 'lucide-react';

const CINEMATIC_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface MegaphoneRadarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialCategory?: string;
  bcvRate?: number;
}

export default function MegaphoneRadarPanel({
  isOpen,
  onClose,
  initialQuery = '',
  initialCategory = 'moda',
  bcvRate = 1,
}: MegaphoneRadarPanelProps) {
  const { playTap, playSweep, playUnlockSuccess, playRadarPing, playAlertChime } = useGameSound();

  // Estados del Flujo
  const [step, setStep] = useState<'EMIT' | 'SCANNING' | 'WINNER_REVEALED'>('EMIT');
  const [queryText, setQueryText] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Cuota diaria de usuario
  const [requestsToday, setRequestsToday] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Solicitud activa y cotizaciones en tiempo real
  const [activeRequest, setActiveRequest] = useState<MegaphoneRequest | null>(null);
  const [quotes, setQuotes] = useState<MegaphoneQuote[]>([]);
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);

  // Vitrina ganadora revelada y ticket de 90 min
  const [winnerStore, setWinnerStore] = useState<Partial<Store> | null>(null);
  const [winnerReservation, setWinnerReservation] = useState<any | null>(null);

  // Temporizadores
  const [scanSecondsRemaining, setScanSecondsRemaining] = useState(1800); // 30 min
  const [ticketSecondsRemaining, setTicketSecondsRemaining] = useState(5400); // 90 min

  // Cargar datos previos de usuario y cuota
  useEffect(() => {
    if (initialQuery) {
      setQueryText(initialQuery);
    }
    if (initialCategory) {
      setCategoryId(initialCategory);
    }

    if (typeof window !== 'undefined') {
      const savedPhone = localStorage.getItem('aura_customer_phone') || '';
      const savedName = localStorage.getItem('aura_customer_name') || '';
      if (savedPhone) setCustomerPhone(savedPhone);
      if (savedName) setCustomerName(savedName);

      getUser24hMegaphoneCount(null, savedPhone).then((c) => setRequestsToday(c));
    }
  }, [initialQuery, initialCategory]);

  // Sonido al abrir
  useEffect(() => {
    if (isOpen) {
      playSweep();
      setErrorMsg(null);
    }
  }, [isOpen, playSweep]);

  // Temporizador de 30 minutos durante el escaneo
  useEffect(() => {
    if (step !== 'SCANNING' || !activeRequest) return;

    const updateTimer = () => {
      const expireTime = new Date(activeRequest.expires_at).getTime();
      const diffSec = Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
      setScanSecondsRemaining(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [step, activeRequest]);

  // Temporizador de 90 minutos cuando gana una vitrina
  useEffect(() => {
    if (step !== 'WINNER_REVEALED' || !winnerReservation) return;

    const updateTicketTimer = () => {
      const expireTime = new Date(winnerReservation.expires_at).getTime();
      const diffSec = Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
      setTicketSecondsRemaining(diffSec);
    };

    updateTicketTimer();
    const interval = setInterval(updateTicketTimer, 1000);
    return () => clearInterval(interval);
  }, [step, winnerReservation]);

  // Sonido de ping sonar periódico durante escaneo
  useEffect(() => {
    if (step !== 'SCANNING') return;
    const pingInterval = setInterval(() => {
      playRadarPing();
    }, 6000);
    return () => clearInterval(pingInterval);
  }, [step, playRadarPing]);

  // Suscripción Realtime a las cotizaciones de la solicitud activa
  useEffect(() => {
    if (!activeRequest?.id || step !== 'SCANNING') return;

    // 1. Cargar cotizaciones existentes
    fetchQuotesForRequest(activeRequest.id).then((initialQuotes) => {
      setQuotes(initialQuotes);
    });

    // 2. Escuchar nuevas cotizaciones en tiempo real
    const channel = supabase
      .channel(`megaphone_room_${activeRequest.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'megaphone_quotes',
          filter: `request_id=eq.${activeRequest.id}`,
        },
        async () => {
          // Refrescar lista con datos enriquecidos de la tienda
          const updated = await fetchQuotesForRequest(activeRequest.id);
          setQuotes(updated);
          playAlertChime();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRequest?.id, step, playAlertChime]);

  // Manejar emisión de la solicitud
  const handleEmitMegaphone = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!queryText.trim()) {
      setErrorMsg('Por favor escribe qué producto o repuesto estás buscando.');
      return;
    }

    if (requestsToday >= 3) {
      setErrorMsg('Has alcanzado el límite diario de 3 emisiones gratuitas. Se renovará en 24 horas.');
      return;
    }

    setIsSubmitting(true);
    playTap();

    try {
      if (customerPhone) {
        localStorage.setItem('aura_customer_phone', customerPhone);
      }
      if (customerName) {
        localStorage.setItem('aura_customer_name', customerName);
      }

      const res = await createMegaphoneRequest({
        queryText: queryText.trim(),
        categoryId: categoryId,
        city: 'Cumaná',
        customerName: customerName || 'Comprador Radar',
        customerPhone: customerPhone || '04120000000',
      });

      if (!res.success || !res.request) {
        setErrorMsg(res.error || 'No se pudo emitir la señal. Intenta de nuevo.');
        setIsSubmitting(false);
        return;
      }

      setActiveRequest(res.request);
      setQuotes([]);
      setRequestsToday((prev) => prev + 1);
      setStep('SCANNING');
      playRadarPing();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con la red local de vitrinas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar aceptación de cotización
  const handleAcceptQuote = async (quote: MegaphoneQuote) => {
    setAcceptingQuoteId(quote.id);
    playTap();
    setErrorMsg(null);

    try {
      const res = await acceptMegaphoneQuote({
        quoteId: quote.id,
        customerName: customerName || 'Comprador Radar',
        customerPhone: customerPhone || '04120000000',
        bcvRate,
      });

      if (!res.success || !res.revealedStore) {
        setErrorMsg(res.error || 'No se pudo confirmar la cotización.');
        setAcceptingQuoteId(null);
        return;
      }

      setWinnerStore(res.revealedStore);
      setWinnerReservation(res.reservation);
      setStep('WINNER_REVEALED');
      playUnlockSuccess();

      // Guardar ticket en localStorage para respaldo
      if (typeof window !== 'undefined' && res.reservation) {
        try {
          const tickets = JSON.parse(localStorage.getItem('aura_megaphone_active_tickets') || '[]');
          tickets.unshift({
            ...res.reservation,
            store: res.revealedStore,
            query_text: activeRequest?.query_text,
          });
          localStorage.setItem('aura_megaphone_active_tickets', JSON.stringify(tickets.slice(0, 10)));
        } catch {}
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la reserva.');
    } finally {
      setAcceptingQuoteId(null);
    }
  };

  // Formateadores de tiempo
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const selectedCategoryObj = AURA_OFFICIAL_CATEGORIES.find((c) => c.id === categoryId) || AURA_OFFICIAL_CATEGORIES[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ duration: 0.28, ease: CINEMATIC_EASE }}
        className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[#050b16]/95 border border-emerald-500/30 shadow-[0_30px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Reflejo especular superior fino */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffb2]/60 to-transparent" />

        {/* Halo de luz ambiental de fondo */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-emerald-500/10 blur-[90px]" />

        {/* HEADER */}
        <div className="relative z-10 px-5 pt-5 pb-3 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-950 to-[#040913] border border-emerald-500/40 flex items-center justify-center text-[#00ffb2] shadow-inner">
              <Radio size={18} className={step === 'SCANNING' ? 'animate-pulse' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  El Megáfono
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#00ffb2] border border-emerald-500/40">
                    Radar En Vivo
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-light">
                Búsqueda inversa con vitrinas y mostradores de Cumaná
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playTap();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* CUERPO PRINCIPAL */}
        <div className="relative z-10 p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASO 1: EMISIÓN DE SEÑAL AL COMERCIO LOCAL */}
          {/* ========================================================================= */}
          {step === 'EMIT' && (
            <form onSubmit={handleEmitMegaphone} className="space-y-4">
              {/* Cuota restante */}
              <div className="p-3 rounded-xl bg-[#030812]/80 border border-emerald-500/20 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Flame size={14} className="text-amber-400" />
                  Cuota gratuita diaria:
                </span>
                <span className="font-mono font-bold text-[#00ffb2]">
                  {Math.max(0, 3 - requestsToday)} de 3 disponibles hoy
                </span>
              </div>

              {/* ¿Qué buscas exactamente? */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  ¿Qué artículo o repuesto buscas?
                  <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder="Ej: Pastillas de freno Corsa 2002, Zapatos colegiales talla 35..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-[#00ffb2] focus:ring-1 focus:ring-[#00ffb2] text-white text-xs placeholder:text-slate-500 outline-none transition"
                    maxLength={100}
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Sé lo más específico posible (modelo, talla o especificación técnica).
                </p>
              </div>

              {/* Selector de Categoría Oficial */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Categoría del Comercio
                </label>
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
                            ? 'bg-emerald-950/70 border-[#00ffb2] text-[#00ffb2] shadow-sm'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: isSelected ? 'rgba(0,255,178,0.15)' : 'rgba(255,255,255,0.05)',
                            color: isSelected ? '#00ffb2' : cat.colorHex,
                          }}
                        >
                          <IconComp size={13} />
                        </div>
                        <span className="font-semibold truncate text-[11px]">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Teléfono y Nombre de contacto */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Tu Nombre (opcional)</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej: Carlos"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Teléfono (WhatsApp)</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Ej: 04121234567"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Botón de Emisión */}
              <button
                type="submit"
                disabled={isSubmitting || requestsToday >= 3}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-[#00ffb2] hover:to-emerald-400 text-slate-950 flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Conectando con mostradores...</span>
                  </>
                ) : (
                  <>
                    <Radio size={16} />
                    <span>Emitir Señal al Comercio Local</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* PASO 2: SCANNING RADAR & COTIZACIONES EN MODO INCÓGNITO */}
          {/* ========================================================================= */}
          {step === 'SCANNING' && activeRequest && (
            <div className="space-y-4">
              {/* RADAR WAVE SONAR */}
              <div className="relative py-4 text-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#030812]/90 to-[#050b16] border border-emerald-500/30 p-4">
                {/* Ondas concéntricas de pulso */}
                <div className="relative flex justify-center items-center h-28 my-1">
                  <motion.div
                    animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute w-24 h-24 rounded-full border border-[#00ffb2]/50"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.8], opacity: [0.8, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 0.8 }}
                    className="absolute w-20 h-20 rounded-full border border-teal-400/40"
                  />
                  <div className="relative z-10 w-14 h-14 rounded-full bg-emerald-950/80 border-2 border-[#00ffb2] flex items-center justify-center text-[#00ffb2] shadow-[0_0_25px_rgba(0,255,178,0.5)]">
                    <Radio size={24} className="animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    Consultando mostradores de {selectedCategoryObj.name} en Cumaná...
                  </h4>
                  <p className="text-xs text-slate-300 font-medium">
                    &ldquo;{activeRequest.query_text}&rdquo;
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-center gap-3 text-xs">
                  <div className="flex items-center gap-1 text-slate-400 font-mono">
                    <Clock size={13} className="text-emerald-400" />
                    <span>Tiempo de espera: {formatTime(scanSecondsRemaining)}</span>
                  </div>
                  <span className="text-slate-600">•</span>
                  <div className="font-semibold text-[#00ffb2] flex items-center gap-1">
                    <Zap size={13} />
                    <span>{quotes.length} {quotes.length === 1 ? 'respuesta' : 'respuestas'}</span>
                  </div>
                </div>
              </div>

              {/* LISTA DE COTIZACIONES EN MODO INCÓGNITO */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                    Cotizaciones Recibidas
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Modo Incógnito (Dirección se revela al aceptar)
                  </span>
                </div>

                {quotes.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#030812]/50 border border-slate-800 text-center space-y-2">
                    <Loader2 size={20} className="animate-spin text-[#00ffb2] mx-auto" />
                    <p className="text-xs text-slate-400">
                      Esperando que los comercios verifiquen su almacén...
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Recibirás respuesta en menos de 3 minutos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {quotes.map((quote) => {
                      const isAccepting = acceptingQuoteId === quote.id;
                      const sector = quote.store?.sector_zone || quote.store?.zone || 'Sector Centro';
                      const rating = quote.store?.rating ?? 4.9;
                      const priceVes = (quote.price_usd * (bcvRate || 1)).toFixed(2);

                      return (
                        <div
                          key={quote.id}
                          className="relative overflow-hidden p-3 rounded-2xl bg-[#030812]/90 border border-emerald-500/40 shadow-sm flex flex-col gap-2.5 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white flex items-center gap-1">
                                  <ShieldCheck size={14} className="text-[#00ffb2]" />
                                  Vitrina Verificada en {sector}
                                </span>
                                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                                  ★ {rating}
                                </span>
                              </div>
                              {quote.quick_note && (
                                <p className="text-[11px] text-slate-300 italic mt-1 line-clamp-2">
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

                          {/* Foto opcional */}
                          {quote.photo_url && (
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700">
                              <img
                                src={quote.photo_url}
                                alt="Foto cotización"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {/* Botón de Aceptar Cotización */}
                          <button
                            type="button"
                            onClick={() => handleAcceptQuote(quote)}
                            disabled={Boolean(acceptingQuoteId)}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-[#00ffb2] hover:to-emerald-400 text-white hover:text-black font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow cursor-pointer disabled:opacity-50"
                          >
                            {isAccepting ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Bloqueando precio...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={14} />
                                <span>Aceptar y Generar Ticket QR (90 min)</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASO 3: VITRINA REVELADA & TICKET QR CON RELOJ DE 90 MINUTOS */}
          {/* ========================================================================= */}
          {step === 'WINNER_REVEALED' && winnerStore && winnerReservation && (
            <div className="space-y-4 text-center">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#030812] to-teal-950/60 border border-emerald-500/50 space-y-1">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-[#00ffb2] flex items-center justify-center mx-auto mb-1 border border-emerald-500/40 shadow-[0_0_15px_rgba(0,255,178,0.4)]">
                  <Sparkles size={20} />
                </div>
                <h4 className="text-base font-bold text-white tracking-tight">
                  ¡Precio Congelado con Éxito!
                </h4>
                <p className="text-xs text-slate-300">
                  La vitrina física ha apartado tu producto por los próximos 90 minutos.
                </p>
              </div>

              {/* DATOS DE LA TIENDA REVELADA */}
              <div className="p-4 rounded-2xl bg-[#030812]/90 border border-emerald-500/30 text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#00ffb2] tracking-wider block">
                      Vitrina Comercial Asignada
                    </span>
                    <h5 className="text-sm font-bold text-white">{winnerStore.name}</h5>
                  </div>
                  {winnerStore.rating && (
                    <span className="text-xs font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                      ★ {winnerStore.rating}
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-300 flex items-start gap-1.5">
                  <MapPin size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>{winnerStore.address || 'Cumaná, Edo. Sucre'}</span>
                </div>

                {winnerStore.whatsapp && (
                  <a
                    href={`https://wa.me/${String(winnerStore.whatsapp).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hola ${winnerStore.name}, acabo de aceptar tu cotización de $${winnerReservation.total_price} en Aura Megáfono para ${activeRequest?.query_text}. Mi código PIN es #${winnerReservation.pin_code || winnerReservation.pin}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <MessageCircle size={15} />
                    <span>Contactar Vitrina por WhatsApp</span>
                  </a>
                )}
              </div>

              {/* TICKET QR Y CÓDIGO PIN */}
              <div className="p-5 rounded-2xl bg-[#030812] border border-emerald-500/40 space-y-3">
                <div className="flex justify-center">
                  <QRCodeView
                    value={winnerReservation.pin_code || winnerReservation.pin || '4821'}
                    size={140}
                  />
                </div>

                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-medium tracking-wider block">
                    Código PIN para retirar en caja:
                  </span>
                  <div className="font-mono text-3xl font-black text-[#00ffb2] tracking-widest drop-shadow-[0_0_12px_rgba(0,255,178,0.5)]">
                    #{winnerReservation.pin_code || winnerReservation.pin}
                  </div>
                </div>

                {/* Reloj de 90 minutos */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center gap-2 text-xs text-amber-300 font-mono">
                  <Clock size={14} className="animate-pulse" />
                  <span>Validez garantizada: {formatTime(ticketSecondsRemaining)}</span>
                </div>
              </div>

              {/* Botón de cerrar */}
              <button
                type="button"
                onClick={() => {
                  playTap();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Listo, guardar en Mis Pases
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
