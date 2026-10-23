'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Store, MegaphoneRequest } from '@/types';
import { fetchOpenRequestsForStore, submitMegaphoneQuote, subscribeToMegaphoneBroadcast } from '@/lib/megaphone';
import { useGameSound } from '@/hooks/useGameSound';
import {
  Megaphone,
  Radio,
  Clock,
  Send,
  Camera,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sparkles,
  Crown,
  ChevronRight,
  Loader2,
  Check,
  X,
  ArrowUpRight,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

interface MegaphoneMerchantWidgetProps {
  store: Store;
  bcvRate?: number;
  onQuoteSubmitted?: (productId?: string) => void;
}

export default function MegaphoneMerchantWidget({
  store,
  bcvRate = 1,
  onQuoteSubmitted,
}: MegaphoneMerchantWidgetProps) {
  const { playTap, playAlertChime, playUnlockSuccess } = useGameSound();

  const [requests, setRequests] = useState<(MegaphoneRequest & { alreadyQuoted?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Formulario rápido por request_id
  const [activeFormRequestId, setActiveFormRequestId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');
  const [quickNote, setQuickNote] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [submittingRequestId, setSubmittingRequestId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Notificaciones de éxito o error
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Candado de Monetización: Modal de Upgrade a Plan Acelerador ($45)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Estado de cuota
  const quotaUsed = store.megaphone_quota_used ?? 0;
  const isBasicPlan = !store.plan_tier || store.plan_tier === 'VITRINA_20';
  const isUnlimited = store.plan_tier === 'ACELERADOR_45' || store.plan_tier === 'DOMINIO_80';

  // 1. Cargar solicitudes abiertas
  const loadRequests = useCallback(async () => {
    if (!store.id) return;
    try {
      const openList = await fetchOpenRequestsForStore(store.id, store.category);
      setRequests(openList);
    } catch (err) {
      console.warn('Error cargando solicitudes de Megáfono:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [store.id, store.category]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // 2. Suscripción en tiempo real a nuevas solicitudes del Megáfono
  useEffect(() => {
    if (!store.id) return;

    // a) Sincronización inmediata entre pestañas en el mismo navegador
    const unsubscribeBroadcast = subscribeToMegaphoneBroadcast((event) => {
      if (event.type === 'NEW_REQUEST') {
        const newReq = event.payload as MegaphoneRequest;
        setRequests((prev) => {
          if (prev.some((r) => r.id === newReq.id)) return prev;
          playAlertChime();
          return [newReq, ...prev];
        });
      } else if (event.type === 'QUOTE_ACCEPTED') {
        loadRequests();
      }
    });

    // b) Polling de sincronización cada 3 segundos
    const pollInterval = setInterval(() => {
      loadRequests();
    }, 3000);

    // c) Supabase Realtime (cuando las tablas existen en la nube)
    const channel = supabase
      .channel(`megaphone_merchant_requests_${store.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'megaphone_requests',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReq = payload.new as MegaphoneRequest;
            if (newReq.status === 'OPEN') {
              playAlertChime();
            }
          }
          await loadRequests();
        }
      )
      .subscribe();

    return () => {
      unsubscribeBroadcast();
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [store.id, loadRequests, playAlertChime]);

  // Sugerencias rápidas de notas
  const noteSuggestions = [
    'Disponible para entrega inmediata',
    'Original con garantía',
    'Varios modelos en vitrina',
    'Excelente calidad garantizada',
  ];

  // Subida opcional de foto de producto
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida.');
      return;
    }

    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const cleanPath = `megaphone/${store.id}/${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(cleanPath, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(cleanPath);

      if (publicUrlData?.publicUrl) {
        setPhotoUrl(publicUrlData.publicUrl);
      }
    } catch (err: any) {
      alert('No se pudo subir la foto: ' + (err.message || 'Error de red'));
    } finally {
      setUploadingImage(false);
    }
  };

  // Envío ultra-rápido de cotización (3 segundos)
  const handleSubmitQuote = async (requestId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const priceNum = parseFloat(priceInput);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMessage('Ingresa un precio válido en dólares ($ USD).');
      return;
    }

    // Verificar límite antes de enviar
    if (isBasicPlan && quotaUsed >= 5) {
      setShowUpgradeModal(true);
      return;
    }

    setSubmittingRequestId(requestId);
    playTap();

    try {
      const res = await submitMegaphoneQuote({
        requestId,
        storeId: store.id,
        priceUsd: priceNum,
        quickNote: quickNote.trim(),
        photoUrl: photoUrl || undefined,
      });

      if (!res.success) {
        if (res.quotaExceeded) {
          setShowUpgradeModal(true);
        } else {
          setErrorMessage(res.error || 'No se pudo enviar la cotización.');
        }
        return;
      }

      playUnlockSuccess();
      setSuccessMessage('✓ ¡Cotización enviada en 3 segundos! Se auto-alimentó tu catálogo.');

      // Limpiar formulario
      setActiveFormRequestId(null);
      setPriceInput('');
      setQuickNote('');
      setPhotoUrl('');

      // Recargar solicitudes para reflejar estado
      await loadRequests();

      if (onQuoteSubmitted) {
        onQuoteSubmitted(res.autoSeededProductId);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al cotizar.');
    } finally {
      setSubmittingRequestId(null);
    }
  };

  const activeCount = requests.filter((r) => !r.alreadyQuoted).length;

  return (
    <div className="space-y-4">
      {/* HEADER DE ESTADO Y CUOTA */}
      <div className="relative overflow-hidden rounded-2xl bg-[#030812]/90 border border-emerald-500/30 p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-[#00ffb2]">
            <Megaphone size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                El Megáfono
              </h4>
              <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-[#00ffb2] border border-emerald-500/30">
                {activeCount} {activeCount === 1 ? 'solicitud' : 'solicitudes'}
              </span>
            </div>
          </div>
        </div>

        {/* Control de Cuota B2B */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">
              Cuota de Respuestas
            </span>
            <div className="flex items-center gap-1.5 justify-end">
              {isUnlimited ? (
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Crown size={12} />
                  Ilimitadas (Plan Acelerador)
                </span>
              ) : (
                <span className="font-mono text-xs font-bold text-slate-200">
                  <span className={quotaUsed >= 5 ? 'text-rose-400' : 'text-[#00ffb2]'}>
                    {quotaUsed}
                  </span>{' '}
                  / 5 usadas este mes
                </span>
              )}
            </div>
          </div>

          {isBasicPlan && (
            <button
              type="button"
              onClick={() => {
                playTap();
                setShowUpgradeModal(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
            >
              <Zap size={12} />
              <span>Subir a Acelerador</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playTap();
              setRefreshing(true);
              loadRequests();
            }}
            disabled={refreshing}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
            title="Refrescar solicitudes"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-400' : ''} />
          </button>
        </div>
      </div>

      {/* MENSAJES DE ESTADO */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#00ffb2] shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* LISTADO DE SOLICITUDES */}
      {loading ? (
        <div className="py-8 text-center space-y-2">
          <Loader2 size={20} className="animate-spin text-[#00ffb2] mx-auto" />
          <p className="text-xs text-slate-400">Buscando solicitudes...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#030812]/50 border border-slate-900 text-center space-y-1.5">
          <Megaphone size={24} className="text-slate-600 mx-auto" />
          <h5 className="text-xs font-bold text-slate-300">No hay solicitudes pendientes</h5>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const isQuotingThis = activeFormRequestId === req.id;
            const isSubmittingThis = submittingRequestId === req.id;
            const alreadyQuoted = req.alreadyQuoted;

            const createdTime = new Date(req.created_at);
            const minutesAgo = Math.max(0, Math.floor((Date.now() - createdTime.getTime()) / 60000));

            return (
              <div
                key={req.id}
                className={`relative overflow-hidden p-4 rounded-2xl border transition ${
                  alreadyQuoted
                    ? 'bg-[#02060d]/60 border-slate-800/80 opacity-75'
                    : 'bg-[#030812]/95 border-emerald-500/40 shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                        {req.category_id.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock size={11} className="text-emerald-400" />
                        Hace {minutesAgo} min
                      </span>
                      {alreadyQuoted && (
                        <span className="text-[10px] font-bold text-[#00ffb2] bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                          <Check size={11} />
                          Ya cotizaste
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      &ldquo;{req.query_text}&rdquo;
                    </h4>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Ciudad: {req.city || 'Cumaná'}</span>
                      {req.customer_name && <span>• Comprador: {req.customer_name}</span>}
                    </div>
                  </div>

                  {!alreadyQuoted && (
                    <button
                      type="button"
                      onClick={() => {
                        playTap();
                        if (isQuotingThis) {
                          setActiveFormRequestId(null);
                        } else {
                          setActiveFormRequestId(req.id);
                          setPriceInput('');
                          setQuickNote('');
                          setPhotoUrl('');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                        isQuotingThis
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-[#00ffb2] hover:to-emerald-400 text-slate-950 shadow-sm'
                      }`}
                    >
                      <Zap size={13} />
                      <span>{isQuotingThis ? 'Cerrar' : 'Responder en 3s'}</span>
                    </button>
                  )}
                </div>

                {/* FORMULARIO RÁPIDO DE RESPUESTA EN 3 SEGUNDOS */}
                {isQuotingThis && !alreadyQuoted && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Campo 1: Precio $ USD (Obligatorio) */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                          <span>Precio en Dólares ($ USD) *</span>
                          {priceInput && !isNaN(parseFloat(priceInput)) && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ≈ Bs. {(parseFloat(priceInput) * (bcvRate || 1)).toFixed(2)}
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.5"
                            placeholder="0.00"
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            autoFocus
                            className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-base font-bold focus:border-[#00ffb2] outline-none"
                          />
                        </div>
                      </div>

                      {/* Campo 2: Nota Rápida (Opcional, max 90 chars) */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                          <span>Nota Rápida (opcional)</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {quickNote.length}/90
                          </span>
                        </label>
                        <input
                          type="text"
                          maxLength={90}
                          placeholder="Ej: Original en caja, entrega inmediata..."
                          value={quickNote}
                          onChange={(e) => setQuickNote(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-[#00ffb2] outline-none"
                        />
                      </div>
                    </div>

                    {/* Chips de notas rápidas para pulsar en 1 segundo */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold">Sugerencias:</span>
                      {noteSuggestions.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            playTap();
                            setQuickNote(sug);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-[10px] transition cursor-pointer"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>

                    {/* Subida opcional de foto */}
                    <div className="flex items-center gap-3 pt-1">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-xs transition">
                        <Camera size={14} className="text-emerald-400" />
                        <span>{uploadingImage ? 'Subiendo...' : photoUrl ? 'Foto añadida ✓' : 'Subir foto (opcional)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                      {photoUrl && (
                        <span className="text-[10px] text-emerald-400 font-mono truncate max-w-xs">
                          Foto lista para adjuntar
                        </span>
                      )}
                    </div>

                    {/* BOTÓN DE ACCIÓN: LO TENGO — ENVIAR PRECIO */}
                    <button
                      type="button"
                      onClick={() => handleSubmitQuote(req.id)}
                      disabled={isSubmittingThis || !priceInput}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-[#00ffb2] hover:to-emerald-400 text-slate-950 flex items-center justify-center gap-2 transition active:scale-95 shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingThis ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Enviando cotización y sembrando producto...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Lo tengo — Enviar Cotización</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CANDADO B2B: UPGRADE A PLAN ACELERADOR ($45/MES) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl bg-[#040913] border border-amber-500/40 p-6 shadow-2xl text-white space-y-4 overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
            
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                <Crown size={22} />
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="p-1 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Plan Acelerador Aura
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                  $45/mes
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Has alcanzado el límite mensual de 5 respuestas de tu Plan Vitrina. Desbloquea El Megáfono sin restricciones.
              </p>
            </div>

            <div className="space-y-2 text-xs bg-[#02050b] p-3.5 rounded-2xl border border-slate-900">
              <div className="flex items-center gap-2 text-slate-200">
                <Check size={14} className="text-[#00ffb2] shrink-0" />
                <span>Respuestas ilimitadas al Megáfono en Radar.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <Check size={14} className="text-[#00ffb2] shrink-0" />
                <span>Auto-alimentación automática e infinita de tu catálogo.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <Check size={14} className="text-[#00ffb2] shrink-0" />
                <span>Prioridad en cotizaciones modo incógnito ante clientes.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <Check size={14} className="text-[#00ffb2] shrink-0" />
                <span>Contacto directo con enlace a tu WhatsApp de ventas.</span>
              </div>
            </div>

            <a
              href={`https://wa.me/584120000000?text=${encodeURIComponent(
                `Hola equipo Aura, soy de la vitrina "${store.name}". Quiero subir al Plan Acelerador ($45/mes) para tener cotizaciones ilimitadas en El Megáfono.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 flex items-center justify-center gap-2 transition active:scale-95 shadow-lg"
            >
              <span>Activar Plan Acelerador por $45/mes</span>
              <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

