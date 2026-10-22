'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReservations } from '@/store/useReservations';
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
  const { activeReservation, clearActiveReservation, setActiveReservation } = useReservations();
  const { playTap } = useGameSound();

  const [showPagoMovilModal, setShowPagoMovilModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trustScore, setTrustScore] = useState(100);
  const [completedTickets, setCompletedTickets] = useState<any[]>([]);

  // Cargar nivel de confianza e historial completado
  const loadUserData = useCallback(async () => {
    // 1. Cargar puntaje
    if (typeof window !== 'undefined') {
      const localScore = localStorage.getItem('aura_trust_score');
      if (localScore) setTrustScore(Number(localScore) || 100);

      const historyRaw = localStorage.getItem('aura_completed_tickets');
      if (historyRaw) {
        try {
          setCompletedTickets(JSON.parse(historyRaw));
        } catch {}
      }
    }

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

    window.addEventListener('aura_trust_score_updated', handleScoreUpdated);
    return () => window.removeEventListener('aura_trust_score_updated', handleScoreUpdated);
  }, [loadUserData]);

  // Comprobar manualmente estado en vivo con el mostrador
  const handleCheckLiveStatus = async () => {
    if (!activeReservation?.id) return;
    playTap();
    setIsRefreshing(true);
    try {
      const { data } = await supabase
        .from('reservations')
        .select('id, status, pin_code, pin, store_name, customer_name, confirmed_at')
        .eq('id', activeReservation.id)
        .maybeSingle();

      if (data) {
        if (data.status === 'COMPLETED_IN_STORE' || data.status === 'completed' || data.status === 'completada') {
          alert('¡Tu ticket ya fue cobrado y entregado en mostrador! 🎉 Se sumaron +10 puntos a tu Nivel de Confianza.');
          clearActiveReservation();
          loadUserData();
        } else if (data.status === 'ATTENDED_NO_SALE') {
          alert('Mostrador: El stock fue liberado. Tu saldo ha sido acreditado en tu Billetera Aura.');
          clearActiveReservation();
        } else if (data.status === 'cancelled' || data.status === 'cancelada') {
          alert('Mostrador: La tienda notificó que el producto se agotó.');
          clearActiveReservation();
        } else if (data.status !== activeReservation.status) {
          setActiveReservation({ ...activeReservation, status: data.status });
        }
      }
    } catch (err) {
      console.warn('Error verificando estado:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getRankInfo = (score: number) => {
    if (score >= 95) {
      return {
        name: 'Nivel Oro VIP',
        color: 'text-amber-400',
        border: 'border-amber-500/40',
        bg: 'bg-amber-950/20',
        bar: 'bg-gradient-to-r from-amber-400 to-yellow-300',
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]',
      };
    }
    if (score >= 80) {
      return {
        name: 'Nivel Plata',
        color: 'text-slate-200',
        border: 'border-slate-400/40',
        bg: 'bg-slate-900/40',
        bar: 'bg-gradient-to-r from-slate-400 to-slate-200',
        dot: 'bg-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.9)]',
      };
    }
    return {
      name: 'Nivel Bronce',
      color: 'text-emerald-400',
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-950/30',
      bar: 'bg-gradient-to-r from-teal-500 to-[#00ffb2]',
      dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(0,255,178,0.9)]',
    };
  };

  const rank = getRankInfo(trustScore);
  const scorePercent = Math.min(100, Math.round((trustScore / 200) * 100));

  const isPendingCheck = activeReservation?.status === 'pending' || activeReservation?.status === 'PENDING_STOCK_CHECK';
  const isUltimoPar = activeReservation?.status === 'ultimo_par';

  return (
    <div className="space-y-6 pb-24 px-4 max-w-xl mx-auto select-none">
      
      {/* ==============================================================================
          1. SECCIÓN DE PASE ACTIVO (TICKET QR DE 3 HORAS)
          ============================================================================== */}
      {activeReservation ? (
        <ThanosCard intensity="epic">
          <div className="relative overflow-hidden bg-[#050b16]/85 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.65)] space-y-5">
            {/* Reflejo especular superior fino */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffb2]/40 to-transparent" />

            {/* Header del Ticket con Estado en Vivo */}
            <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                {isPendingCheck ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Esperando Semáforo en Mostrador
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00ffb2] animate-ping" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#00ffb2]">
                      Pase Oficial de Retiro Activo
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleCheckLiveStatus}
                disabled={isRefreshing}
                title="Sincronizar con mostrador"
                className="cursor-pointer p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1 text-[11px]"
              >
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-[#00ffb2]' : ''} />
                <span className="font-mono text-slate-300">#{activeReservation.pin}</span>
              </button>
            </div>

            {/* Banner condicional de Última Unidad */}
            {isUltimoPar && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center gap-2.5 text-xs text-amber-300">
                <AlertCircle size={16} className="text-amber-400 shrink-0" />
                <span><strong>¡Última unidad en estante!</strong> El encargado la apartó en mostrador para tu retiro.</span>
              </div>
            )}

            {/* Información del Producto y Comercio */}
            <div className="relative z-10 flex items-center gap-3.5">
              <div className="w-16 h-16 rounded-2xl bg-slate-950/80 overflow-hidden relative shrink-0 border border-slate-800">
                {activeReservation.product_image ? (
                  <img
                    src={activeReservation.product_image}
                    alt={activeReservation.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-600 font-bold">
                    Aura
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <h3 className="font-bold text-slate-100 text-base truncate">
                  {activeReservation.product_name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <Store size={13} />
                  <span className="truncate">{activeReservation.store_name}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-light">
                  <MapPin size={11} className="text-slate-500" />
                  <span>{activeReservation.store_address || 'Cumaná, Sucre'}</span>
                </div>
              </div>
            </div>

            {/* CÓDIGO PIN DESTACADO & QR */}
            <div className="relative overflow-hidden bg-[#030812]/90 backdrop-blur-xl rounded-2xl p-5 text-center space-y-3 shadow-inner">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
              
              <div className="flex justify-center">
                <QRCodeView value={activeReservation.pin} size={140} />
              </div>

              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                  Muestra este PIN al encargado en mostrador:
                </span>
                <div className="font-mono text-3xl sm:text-4xl font-black text-[#00ffb2] tracking-widest drop-shadow-[0_0_12px_rgba(0,255,178,0.5)]">
                  #{activeReservation.pin}
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-300 font-light pt-1">
                <Clock size={13} className="text-indigo-400" />
                <span>Precio congelado por 3 horas en estante</span>
              </div>
            </div>

            {/* DESGLOSE FINANCIERO */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[#030812]/75 backdrop-blur-md rounded-2xl relative overflow-hidden border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block uppercase font-light">Anticipo Desbloqueo:</span>
                <span className="font-bold text-[#00ffb2] text-sm sm:text-base">
                  ${(activeReservation.unlock_fee_usd || 0).toFixed(2)} USD
                </span>
              </div>

              <div className="p-3.5 bg-[#030812]/75 backdrop-blur-md rounded-2xl relative overflow-hidden border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block uppercase font-light">A Pagar en Caja:</span>
                <span className="font-bold text-slate-100 text-sm sm:text-base">
                  ${(activeReservation.store_pay_balance_usd || activeReservation.price_usd).toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* BOTÓN APARTADO DIGITAL 30% */}
            <button
              type="button"
              onClick={() => {
                playTap();
                setShowPagoMovilModal(true);
              }}
              className="game-sweep w-full bg-gradient-to-r from-indigo-900/90 via-indigo-700/80 to-purple-800 text-slate-100 font-black py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              <span>Asegurar Ya con Pago Móvil Directo (15-30 Días)</span>
              <ArrowRight size={14} />
            </button>

            {/* Cancelar Reserva */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  if (confirm('¿Deseas liberar esta reserva para otros compradores?')) {
                    clearActiveReservation();
                  }
                }}
                className="text-xs text-rose-400/70 hover:text-rose-300 underline cursor-pointer font-light transition-colors"
              >
                Liberar reserva
              </button>
            </div>
          </div>
        </ThanosCard>
      ) : (
        /* ESTADO VACÍO (SIN PASES ACTIVOS) */
        <div className="relative overflow-hidden bg-[#050b16]/85 backdrop-blur-xl rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
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
              Transfiere directamente de tu banco al banco de la tienda <strong className="text-slate-100 font-semibold">{activeReservation?.store_name}</strong> para asegurar tu apartado de 15 a 30 días.
            </p>

            <div className="p-3.5 bg-[#030812]/90 rounded-2xl space-y-1 text-xs shadow-inner border border-slate-800">
              <div className="text-slate-500 text-[10px] font-light uppercase">Banco Destino:</div>
              <div className="font-medium text-slate-200">0102 Banco de Venezuela</div>
              <div className="text-slate-500 text-[10px] font-light uppercase mt-2">Teléfono / Pago Móvil:</div>
              <div className="font-mono font-bold text-teal-300">{activeReservation?.store_whatsapp || '0414-798-1234'}</div>
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
