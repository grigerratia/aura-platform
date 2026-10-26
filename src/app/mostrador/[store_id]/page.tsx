'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Reservation, Store } from '@/types';
import { logLostDemand, refundFeeToWallet } from '@/lib/monetization';
import { useGameSound } from '@/hooks/useGameSound';
import {
  Store as StoreIcon, Lock, CheckCircle2, AlertCircle,
  Clock, Check, X, ShieldCheck, RefreshCw, LogOut,
  Smartphone, Search, ChevronRight, Sparkles, QrCode, Radio, Megaphone
} from 'lucide-react';
import Link from 'next/link';
import MegaphoneMerchantWidget from '@/components/merchant/MegaphoneMerchantWidget';

export default function MostradorPage() {
  const params = useParams();
  const storeId = params?.store_id as string;
  const router = useRouter();
  const { playAlertChime, playUnlockSuccess } = useGameSound();

  // Estados de la tienda y autenticación por PIN
  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinAttempt, setPinAttempt] = useState('');
  const [pinError, setPinError] = useState(false);

  // Pestañas del Mostrador
  const [activeTab, setActiveTab] = useState<'semaphore' | 'validate' | 'history' | 'megaphone'>('semaphore');
  const [openMegaphoneCount, setOpenMegaphoneCount] = useState(0);

  // Reservas pendientes y en curso
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const prevPendingCount = useRef<number>(0);

  // Validación de Ticket en Caja
  const [ticketSearch, setTicketSearch] = useState('');
  const [foundReservation, setFoundReservation] = useState<Reservation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [validationSuccessMsg, setValidationSuccessMsg] = useState<string | null>(null);
  const [dismissedCancelledIds, setDismissedCancelledIds] = useState<string[]>([]);

  // Cargar IDs de alertas canceladas descartadas previamente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const key = storeId ? `aura_dismissed_cancelled_${storeId}` : 'aura_dismissed_cancelled';
        const saved = localStorage.getItem(key);
        const globalSaved = localStorage.getItem('aura_dismissed_cancelled');
        const list1 = saved ? JSON.parse(saved) : [];
        const list2 = globalSaved ? JSON.parse(globalSaved) : [];
        setDismissedCancelledIds(Array.from(new Set([...list1, ...list2].map(String))));
      } catch {}
    }
  }, [storeId]);

  const handleDismissCancelled = useCallback((id: string, pin?: string, pinCode?: string) => {
    setDismissedCancelledIds((prev) => {
      const itemsToAdd = [id, pin, pinCode].filter(Boolean).map(String);
      const next = Array.from(new Set([...prev, ...itemsToAdd]));
      if (typeof window !== 'undefined') {
        try {
          if (storeId) localStorage.setItem(`aura_dismissed_cancelled_${storeId}`, JSON.stringify(next));
          localStorage.setItem('aura_dismissed_cancelled', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, [storeId]);

  const fetchStore = useCallback(async () => {
    if (!storeId) return;
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, logo_url, zone, address, cashier_access_pin, badges, owner_whatsapp')
        .eq('id', storeId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setStore(data as Store);
        // Verificar si ya tiene sesión en sessionStorage
        const savedAuth = sessionStorage.getItem(`aura_mostrador_${storeId}`);
        if (savedAuth === 'true') {
          setIsAuthenticated(true);
        }
      }
    } catch (err) {
      console.error('Error cargando tienda para mostrador:', err);
    } finally {
      setLoadingStore(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  // 2. Cargar reservas en tiempo real para el mostrador (Consulta limpia y unificada)
  const fetchReservations = useCallback(async () => {
    if (!storeId || !isAuthenticated) return;
    setLoadingReservations(true);
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((r: any) => {
          const priceUsd = Number(r.total_price || r.price_usd || 0);
          return {
            ...r,
            price_usd: priceUsd,
            store_pay_balance_usd: r.store_pay_balance_usd 
              ? Number(r.store_pay_balance_usd) 
              : priceUsd - (Number(r.unlock_fee_usd) || 0),
            pin: r.pin || r.pin_code || (r.id ? r.id.slice(0, 4).toUpperCase() : '0000')
          };
        });

        // Contar pendientes actuales
        const currentPending = mapped.filter(
          (r) => r.status === 'pending' || r.status === 'pendiente' || r.status === 'PENDING_STOCK_CHECK' || r.status === 'confirmed' || r.status === 'confirmada'
        ).length;

        // Si llegó una nueva solicitud de verificación de estante, sonar alerta
        if (currentPending > prevPendingCount.current) {
          playAlertChime();
        }
        prevPendingCount.current = currentPending;

        setReservations(mapped);
      }
    } catch (err) {
      console.error('Error cargando reservas de mostrador:', err);
    } finally {
      setLoadingReservations(false);
    }
  }, [storeId, isAuthenticated, playAlertChime]);

  // FIX: Eliminado playAlertChime y fetchReservations de las dependencias para evitar bucle infinito
  useEffect(() => {
    if (isAuthenticated) {
      fetchReservations();
      // Suscripción en tiempo real
      const channel = supabase
        .channel(`mostrador_${storeId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reservations', filter: `store_id=eq.${storeId}` },
          () => {
            fetchReservations();
          }
        )
        .subscribe();

      // Sondeo de respaldo cada 5 segundos para reducir carga innecesaria
      const pollInterval = setInterval(() => {
        fetchReservations();
      }, 5000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, storeId]);

  // Solicitudes abiertas del Megáfono en mostrador
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { count } = await supabase
          .from('megaphone_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'OPEN');
        setOpenMegaphoneCount(count || 0);
      } catch {}
    };

    fetchCount();

    const channel = supabase
      .channel('mostrador_megaphone_count_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'megaphone_requests' },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    const interval = setInterval(fetchCount, 6000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const handlePinLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    const correctPin = store.cashier_access_pin || '1234';
    if (pinAttempt.trim() === correctPin) {
      setIsAuthenticated(true);
      setPinError(false);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`aura_mostrador_${storeId}`, 'true');
      }
    } else {
      setPinError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPinAttempt('');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`aura_mostrador_${storeId}`);
    }
  };

  // Acciones de actualización de stock y confirmación de estante
  const handleUpdateStatus = async (reservationId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', reservationId);

      if (error) throw error;
      playUnlockSuccess();
      setValidationSuccessMsg(`Estado actualizado a: ${newStatus}`);
      await fetchReservations();
      setTimeout(() => setValidationSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Error al actualizar: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loadingStore) {
    return (
      <div className="min-h-screen bg-[#0d0f18] flex items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-[#00ffb2]" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-[#0d0f18] flex flex-col items-center justify-center text-white p-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-2" />
        <h1 className="text-xl font-bold">Tienda no encontrada</h1>
        <p className="text-gray-400 mt-1">El enlace de la caja es incorrecto o ya no existe.</p>
      </div>
    );
  }

  // Pantalla de bloqueo por PIN de acceso a caja
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d0f18] flex items-center justify-center p-4">
        <div className="bg-[#16192b] border border-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-[#00ffb2]/10 rounded-xl flex items-center justify-center text-[#00ffb2]">
              StoreIcon ? <StoreIcon className="w-6 h-6" /> : <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Caja / Mostrador</h1>
              <p className="text-sm text-gray-400">{store.name}</p>
            </div>
          </div>

          <form onSubmit={handlePinLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                PIN de Acceso a Caja
              </label>
              <input
                type="password"
                maxLength={6}
                value={pinAttempt}
                onChange={(e) => setPinAttempt(e.target.value)}
                placeholder="••••"
                className="w-full bg-[#0d0f18] border border-gray-700 rounded-xl px-4 py-3 text-center text-2xl font-mono text-white tracking-widest focus:outline-none focus:border-[#00ffb2]"
                autoFocus
              />
              {pinError && <p className="text-rose-500 text-xs mt-2 text-center">PIN incorrecto. Intenta de nuevo.</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-[#00ffb2] hover:bg-[#00cc8e] text-gray-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-[#00ffb2]/10"
            >
              Acceder al Mostrador
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0f18] text-white">
      {/* Barra superior de navegación del Mostrador */}
      <header className="border-b border-gray-800 bg-[#121522] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-[#00ffb2]/10 rounded-xl flex items-center justify-center text-[#00ffb2]">
            <StoreIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white">{store.name}</h1>
            <p className="text-xs text-gray-400">Panel de Control y Caja Registradora</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchReservations()}
            disabled={loadingReservations}
            className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingReservations ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Bloquear Caja</span>
          </button>
        </div>
      </header>

      {/* Cuerpo del Mostrador */}
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {validationSuccessMsg && (
          <div className="bg-[#00ffb2]/10 border border-[#00ffb2]/30 text-[#00ffb2] p-4 rounded-xl flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{validationSuccessMsg}</span>
          </div>
        )}

        {/* Sección de solicitudes pendientes de verificación */}
        <div className="bg-[#16192b] border border-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-[#00ffb2]" />
              <span>Solicitudes de Reserva Entrantes</span>
            </h2>
            <span className="bg-[#00ffb2]/20 text-[#00ffb2] text-xs font-bold px-3 py-1 rounded-full">
              {reservations.length} total
            </span>
          </div>

          {reservations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-gray-600" />
              <p>No hay solicitudes pendientes en este momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reservations.map((res) => (
                <div key={res.id} className="bg-[#0d0f18] border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono text-[#00ffb2] bg-[#00ffb2]/10 px-2 py-0.5 rounded">
                        PIN: {res.pin || res.pin_code}
                      </span>
                      <h3 className="font-bold text-white mt-1">{res.product_name || 'Producto Reservado'}</h3>
                    </div>
                    <span className="text-lg font-black text-white">${Number(res.price_usd).toFixed(2)}</span>
                  </div>

                  <div className="text-xs text-gray-400 space-y-1">
                    <p>Cliente: <strong className="text-gray-200">{(res as any).client_name || (res as any).name || 'Cliente'}</strong> ({(res as any).client_phone || 'Sin teléfono'})</p>
                    <p>Estado actual: <span className="text-amber-400 font-semibold">{res.status}</span></p>
                  </div>

                  {/* Botones de respuesta rápida */}
                  <div className="flex space-x-2 pt-2 border-t border-gray-800">
                    <button
                      onClick={() => handleUpdateStatus(res.id, 'STOCK_VERIFIED')}
                      disabled={actionLoading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center space-x-1"
                    >
                      <Check className="w-4 h-4" />
                      <span>Verde: Hay Stock</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(res.id, 'OUT_OF_STOCK')}
                      disabled={actionLoading}
                      className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center space-x-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Agotado</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}