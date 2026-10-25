'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Product, Store, Reservation } from '@/types';
import TopHUD from './TopHUD';
import BottomDock, { GameMode } from './BottomDock';
import SmokeTransition from './SmokeTransition';
import WelcomePortal from './WelcomePortal';
import RadarMode from './modes/RadarMode';
import RelampagoMode from './modes/RelampagoMode';
import ManadasMode from './modes/ManadasMode';
import PasesMode from './modes/PasesMode';
import ProductBottomSheet from './ProductBottomSheet';
import PurchaseCelebrationModal from './PurchaseCelebrationModal';
import WalletModal from '../WalletModal';
import { useReservations, recordCompletedPurchase } from '@/store/useReservations';
import { supabase } from '@/lib/supabase';
import { useGameSound } from '@/hooks/useGameSound';
import MegaphoneGlobalListener from './MegaphoneGlobalListener';
import MegaphoneFloatingCapsule from './MegaphoneFloatingCapsule';
import MegaphoneRadarPanel from './MegaphoneRadarPanel';

interface Props {
  initialProducts: Product[];
  initialStores: Store[];
  initialTasa?: number;
}

export default function AuraGameShell({
  initialProducts,
  initialStores,
  initialTasa = 500.0,
}: Props) {
  const { activeReservation, clearActiveReservation, setActiveReservation } = useReservations();
  const { playUnlockSuccess, playAlertChime } = useGameSound();

  // Lista dinámica de productos en vivo (se actualiza si un producto se agota o se surte)
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);

  useEffect(() => {
    setProductsList(initialProducts);
  }, [initialProducts]);

  // Suscripción en tiempo real a inventario para apagar productos agotados al instante (Botón Rojo o Amarillo)
  useEffect(() => {
    const channel = supabase
      .channel('radar_live_stock_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_products' },
        (payload: any) => {
          if (payload.new) {
            const updated = payload.new;
            if (updated.is_active === false || (updated.stock !== undefined && updated.stock <= 0)) {
              setProductsList((prev) =>
                prev.filter(
                  (p) => p.id !== updated.product_id && p.store_product_id !== updated.id
                )
              );
            } else if (updated.is_active === true && updated.stock > 0) {
              setProductsList((prev) =>
                prev.map((p) => {
                  if (p.id === updated.product_id || p.store_product_id === updated.id) {
                    return { ...p, stock: updated.stock, price: updated.price || p.price };
                  }
                  return p;
                })
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Modo de navegación activo (Portal, Radar, Relámpago, Manadas, Pases)
  const [activeMode, setActiveMode] = useState<GameMode>('portal');

  // Estado del producto seleccionado para el Bottom Sheet
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Estado de celebración de compra concretada en mostrador
  const [celebratedReservation, setCelebratedReservation] = useState<Reservation | null>(null);
  const [currentTrustScore, setCurrentTrustScore] = useState<number>(100);

  // Estado del Modal de Billetera
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  // Saldo a favor (USD)
  const [walletCredit, setWalletCredit] = useState(0.0);

  // Ciudad seleccionada
  const [selectedCity, setSelectedCity] = useState('Cumaná');

  // Trigger para ráfaga de partículas de celebración en canvas
  const [burstTrigger, setBurstTrigger] = useState(0);

  const handleSuccessUnlock = () => {
    // Disparar ráfaga de partículas luminosas
    setBurstTrigger((prev) => prev + 1);
  };

  // Cargar puntaje de confianza inicial (de profiles o localStorage)
  useEffect(() => {
    const loadScore = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('trust_score')
            .eq('id', user.id)
            .maybeSingle();
          if (profile?.trust_score) {
            setCurrentTrustScore(profile.trust_score);
            return;
          }
        }
      } catch {}

      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('aura_trust_score');
        if (local) {
          setCurrentTrustScore(Number(local) || 100);
        }
      }
    };

    loadScore();

    const handleScoreUpdated = (e: any) => {
      if (e.detail?.score) {
        setCurrentTrustScore(e.detail.score);
      } else if (typeof window !== 'undefined') {
        const local = localStorage.getItem('aura_trust_score');
        if (local) setCurrentTrustScore(Number(local) || 100);
      }
    };

    window.addEventListener('aura_trust_score_updated', handleScoreUpdated);
    return () => window.removeEventListener('aura_trust_score_updated', handleScoreUpdated);
  }, []);

  const lastCelebratedPinRef = useRef<string | null>(null);

  const triggerCelebration = useCallback((res: any) => {
    const pin = res?.pin_code || res?.pin || res?.id;
    if (!pin || lastCelebratedPinRef.current === pin) return;
    lastCelebratedPinRef.current = pin;

    playUnlockSuccess();
    setBurstTrigger((prev) => prev + 1);
    setSelectedProduct(null);
    setCelebratedReservation({
      ...res,
      status: 'COMPLETED_IN_STORE',
    });
  }, [playUnlockSuccess]);

  // Retorno desde la pasarela SPIDI: reabrir el producto de la reserva activa.
  // El BottomSheet restaura el paso correcto consultando el estado real al servidor.
  useEffect(() => {
    if (typeof window === 'undefined' || !activeReservation) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_status') !== 'success') return;

    const target = productsList.find(
      (p) => p.id === activeReservation.product_id || p.name === activeReservation.product_name
    );
    if (target) {
      setActiveMode('pases');
      setSelectedProduct(target);
    }
  }, [activeReservation, productsList]);

  // Escuchar evento para abrir detalle de producto / reanudar reserva
  useEffect(() => {
    const handleOpenProduct = (e: any) => {
      if (e.detail?.product) {
        setSelectedProduct(e.detail.product);
      }
    };
    window.addEventListener('aura_open_product', handleOpenProduct);
    return () => window.removeEventListener('aura_open_product', handleOpenProduct);
  }, []);

  // Escuchar evento de ticket completado en mostrador para disparar celebración instantánea
  useEffect(() => {
    const handleTicketCompleted = (e: any) => {
      const res = e.detail?.reservation;
      if (res) {
        triggerCelebration(res);
      }
    };

    window.addEventListener('aura_ticket_completed', handleTicketCompleted);
    return () => window.removeEventListener('aura_ticket_completed', handleTicketCompleted);
  }, [triggerCelebration]);

  // ==============================================================================
  // SINCRONIZACIÓN EN TIEMPO REAL DEL TICKET ACTIVO CON EL MOSTRADOR FÍSICO
  // ==============================================================================
  useEffect(() => {
    if (!activeReservation || (!activeReservation.id && !activeReservation.pin && !activeReservation.pin_code)) return;

    const resId = activeReservation.id;
    let isHandled = false;

    const handleReservationStateChange = async (updated: any) => {
      if (isHandled) return;
      const status = updated.status;

      // 1. COMPRA CONCRETADA EN CAJA (Cajero escaneó el QR / PIN y cobró)
      if (status === 'COMPLETED_IN_STORE' || status === 'completed' || status === 'completada') {
        isHandled = true;

        // Aumentar +10 Puntos de Confianza
        const newScore = Math.min(200, (currentTrustScore || 100) + 10);
        setCurrentTrustScore(newScore);
        if (typeof window !== 'undefined') {
          localStorage.setItem('aura_trust_score', String(newScore));

          // Guardar en historial de compras completadas (con deduplicación estricta por PIN)
          recordCompletedPurchase({
            ...activeReservation,
            status: 'COMPLETED_IN_STORE',
            completed_at: new Date().toISOString(),
          });

          window.dispatchEvent(new CustomEvent('aura_trust_score_updated', { detail: { score: newScore } }));
        }

        // Si el usuario está autenticado, actualizar en Supabase
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('profiles').update({ trust_score: newScore }).eq('id', user.id);
          }
        } catch {}

        triggerCelebration(activeReservation);

        // Limpiar reserva activa para apagar el punto parpadeante en dock
        clearActiveReservation(resId || targetPin);
      }

      // 2. CLIENTE ASISTIÓ PERO NO LLEVÓ (Candado de confianza -> saldo a favor)
      else if (status === 'ATTENDED_NO_SALE') {
        isHandled = true;
        playAlertChime();
        alert('Mostrador: Se confirmó tu visita al local. El producto fue liberado y tu abono fue acreditado a tu Billetera Aura.');
        clearActiveReservation(resId || targetPin);
      }

      // 3. AGOTADO / CANCELADO EN MOSTRADOR
      else if (status === 'cancelled' || status === 'cancelada' || status === 'REJECTED_OUT_OF_STOCK') {
        isHandled = true;
        alert('Mostrador: El comercio notificó que este producto se acaba de agotar en estante.');
        clearActiveReservation(resId || targetPin);
      }

      // 4. ACTUALIZACIÓN A ÚLTIMO PAR O CONFIRMADO
      else if (status === 'ultimo_par' && activeReservation.status !== 'ultimo_par') {
        setActiveReservation({ ...activeReservation, status: 'ultimo_par' });
      }
    };

    const targetPin = activeReservation.pin_code || activeReservation.pin;
    const isValidUUID = Boolean(resId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resId));

    // A. Suscripción por Postgres Changes Realtime
    const channel = supabase
      .channel(`active_res_dock_${targetPin || resId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'reservations', 
          filter: isValidUUID ? `id=eq.${resId}` : undefined 
        },
        (payload: any) => {
          if (payload.new) {
            if (payload.new.pin_code === targetPin || payload.new.id === resId) {
              handleReservationStateChange(payload.new);
            }
          }
        }
      )
      .subscribe();

    // B. Sondeo de respaldo cada 2.5s (busca por UUID o por PIN de 4 dígitos)
    const pollInterval = setInterval(async () => {
      try {
        let query = supabase.from('reservations').select('*');
        if (isValidUUID) {
          query = query.or(`id.eq.${resId},pin_code.eq.${targetPin}`);
        } else if (targetPin) {
          query = query.eq('pin_code', targetPin);
        } else {
          return;
        }

        const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

        if (data) {
          handleReservationStateChange(data);
        }
      } catch {}
    }, 2500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [activeReservation?.id, activeReservation?.pin_code, activeReservation?.pin, currentTrustScore, playUnlockSuccess, playAlertChime, clearActiveReservation, setActiveReservation]);

  return (
    <div className="min-h-screen bg-[#020508] text-white flex flex-col font-sans relative selection:bg-[#00ffb2] selection:text-black">
      
      {/* 1. LUZ AMBIENTAL DE FONDO: AURORA BOREAL EN CIELO NOCTURNO */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Luz Verde Esmeralda Boreal */}
        <div className="absolute top-[-10%] right-[10%] w-[38rem] h-[38rem] rounded-full bg-emerald-500/10 blur-[130px]" />
        {/* Luz Violeta / Índigo Cósmica */}
        <div className="absolute top-[25%] left-[-15%] w-[42rem] h-[42rem] rounded-full bg-purple-900/12 blur-[150px]" />
        {/* Luz Azul Glaciar */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-cyan-600/8 blur-[140px]" />
      </div>

      {/* 2. TOP HUD: BARRA DE ESTADO DEL USUARIO FIJA ARRIBA */}
      <TopHUD
        onOpenWallet={() => setIsWalletOpen(true)}
        walletCreditUSD={walletCredit}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        tasa={initialTasa}
        onGoHome={() => setActiveMode('portal')}
      />

      {/* 3. ÁREA CENTRAL CON TRANSICIÓN DE HUMO / MATERIALIZACIÓN */}
      <main className="relative z-10 flex-1 pt-18 sm:pt-20 max-w-6xl mx-auto w-full">
        <SmokeTransition modeKey={activeMode}>
          {activeMode === 'portal' ? (
            <WelcomePortal onSelectMode={(mode) => setActiveMode(mode)} />
          ) : activeMode === 'radar' ? (
            <RadarMode
              products={productsList}
              stores={initialStores}
              onSelectProduct={(p) => setSelectedProduct(p)}
            />
          ) : activeMode === 'relampago' ? (
            <RelampagoMode
              products={productsList}
              stores={initialStores}
              onSelectProduct={(p) => setSelectedProduct(p)}
            />
          ) : activeMode === 'manadas' ? (
            <ManadasMode
              products={productsList}
              stores={initialStores}
              onSelectProduct={(p) => setSelectedProduct(p)}
            />
          ) : (
            <PasesMode
              onOpenWallet={() => setIsWalletOpen(true)}
              onExploreRadar={() => setActiveMode('radar')}
            />
          )}
        </SmokeTransition>
      </main>

      {/* 4. BOTTOM DOCK: BARRA INFERIOR FIJA CON 4 MODOS DE JUEGO (SE MUESTRA DENTRO DE LOS MODOS) */}
      {activeMode !== 'portal' && (
        <BottomDock
          activeMode={activeMode}
          onChangeMode={setActiveMode}
          hasActiveTicket={!!activeReservation}
        />
      )}

      {/* 5. BOTTOM SHEET MODAL (AL TOCAR CUALQUIER TARJETA) */}
      <ProductBottomSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSuccessUnlock={handleSuccessUnlock}
        stores={initialStores}
        tasa={initialTasa}
      />

      {/* 6. MODAL DE BILLETERA DE SALDO A FAVOR */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
      />

      {/* 7. MODAL DE CELEBRACIÓN DE COMPRA CONCRETADA EN CAJA */}
      <PurchaseCelebrationModal
        reservation={celebratedReservation}
        trustScore={currentTrustScore}
        onClose={() => setCelebratedReservation(null)}
        onViewPases={() => {
          setCelebratedReservation(null);
          setActiveMode('pases');
        }}
      />

      {/* 8. EL MEGÁFONO: LISTENER EN SEGUNDO PLANO Y CÁPSULA FLOTANTE NO INTRUSIVA */}
      <MegaphoneGlobalListener />
      <MegaphoneFloatingCapsule hasActiveReservation={!!activeReservation && !selectedProduct} />
      <MegaphoneRadarPanel bcvRate={initialTasa} />

    </div>
  );
}

