'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReservations, getCleanCompletedTickets, recordCompletedPurchase, getCleanTicketKey } from '@/store/useReservations';
import { useGameSound } from '@/hooks/useGameSound';
import { supabase } from '@/lib/supabase';
import {
  Ticket,
  Clock,
  ShieldCheck,
  Wallet,
  QrCode,
  MapPin,
  Store,
  Phone,
  ArrowRight,
  AlertCircle,
  Sparkles,
  X,
  Award,
  RefreshCw,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import ThanosCard from '@/components/vfx/ThanosCard';
import QRCodeView from '@/components/QRCodeView';

interface Props {
  onOpenWallet: () => void;
  onExploreRadar: () => void;
}

export default function PasesMode({ onOpenWallet, onExploreRadar }: Props) {
  const { activeReservation, activeReservations, clearActiveReservation, setActiveReservation, removeActiveReservation } = useReservations();
  const { playTap } = useGameSound();

  const [activeList, setActiveList] = useState<any[]>([]);
  const [showPagoMovilModal, setShowPagoMovilModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trustScore, setTrustScore] = useState(100);
  const [completedTickets, setCompletedTickets] = useState<any[]>([]);

  // Cargar nivel de confianza, pases activos e historial completado
  const loadUserData = useCallback(async () => {
    // 1. Cargar puntaje e historial local limpio de duplicados
    if (typeof window !== 'undefined') {
      const localScore = localStorage.getItem('aura_trust_score');
      if (localScore) setTrustScore(Number(localScore) || 100);

      const cleanHistory = getCleanCompletedTickets();
      setCompletedTickets(cleanHistory);
    }

    // 2. Cargar lista de pases activos locales
    const localActive = useReservations.getState().activeReservations || [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('trust_score')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.trust_score) {
          setTrustScore(profile.trust_score);
        }
      }

      const phoneSaved = typeof window !== 'undefined' ? localStorage.getItem('aura_customer_phone') : null;

      // Sincronizar compras completadas en Supabase
      let compQuery = supabase
        .from('reservations')
        .select('*')
        .in('status', ['completed', 'completada', 'COMPLETED_IN_STORE']);

      if (user?.id && phoneSaved) {
        compQuery = compQuery.or(`user_id.eq.${user.id},customer_phone.ilike.%${phoneSaved.trim()}%`);
      } else if (user?.id) {
        compQuery = compQuery.eq('user_id', user.id);
      } else if (phoneSaved) {
        compQuery = compQuery.ilike('customer_phone', `%${phoneSaved.trim()}%`);
      }

      const { data: dbCompleted } = await compQuery.order('created_at', { ascending: false }).limit(25);
      if (dbCompleted && dbCompleted.length > 0) {
        setCompletedTickets((prev) => {
          const seen = new Set<string>();
          const clean: any[] = [];

          // Procesar candidatos combinando historial previo y remoto de Supabase con deduplicación estricta por PIN canónico
          const candidateList = [...(Array.isArray(prev) ? prev : []), ...(Array.isArray(dbCompleted) ? dbCompleted : [])];

          for (const item of candidateList) {
            if (!item) continue;
            const key = getCleanTicketKey(item);
            if (!key || seen.has(key)) continue;
            seen.add(key);

            const rawPin = String(item.pin_code || item.pin || '').replace(/[^0-9]/g, '');
            const cleanPin = rawPin.length >= 4 ? rawPin.slice(-4) : (item.pin || item.pin_code || '0000');

            clean.push({
              ...item,
              pin: cleanPin,
              pin_code: cleanPin,
              product_name: item.product_name || 'Producto Retirado',
            });
          }

          if (typeof window !== 'undefined') {
            localStorage.setItem('aura_completed_tickets', JSON.stringify(clean.slice(0, 25)));
          }
          return clean;
        });
      }

      // Sincronizar todos los pases activos en Supabase
      let actQuery = supabase
        .from('reservations')
        .select('*')
        .in('status', ['pending', 'pendiente', 'confirmed', 'confirmada', 'ultimo_par', 'PENDING_STOCK_CHECK', 'STOCK_VERIFIED', 'QR_ACTIVE']);

      if (user?.id && phoneSaved) {
        actQuery = actQuery.or(`user_id.eq.${user.id},customer_phone.ilike.%${phoneSaved.trim()}%`);
      } else if (user?.id) {
        actQuery = actQuery.eq('user_id', user.id);
      } else if (phoneSaved) {
        actQuery = actQuery.ilike('customer_phone', `%${phoneSaved.trim()}%`);
      }

      const { data: dbActive } = await actQuery.order('created_at', { ascending: false }).limit(20);

      const mergedMap = new Map<string, any>();
      localActive.forEach((r) => {
        const pinKey = r.pin_code || r.pin || r.id;
        if (pinKey) mergedMap.set(pinKey, r);
      });

      if (dbActive) {
        dbActive.forEach((r: any) => {
          const pinKey = r.pin_code || r.pin || r.id;
          if (pinKey) {
            const existing = mergedMap.get(pinKey);
            mergedMap.set(pinKey, {
              ...existing,
              ...r,
              id: r.id || existing?.id,
              pin: r.pin_code || r.pin || existing?.pin || '0000',
              product_name: r.product_name || existing?.product_name || 'Producto Apartado',
              price_usd: Number(r.total_price || r.price_usd || existing?.price_usd || 0),
              price_ves: Number((r.total_price || r.price_usd || 0) * (r.bcv_rate || 55)),
            });
          }
        });
      }

      setActiveList(Array.from(mergedMap.values()));
    } catch {}
  }, []);

  useEffect(() => {
    loadUserData();

    const handleScoreUpdated = (e: any) => {
      if (e.detail?.score) {
        setTrustScore(e.detail.score);
      } else {
        loadUserData();
      }
    };

    const handleTicketCompleted = () => {
      loadUserData();
    };

    window.addEventListener('aura_trust_score_updated', handleScoreUpdated);
    window.addEventListener('aura_ticket_completed', handleTicketCompleted);

    // Suscripción en tiempo real a reservations para reflejar compras al instante sin recargar
    const channel = supabase
      .channel('pases_realtime_ledger')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          loadUserData();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('aura_trust_score_updated', handleScoreUpdated);
      window.removeEventListener('aura_ticket_completed', handleTicketCompleted);
      supabase.removeChannel(channel);
    };
  }, [loadUserData]);

  // Verificación en vivo automática cada 3s mientras el usuario ve sus pases
  useEffect(() => {
    if (activeList.length === 0) return;

    const checkLiveAll = async () => {
      for (const pass of activeList) {
        const targetPin = pass.pin_code || pass.pin;
        const targetId = pass.id;
        const isValidUUID = Boolean(targetId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId));

        try {
          let query = supabase.from('reservations').select('*');
          if (isValidUUID) {
            query = query.or(`id.eq.${targetId},pin_code.eq.${targetPin}`);
          } else if (targetPin) {
            query = query.eq('pin_code', targetPin);
          } else {
            continue;
          }

          const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

          if (data) {
            if (data.status === 'COMPLETED_IN_STORE' || data.status === 'completed' || data.status === 'completada') {
              const completedRes = { ...pass, ...data, status: 'COMPLETED_IN_STORE' };
              recordCompletedPurchase(completedRes);
              removeActiveReservation(data.id || data.pin_code || targetPin);
              loadUserData();
              window.dispatchEvent(new CustomEvent('aura_trust_score_updated'));
              window.dispatchEvent(new CustomEvent('aura_ticket_completed', { detail: { reservation: completedRes } }));
            } else if (data.status === 'ATTENDED_NO_SALE' || data.status === 'cancelled' || data.status === 'cancelada') {
              removeActiveReservation(data.id || data.pin_code || targetPin);
              loadUserData();
            } else if (data.status !== pass.status) {
              setActiveList((prev) =>
                prev.map((p) => {
                  if ((p.id && p.id === data.id) || (p.pin && p.pin === data.pin_code)) {
                    return { ...p, status: data.status };
                  }
                  return p;
                })
              );
            }
          }
        } catch {}
      }
    };

    const interval = setInterval(checkLiveAll, 3000);
    return () => clearInterval(interval);
  }, [activeList, loadUserData, removeActiveReservation]);

  const handleCancelPass = async (res: any) => {
    const targetPin = res.pin_code || res.pin;
    const targetId = res.id;
    const isValidUUID = Boolean(targetId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId));

    const isStep1Paid =
      res.aura_fee_status === 'paid' ||
      res.spidi_status === 'paid' ||
      Boolean(res.aura_fee_reference && res.aura_fee_reference !== 'Pendiente');

    const promptMsg = isStep1Paid
      ? `¿Deseas cancelar este apartado? La tarifa del 5% que pagaste se acreditará de inmediato a tu Billetera Aura.`
      : `¿Deseas cancelar esta reserva (#${targetPin})? El producto quedará disponible nuevamente para la tienda.`;

    if (!confirm(promptMsg)) return;

    try {
      if (isStep1Paid) {
        const feeToRefund = Number(res.unlock_fee_usd || (Number(res.price_usd || 0) * 0.05).toFixed(2));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase.from('profiles').select('wallet_credit_usd').eq('id', user.id).maybeSingle();
          const currentCredit = Number(prof?.wallet_credit_usd || 0);
          await supabase.from('profiles').update({ wallet_credit_usd: Number((currentCredit + feeToRefund).toFixed(2)) }).eq('id', user.id);
        }

        const updateData = {
          status: 'cancelled',
          aura_fee_status: 'refunded_to_wallet',
          notes: `Cancelado por el cliente. Reembolsados $${feeToRefund.toFixed(2)} USD a Billetera Aura.`
        };

        const dbResult = isValidUUID
          ? await supabase.from('reservations').update(updateData).eq('id', targetId)
          : await supabase.from('reservations').update(updateData).eq('pin_code', targetPin);

        if (dbResult?.error) {
          const coreData = { status: 'cancelled', aura_fee_status: 'refunded_to_wallet' };
          if (isValidUUID) await supabase.from('reservations').update(coreData).eq('id', targetId);
          if (targetPin) await supabase.from('reservations').update(coreData).eq('pin_code', targetPin);
        } else if (isValidUUID && targetPin) {
          await supabase.from('reservations').update(updateData).eq('pin_code', targetPin);
        }

        window.dispatchEvent(new CustomEvent('aura_wallet_updated'));
        window.dispatchEvent(new CustomEvent('aura_trust_score_updated'));
        alert(`✓ Reserva cancelada. Se han acreditado $${feeToRefund.toFixed(2)} USD a tu Billetera Aura.`);
      } else {
        const updateData = {
          status: 'cancelled',
          notes: 'Cancelado por el cliente antes de concretar la reserva'
        };

        const dbResult = isValidUUID
          ? await supabase.from('reservations').update(updateData).eq('id', targetId)
          : await supabase.from('reservations').update(updateData).eq('pin_code', targetPin);

        if (dbResult?.error) {
          const coreData = { status: 'cancelled' };
          if (isValidUUID) await supabase.from('reservations').update(coreData).eq('id', targetId);
          if (targetPin) await supabase.from('reservations').update(coreData).eq('pin_code', targetPin);
        } else if (isValidUUID && targetPin) {
          await supabase.from('reservations').update(updateData).eq('pin_code', targetPin);
        }
      }
    } catch {}

    removeActiveReservation(targetId || targetPin);
    loadUserData();
  };

  const getRankInfo = (score: number) => {
    if (score >= 95) {
      return {
        name: 'Nivel Oro VIP',
        color: 'text-amber-400',
        border: 'border-slate-800',
        bg: 'bg-amber-950/20',
        bar: 'bg-gradient-to-r from-amber-400 to-yellow-300',
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]',
      };
    }
    if (score >= 80) {
      return {
        name: 'Nivel Plata',
        color: 'text-slate-200',
        border: 'border-slate-800',
        bg: 'bg-slate-900/40',
        bar: 'bg-gradient-to-r from-slate-400 to-slate-200',
        dot: 'bg-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.9)]',
      };
    }
    return {
      name: 'Nivel Bronce',
      color: 'text-emerald-400',
      border: 'border-slate-800',
      bg: 'bg-slate-900/40',
      bar: 'bg-gradient-to-r from-teal-500 to-[#00ffb2]',
      dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(0,255,178,0.9)]',
    };
  };

  const rank = getRankInfo(trustScore);
  const scorePercent = Math.min(100, Math.round((trustScore / 200) * 100));

  const isPendingCheck = activeReservation?.status === 'pending' || activeReservation?.status === 'PENDING_STOCK_CHECK';
  const isUltimoPar = activeReservation?.status === 'ultimo_par';
  const isApartado = activeReservation?.payment_type === 'apartado_7d' || activeReservation?.payment_type === 'apartado_15d' || Boolean(activeReservation?.initial_deposit);

  return (
    <div className="space-y-6 pb-24 px-4 max-w-xl mx-auto select-none">
      
      {/* ==============================================================================
          1. SECCIÓN DE PASES ACTIVOS (LISTA DE TICKETS QR Y APARTADOS EN VIVO)
          ============================================================================== */}
      {activeList.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-white">
              <Ticket size={16} className="text-[#00ffb2]" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Pases de Retiro Activos ({activeList.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={async () => {
                playTap();
                setIsRefreshing(true);
                await loadUserData();
                setIsRefreshing(false);
              }}
              disabled={isRefreshing}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-[#00ffb2]' : ''} />
              <span>Sincronizar</span>
            </button>
          </div>

          <div className="space-y-4">
            {activeList.map((pass) => {
              const targetPin = pass.pin_code || pass.pin || '0000';
              const priceUsd = Number(pass.price_usd || pass.total_price || 0);
              const priceVes = Number(pass.price_ves || (priceUsd * (pass.bcv_rate || 55)));

              // 1. ¿Es un pase o ticket oficial confirmado y listo para retirar en caja?
              const isTrueReadyTicket =
                (pass.payment_type === 'reserva_3h' || pass.current_step === 'OPTION_A_TICKET') ||
                ((pass.payment_type === 'apartado_7d' || pass.payment_type === 'apartado_15d') && (pass.payment_reference || pass.current_step === 'OPTION_B_CONFIRMED'));

              // 2. ¿Está en proceso de apartado esperando el pago?
              const isApartadoPendingPayment =
                (pass.payment_type === 'apartado_7d' || pass.payment_type === 'apartado_15d' || pass.current_step === 'OPTION_B_LAYAWAY') &&
                !pass.payment_reference &&
                pass.current_step !== 'OPTION_B_CONFIRMED';

              // 3. ¿El comercio confirmó stock pero el cliente aún no elige opción (3h o 7d)?
              const isStockConfirmedWaitingChoice =
                !isTrueReadyTicket &&
                !isApartadoPendingPayment &&
                (pass.status === 'STOCK_VERIFIED' || pass.status === 'confirmed' || pass.status === 'confirmada' || pass.status === 'ultimo_par');

              // 4. ¿Esperando semáforo del encargado?
              const isWaitingStock =
                pass.status === 'pending' || pass.status === 'pendiente' || pass.status === 'PENDING_STOCK_CHECK';

              const handleResume = () => {
                playTap();
                const productFromPass = {
                  id: pass.product_id,
                  name: pass.product_name,
                  price: priceUsd,
                  regular_price_usd: priceUsd,
                  aura_price_usd: priceUsd,
                  store_id: pass.store_id,
                  imageUrl: pass.product_image || '',
                  category: 'RETAIL_STANDARD' as const,
                };
                useReservations.getState().setActiveReservation(pass);
                window.dispatchEvent(new CustomEvent('aura_open_product', { detail: { product: productFromPass } }));
              };

              return (
                <div
                  key={pass.id || targetPin}
                  className="relative overflow-hidden bg-[#050b16]/85 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.65)] space-y-4"
                >
                  {/* Reflejo especular superior fino */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-600/30 to-transparent" />

                  {/* Header de la tarjeta */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      {isTrueReadyTicket ? (
                        pass.payment_type === 'apartado_7d' ? (
                          <span className="px-2.5 py-1 rounded-full bg-slate-900 text-indigo-300 text-[11px] font-bold border border-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                            Apartado en Depósito (7 Días)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-900 text-emerald-400 text-[11px] font-bold border border-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Listo para retirar en mostrador (3 Horas)
                          </span>
                        )
                      ) : isApartadoPendingPayment ? (
                        <span className="px-2.5 py-1 rounded-full bg-slate-900 text-indigo-300 text-[11px] font-bold border border-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                          Apartado en Progreso (Pago Pendiente)
                        </span>
                      ) : isStockConfirmedWaitingChoice ? (
                        <span className="px-2.5 py-1 rounded-full bg-slate-900 text-emerald-400 text-[11px] font-bold border border-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Stock Confirmado • Elige tu forma de retiro
                        </span>
                      ) : isWaitingStock ? (
                        <span className="px-2.5 py-1 rounded-full bg-slate-900 text-amber-300 text-[11px] font-bold border border-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          Esperando confirmación de mostrador
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 text-[11px] font-bold border border-slate-800">
                          Solicitud Activa
                        </span>
                      )}
                    </div>

                    <span className="font-mono text-xs font-black text-white bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                      PIN #{targetPin}
                    </span>
                  </div>

                  {/* Producto y Tienda */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-950 overflow-hidden relative shrink-0 border border-slate-800">
                      {pass.product_image ? (
                        <img
                          src={pass.product_image}
                          alt={pass.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-600 font-bold">
                          Aura
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h3 className="font-bold text-slate-100 text-sm sm:text-base truncate">
                        {pass.product_name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                        <Store size={12} className="text-emerald-400" />
                        <span className="truncate">{pass.store_name}</span>
                      </div>
                      {pass.store_address && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-light truncate">
                          <MapPin size={10} className="text-slate-500" />
                          <span className="truncate">{pass.store_address}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-white block">
                        ${priceUsd.toFixed(2)} USD
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Bs. {priceVes.toLocaleString('es-VE')}
                      </span>
                    </div>
                  </div>

                  {/* CONTENIDO SEGÚN ESTADO DE LA RESERVA */}

                  {/* CASO A: TICKET OFICIAL LISTO PARA COBRO Y ENTREGA */}
                  {isTrueReadyTicket && (
                    <div className="bg-[#030812] border border-slate-800 rounded-2xl p-4 text-center space-y-2.5 shadow-inner">
                      <div className="flex justify-center">
                        <QRCodeView value={targetPin} size={120} />
                      </div>

                      <div>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                          Muestra este PIN al encargado en mostrador:
                        </span>
                        <div className="font-mono text-3xl font-black text-[#00ffb2] tracking-widest drop-shadow-[0_0_12px_rgba(0,255,178,0.4)]">
                          #{targetPin}
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-light pt-0.5">
                        <Clock size={12} className="text-amber-400" />
                        <span>{pass.payment_type === 'apartado_7d' ? 'Resguardado en depósito de la tienda (7 Días)' : 'Precio congelado por 3 horas en estante'}</span>
                      </div>
                    </div>
                  )}

                  {/* CASO B: STOCK CONFIRMADO POR TIENDA - ESPERANDO ELECCIÓN DEL CLIENTE */}
                  {isStockConfirmedWaitingChoice && (
                    <div className="bg-[#030812] border border-emerald-900/50 rounded-2xl p-4 space-y-3">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-emerald-300">
                          ¡La tienda confirmó que tiene tu producto disponible!
                        </h4>
                        <p className="text-[11px] text-slate-300 font-light">
                          Selecciona si deseas ir a retirarlo hoy mismo gratis (3 horas) o apartarlo por 7 días en depósito para generar tu boleto oficial.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleResume}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <span>Elegir Opción de Retiro</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {/* CASO C: APARTADO EN PROGRESO PENDIENTE DE PAGO */}
                  {isApartadoPendingPayment && (
                    <div className="bg-[#030812] border border-indigo-900/50 rounded-2xl p-4 space-y-3">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-indigo-300">
                          Apartado Digital en Progreso (7 Días)
                        </h4>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-0.5">
                          <span>
                            Paso 1 (Tarifa Aura 5%):{' '}
                            <strong className={pass.aura_fee_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}>
                              {pass.aura_fee_status === 'paid' ? '✓ Pagado' : 'Pendiente'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Paso 2 (Inicial 30%): <strong className="text-amber-400">Pendiente</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleResume}
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <span>Reanudar y Completar Pago</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {/* CASO D: ESPERANDO SEMÁFORO DE MOSTRADOR */}
                  {isWaitingStock && (
                    <div className="bg-[#030812] border border-slate-800 rounded-2xl p-4 text-center space-y-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mx-auto" />
                      <p className="text-xs text-slate-300 font-light">
                        El personal de <strong className="text-white">{pass.store_name}</strong> está verificando el estante físico en este momento. Te avisaremos apenas respondan.
                      </p>
                    </div>
                  )}

                  {/* Acciones del pase */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    {pass.store_whatsapp ? (
                      <a
                        href={`https://wa.me/${pass.store_whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 font-bold transition flex items-center gap-1"
                      >
                        <span>WhatsApp tienda</span>
                        <ArrowRight size={12} />
                      </a>
                    ) : (
                      <span />
                    )}

                    <button
                      type="button"
                      onClick={() => handleCancelPass(pass)}
                      className="text-slate-500 hover:text-rose-400 text-xs transition cursor-pointer underline font-light"
                    >
                      {isApartadoPendingPayment && pass.aura_fee_status === 'paid'
                        ? 'Cancelar apartado (Reembolsar a Billetera)'
                        : 'Cancelar solicitud'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ESTADO VACÍO (SIN PASES ACTIVOS) */
        <div className="relative overflow-hidden bg-[#050b16]/85 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

          <div className="w-16 h-16 rounded-2xl bg-[#030812]/90 text-cyan-400 flex items-center justify-center mx-auto shadow-inner border border-slate-800">
            <Ticket size={28} className="drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-slate-100 text-lg sm:text-xl">
              No tienes pases activos en este momento
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto font-light leading-relaxed">
              Explora el Radar o las vitrinas de los comercios y aparta cualquier producto sin pagar nada por adelantado.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              playTap();
              onExploreRadar();
            }}
            className="game-sweep bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-[#00ffb2] hover:to-emerald-400 text-slate-100 hover:text-black font-bold px-6 py-3 rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-md"
          >
            Explorar Productos en Radar
          </button>
        </div>
      )}

      {/* ==============================================================================
          2. TARJETA PERMANENTE: NIVEL DE CONFIANZA Y REPUTACIÓN AURA
          ============================================================================== */}
      <div className={`relative overflow-hidden ${rank.bg} border ${rank.border} backdrop-blur-xl rounded-3xl p-5 sm:p-6 space-y-3.5 shadow-xl`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#030812]/90 flex items-center justify-center text-[#00ffb2] border border-slate-800 shadow-inner">
              <Award size={22} className={rank.color} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-black text-sm sm:text-base ${rank.color}`}>
                  {rank.name}
                </span>
                <span className={`w-2 h-2 rounded-full ${rank.dot}`} />
              </div>
              <p className="text-xs text-slate-400 font-light">Nivel de Reputación en Aura</p>
            </div>
          </div>

          <div className="text-right">
            <span className="font-mono text-2xl font-black text-white">{trustScore}</span>
            <span className="text-[10px] text-slate-400 block font-bold">PUNTOS</span>
          </div>
        </div>

        {/* Barra de progreso visual */}
        <div className="space-y-1">
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full ${rank.bar} transition-all duration-500`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
            <span>{trustScore} pts acumulados</span>
            <span className="text-emerald-400 font-bold">+10 pts por cada compra en tienda</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-300 font-light leading-relaxed pt-1 border-t border-slate-800/60">
          Cada vez que retiras un producto a tiempo en la caja de un comercio, subes <strong>+10 puntos</strong>. A mayor puntaje, desbloqueas apartados prioritarios y promociones exclusivas.
        </p>
      </div>

      {/* ==============================================================================
          3. HISTORIAL DE COMPRAS CONCRETADAS EN TIENDA
          ============================================================================== */}
      {completedTickets.length > 0 && (
        <div className="relative overflow-hidden bg-[#050b16]/85 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
              <CheckCircle2 size={15} className="text-[#00ffb2]" />
              <span>Historial de Compras Concretadas ({completedTickets.length})</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">✓ Verificados</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {completedTickets.map((t, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center font-mono font-bold text-emerald-400 border border-slate-800 shrink-0">
                    #{t.pin}
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-white truncate text-xs">{t.product_name}</h5>
                    <p className="text-[10px] text-slate-400 truncate">{t.store_name}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-[#00ffb2] block text-xs">
                    +10 pts ganados
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ${(t.store_pay_balance_usd || t.price_usd || 0).toFixed(2)} USD
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==============================================================================
          4. ACCESO DIRECTO A BILLETERA DE PROTECCIÓN
          ============================================================================== */}
      <div className="relative overflow-hidden bg-[#050b16]/85 backdrop-blur-xl rounded-3xl p-5 flex items-center justify-between gap-3 shadow-[0_15px_35px_rgba(0,0,0,0.5)] border border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#030812]/90 text-[#00ffb2] flex items-center justify-center font-bold shadow-inner border border-slate-800">
            <Wallet size={20} />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-sm">Billetera de Protección</div>
            <div className="text-xs text-slate-400 font-light">Candado de Confianza y Saldo a Favor</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playTap();
            onOpenWallet();
          }}
          className="cursor-pointer bg-[#030812]/90 hover:bg-[#071322] text-slate-200 px-4 py-2 rounded-xl text-xs font-medium transition active:scale-95 shadow-sm border border-slate-800"
        >
          Consultar
        </button>
      </div>

      {/* MODAL PAGO MÓVIL DIRECTO */}
      {showPagoMovilModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative overflow-hidden w-full max-w-sm bg-[#050b16]/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl space-y-4 border border-indigo-500/40">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <Phone size={18} className="text-indigo-400" />
                <span>Pago Móvil Directo al Comercio</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPagoMovilModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-light">
              Para apartar en depósito por 7 días, abona el 5% de desbloqueo a Aura y el 30% inicial a <strong className="text-slate-100 font-semibold">{activeReservation?.store_name}</strong>. El 70% restante se liquida en caja al retirar.
            </p>

            <div className="p-3.5 bg-[#030812]/90 rounded-2xl space-y-2 text-xs shadow-inner border border-slate-800">
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Desbloqueo Aura (5%):</span>
                <span className="text-[#00ffb2] font-mono font-bold">${((activeReservation?.price_usd || 10) * 0.05).toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Abono Inicial Tienda (30%):</span>
                <span className="text-indigo-300 font-mono font-bold">${((activeReservation?.price_usd || 10) * 0.30).toFixed(2)} USD</span>
              </div>
              <div className="pt-0.5 space-y-0.5">
                <div className="text-slate-500 text-[10px] uppercase">Pago Móvil Comercio:</div>
                <div className="font-mono font-bold text-teal-300">{activeReservation?.store_whatsapp || '0414-798-1234'} (0102 BDV)</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPagoMovilModal(false)}
              className="game-sweep w-full bg-gradient-to-r from-indigo-800 to-purple-800 text-slate-100 font-bold py-3 rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-md"
            >
              Listo, Comprendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
