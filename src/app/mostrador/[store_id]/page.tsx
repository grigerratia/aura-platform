'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Reservation, Store } from '@/types';
import { logLostDemand, refundFeeToWallet } from '@/lib/monetization';
import {
  Store as StoreIcon, Lock, CheckCircle2, AlertCircle,
  Clock, Check, X, ShieldCheck, RefreshCw, LogOut,
  Smartphone, Search, ChevronRight, Sparkles, QrCode
} from 'lucide-react';
import Link from 'next/link';

export default function MostradorPage() {
  const params = useParams();
  const storeId = params?.store_id as string;
  const router = useRouter();

  // Estados de la tienda y autenticación por PIN
  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinAttempt, setPinAttempt] = useState('');
  const [pinError, setPinError] = useState(false);

  // Pestañas del Mostrador
  const [activeTab, setActiveTab] = useState<'semaphore' | 'validate'>('semaphore');

  // Reservas pendientes y en curso
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);

  // Validación de Ticket en Caja
  const [ticketSearch, setTicketSearch] = useState('');
  const [foundReservation, setFoundReservation] = useState<Reservation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [validationSuccessMsg, setValidationSuccessMsg] = useState<string | null>(null);

  // 1. Cargar datos básicos de la tienda para verificar PIN
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

  // 2. Cargar reservas en tiempo real para el mostrador
  const fetchReservations = useCallback(async () => {
    if (!storeId || !isAuthenticated) return;
    setLoadingReservations(true);
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          products (name, imageUrl, archetype, regular_price_usd, aura_price_usd)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: Reservation[] = data.map((r: any) => {
          const priceUsd = Number(r.total_price || r.price_usd || 0);
          return {
            ...r,
            product_name: r.products?.name || r.product_name || 'Producto Reservado',
            image_url: r.products?.imageUrl || r.products?.image_url || r.image_url,
            category_archetype: r.products?.archetype || r.products?.category_archetype || r.category_archetype || 'RETAIL_STANDARD',
            price_usd: priceUsd,
            aura_price_usd: r.aura_price_usd ? Number(r.aura_price_usd) : priceUsd,
            unlock_fee_usd: r.unlock_fee_usd ? Number(r.unlock_fee_usd) : 0,
            store_pay_balance_usd: r.store_pay_balance_usd
              ? Number(r.store_pay_balance_usd)
              : priceUsd - (Number(r.unlock_fee_usd) || 0),
            pin: r.pin || r.pin_code || (r.id ? r.id.slice(0, 4).toUpperCase() : '0000')
          };
        });
        setReservations(mapped);
      }
    } catch (err) {
      console.error('Error cargando reservas de mostrador:', err);
    } finally {
      setLoadingReservations(false);
    }
  }, [storeId, isAuthenticated]);

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

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated, storeId, fetchReservations]);

  // Manejar entrada de PIN de Mostrador
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = store?.cashier_access_pin || '1234';

    if (pinAttempt.trim() === correctPin.trim()) {
      setIsAuthenticated(true);
      sessionStorage.setItem(`aura_mostrador_${storeId}`, 'true');
      setPinError(false);
      setPinAttempt('');
    } else {
      setPinError(true);
      setPinAttempt('');
    }
  };

  // Bloquear el mostrador
  const handleLock = () => {
    sessionStorage.removeItem(`aura_mostrador_${storeId}`);
    setIsAuthenticated(false);
    setFoundReservation(null);
    setTicketSearch('');
  };

  // Semáforo de Acción (Botón Verde, Amarillo, Rojo)
  const handleUpdateStockStatus = async (
    reservation: Reservation,
    newStatus: 'confirmed' | 'ultimo_par' | 'cancelled'
  ) => {
    setActionLoading(true);
    try {
      const targetDbStatus = newStatus === 'cancelled' ? 'cancelled' : 'confirmed';

      await supabase
        .from('reservations')
        .update({ status: targetDbStatus })
        .eq('id', reservation.id);

      // Si es último par
      if (newStatus === 'ultimo_par') {
        await supabase
          .from('store_products')
          .update({ stock: 1 })
          .eq('store_id', reservation.store_id)
          .eq('product_id', reservation.product_id);
      } else if (newStatus === 'cancelled') {
        // Registrar demanda perdida
        await logLostDemand({
          storeId: reservation.store_id,
          productId: reservation.product_id,
          productName: reservation.product_name,
          selectedVariant: reservation.selected_size,
          customerPhone: reservation.customer_phone,
          reason: 'OUT_OF_STOCK'
        });

        await supabase
          .from('store_products')
          .update({ is_active: false, stock: 0 })
          .eq('store_id', reservation.store_id)
          .eq('product_id', reservation.product_id);
      }

      await fetchReservations();
    } catch (err: any) {
      alert('Error actualizando stock: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Buscar Ticket para Cobro en Caja
  const handleSearchTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSearch.trim()) return;

    const clean = ticketSearch.trim().replace('#', '').toUpperCase();
    const found = reservations.find(
      (r) => (r.pin && r.pin.toUpperCase() === clean) || (r.pin_code && r.pin_code.toUpperCase() === clean)
    );

    if (found) {
      setFoundReservation(found);
      setValidationSuccessMsg(null);
    } else {
      alert(`No se encontró ninguna reserva activa con el ticket #${clean}.`);
    }
  };

  // Cobro y Entrega en Mostrador
  const handleCompleteSale = async (reservation: Reservation) => {
    if (!confirm(`¿Confirmar cobro de $${reservation.store_pay_balance_usd?.toFixed(2) || reservation.price_usd?.toFixed(2)} y entrega del producto?`)) return;
    setActionLoading(true);
    try {
      await supabase
        .from('reservations')
        .update({
          status: 'COMPLETED_IN_STORE',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', reservation.id);

      setValidationSuccessMsg(`✓ Venta completada con éxito. Producto entregado a ${reservation.customer_name}.`);
      setFoundReservation(null);
      setTicketSearch('');
      await fetchReservations();
    } catch (err: any) {
      alert('Error completando venta: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Candado de Confianza: Cliente asistió pero no llevó (Liberar Stock a Billetera)
  const handleAttendedNoSale = async (reservation: Reservation) => {
    if (!confirm("¿El cliente asistió pero no llevó el producto? Se liberará el stock al estante y su abono se acreditará a su Billetera Aura.")) return;
    setActionLoading(true);
    try {
      await supabase
        .from('reservations')
        .update({
          status: 'ATTENDED_NO_SALE',
          cancellation_reason: 'CLIENT_ATTENDED_DID_NOT_BUY'
        })
        .eq('id', reservation.id);

      // Reembolsar fee a billetera interna si existió
      if (reservation.unlock_fee_usd && reservation.unlock_fee_usd > 0 && reservation.user_id) {
        await refundFeeToWallet({
          userId: reservation.user_id,
          reservationId: reservation.id,
          amountUsd: reservation.unlock_fee_usd,
        });
      }

      setValidationSuccessMsg(`✓ Stock liberado al estante. El saldo fue reintegrado a la Billetera del cliente.`);
      setFoundReservation(null);
      setTicketSearch('');
      await fetchReservations();
    } catch (err: any) {
      alert('Error al liberar stock: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loadingStore) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <RefreshCw className="animate-spin text-teal-400" size={36} />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold">Tienda no encontrada</h2>
          <p className="text-xs text-slate-400 mt-2">El enlace de mostrador no es válido o la tienda no existe.</p>
        </div>
      </div>
    );
  }

  // ==============================================================================
  // PANTALLA 1: BLOQUEO POR PIN DE MOSTRADOR
  // ==============================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between p-4 sm:p-6">
        <header className="flex justify-between items-center max-w-md mx-auto w-full pt-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black text-sm">
              A
            </div>
            <span className="font-black text-sm tracking-tight text-white">AURA MOSTRADOR</span>
          </div>
          <span className="text-[10px] font-bold text-teal-400 bg-teal-950 border border-teal-800 px-2 py-0.5 rounded-full">
            Caja Rápida
          </span>
        </header>

        <main className="max-w-sm w-full mx-auto my-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-400">
            <Lock size={28} />
          </div>

          <h1 className="text-xl font-black text-white">{store.name}</h1>
          <p className="text-xs text-slate-400 mt-1">Terminal de Mostrador para Empleados</p>

          <form onSubmit={handlePinSubmit} className="mt-6 space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Ingresa el PIN de Acceso Rápido
              </label>
              <input
                type="password"
                maxLength={6}
                autoFocus
                placeholder="••••"
                value={pinAttempt}
                onChange={(e) => setPinAttempt(e.target.value)}
                className={`w-full p-4 bg-slate-950 border rounded-2xl text-center text-2xl font-mono tracking-widest text-teal-400 outline-none focus:ring-2 focus:ring-teal-500 ${
                  pinError ? 'border-red-500 bg-red-950/20' : 'border-slate-800'
                }`}
              />
            </div>

            {pinError && (
              <p className="text-xs text-red-400 font-bold animate-shake">
                PIN incorrecto. Consulta al dueño del local.
              </p>
            )}

            <button
              type="submit"
              className="cursor-pointer w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-4 rounded-xl transition shadow-lg shadow-teal-500/20 active:scale-98"
            >
              Abrir Mostrador
            </button>
          </form>

          <p className="text-[11px] text-slate-500 mt-6">
            Este modo no tiene acceso a métricas financieras, configuración ni eliminación de catálogo.
          </p>
        </main>

        <footer className="text-center text-xs text-slate-600 pb-2">
          Aura Business • Cumaná, Sucre
        </footer>
      </div>
    );
  }

  // Filtrar reservas pendientes que requieren semáforo
  const pendingReservations = reservations.filter(
    (r) => r.status === 'pending' || r.status === 'pendiente' || r.status === 'PENDING_STOCK_CHECK'
  );

  // Reservas activas listas para canje en caja
  const activeTickets = reservations.filter(
    (r) =>
      r.status === 'confirmed' ||
      r.status === 'confirmada' ||
      r.status === 'ultimo_par' ||
      r.status === 'STOCK_VERIFIED' ||
      r.status === 'QR_ACTIVE'
  );

  // ==============================================================================
  // PANTALLA 2: TERMINAL ACTIVA DE MOSTRADOR
  // ==============================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      
      {/* HEADER SUPERIOR DE MOSTRADOR */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center font-black text-slate-950 text-sm">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-white text-sm sm:text-base leading-none truncate max-w-[160px] sm:max-w-xs">
                  {store.name}
                </h1>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Mostrador Activo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{store.zone || 'Cumaná'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchReservations}
              className="cursor-pointer p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Refrescar"
            >
              <RefreshCw size={16} className={loadingReservations ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleLock}
              className="cursor-pointer flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 px-3 py-2 rounded-xl transition border border-slate-700"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Bloquear</span>
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN RÁPIDA DE PESTAÑAS */}
        <div className="max-w-4xl mx-auto px-4 flex border-t border-slate-800">
          <button
            onClick={() => { setActiveTab('semaphore'); setValidationSuccessMsg(null); }}
            className={`cursor-pointer flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'semaphore'
                ? 'border-teal-400 text-teal-400 bg-teal-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock size={16} />
            <span>Semáforo de Stock</span>
            {pendingReservations.length > 0 && (
              <span className="bg-amber-500 text-slate-950 px-2 py-0.2 rounded-full text-[10px] font-black">
                {pendingReservations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('validate'); setValidationSuccessMsg(null); }}
            className={`cursor-pointer flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'validate'
                ? 'border-teal-400 text-teal-400 bg-teal-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode size={16} />
            <span>Validar en Caja (Ticket / QR)</span>
            {activeTickets.length > 0 && (
              <span className="bg-slate-800 text-slate-300 px-2 py-0.2 rounded-full text-[10px] font-bold">
                {activeTickets.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* CONTENIDO DE PESTAÑAS */}
      <main className="max-w-4xl mx-auto w-full px-4 py-6 flex-1 space-y-6">

        {/* ALERTA DE ÉXITO */}
        {validationSuccessMsg && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-700 rounded-2xl flex items-center gap-3 text-emerald-200 text-xs shadow-lg animate-in fade-in">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            <span className="font-bold">{validationSuccessMsg}</span>
          </div>
        )}

        {/* ==============================================================================
            PESTAÑA A: SEMÁFORO DE STOCK EN TIEMPO REAL
            ============================================================================== */}
        {activeTab === 'semaphore' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Solicitudes de Reserva Entrantes</h2>
                <p className="text-xs text-slate-400">Verifica en estante y presiona el botón correspondiente.</p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
                {pendingReservations.length} pendientes
              </span>
            </div>

            {pendingReservations.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-2">
                <CheckCircle2 size={36} className="text-teal-400 mx-auto mb-2" />
                <h3 className="font-bold text-white text-base">Al día en mostrador</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No hay reservas esperando confirmación de stock. Las nuevas solicitudes sonarán aquí en tiempo real.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReservations.map((res) => (
                  <div
                    key={res.id}
                    className="bg-slate-900 border-2 border-indigo-900/60 rounded-3xl p-5 shadow-xl space-y-4 hover:border-indigo-600 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-950 border border-amber-800 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                          ⏳ Esperando Verificación en Estante
                        </span>
                        <h3 className="text-base font-black text-white leading-tight">
                          {res.product_name}
                        </h3>
                        <p className="text-xs text-teal-300 font-bold mt-1">
                          Cliente: {res.customer_name} • Tel: {res.customer_phone}
                        </p>
                        {res.selected_size && (
                          <p className="text-xs text-slate-300 mt-0.5">
                            Variante / Talla: <strong className="text-white underline">{res.selected_size}</strong>
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-lg font-black text-white">${res.price_usd?.toFixed(2)}</span>
                        <span className="block text-[10px] text-slate-400">Ticket #{res.pin}</span>
                      </div>
                    </div>

                    {/* LOS 3 BOTONES DE SEMÁFORO */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
                      {/* BOTÓN VERDE */}
                      <button
                        onClick={() => handleUpdateStockStatus(res, 'confirmed')}
                        disabled={actionLoading}
                        className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                      >
                        <Check size={16} />
                        <span>Verde: Hay Stock</span>
                      </button>

                      {/* BOTÓN AMARILLO */}
                      <button
                        onClick={() => handleUpdateStockStatus(res, 'ultimo_par')}
                        disabled={actionLoading}
                        className="cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                      >
                        <AlertCircle size={16} />
                        <span>Amarillo: Último Par</span>
                      </button>

                      {/* BOTÓN ROJO */}
                      <button
                        onClick={() => handleUpdateStockStatus(res, 'cancelled')}
                        disabled={actionLoading}
                        className="cursor-pointer bg-red-600 hover:bg-red-500 text-white font-black py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-50"
                      >
                        <X size={16} />
                        <span>Rojo: Agotado</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==============================================================================
            PESTAÑA B: VALIDACIÓN Y COBRO EN CAJA FÍSICA
            ============================================================================== */}
        {activeTab === 'validate' && (
          <div className="space-y-6">
            
            {/* BUSCADOR DE TICKET */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldCheck size={20} className="text-teal-400" />
                  Validador de Ticket y Cobro en Caja
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Pídele al cliente su boleto con PIN de 4 dígitos o escanea su código QR.
                </p>
              </div>

              <form onSubmit={handleSearchTicket} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="Ingresa PIN del boleto (ej: 4819)"
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="w-full pl-10 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <button
                  type="submit"
                  className="cursor-pointer bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-xs transition"
                >
                  Buscar Ticket
                </button>
              </form>
            </div>

            {/* TARJETA DE RESERVA ENCONTRADA */}
            {foundReservation && (
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-teal-500/80 rounded-3xl p-6 shadow-2xl space-y-6 animate-in zoom-in-95">
                <div className="flex items-start justify-between gap-3 border-b border-indigo-900/60 pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-teal-400 bg-teal-950 border border-teal-800 px-2 py-0.5 rounded-full inline-block mb-1">
                      Boleto #{foundReservation.pin} Verificado
                    </span>
                    <h3 className="text-xl font-black text-white">{foundReservation.product_name}</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Cliente: <strong>{foundReservation.customer_name}</strong> • {foundReservation.customer_phone}
                    </p>
                    {foundReservation.selected_size && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Talla / Opción: <strong className="text-white">{foundReservation.selected_size}</strong>
                      </p>
                    )}
                  </div>

                  {/* MONTO A COBRAR EN CAJA FÍSICA */}
                  <div className="text-right bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Cobrar en Mostrador</span>
                    <span className="text-2xl font-black text-teal-400">
                      ${foundReservation.store_pay_balance_usd?.toFixed(2) || foundReservation.price_usd?.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">USD en caja física</span>
                  </div>
                </div>

                {/* ACCIONES DE COBRO Y CANDADO DE CONFIANZA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* ACCIÓN 1: COBRO EXITOSO */}
                  <button
                    onClick={() => handleCompleteSale(foundReservation)}
                    disabled={actionLoading}
                    className="cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black p-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-98 disabled:opacity-50"
                  >
                    <CheckCircle2 size={20} />
                    <span>✓ Cobrar en Caja y Entregar</span>
                  </button>

                  {/* ACCIÓN 2: CLIENTE ASISTIÓ PERO NO LLEVÓ (CANDADO DE CONFIANZA) */}
                  <button
                    onClick={() => handleAttendedNoSale(foundReservation)}
                    disabled={actionLoading}
                    className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-600/40 font-bold p-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
                  >
                    <X size={18} />
                    <span>Cliente vino pero no llevó (Liberar a Billetera)</span>
                  </button>
                </div>
              </div>
            )}

            {/* LISTA RÁPIDA DE BOLETOS ACTIVOS HOY */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Boletos Activos para Retiro Hoy ({activeTickets.length})
              </h3>

              {activeTickets.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No hay boletos activos pendientes por retirar.</p>
              ) : (
                <div className="divide-y divide-slate-800">
                  {activeTickets.map((t) => (
                    <div
                      key={t.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-teal-400 text-sm">#{t.pin}</span>
                        <span className="text-white ml-2 font-bold">{t.product_name}</span>
                        <span className="text-slate-400 ml-2">({t.customer_name})</span>
                      </div>
                      <button
                        onClick={() => { setFoundReservation(t); setValidationSuccessMsg(null); }}
                        className="cursor-pointer text-xs font-bold text-teal-400 hover:underline flex items-center gap-1"
                      >
                        Cobrar <ChevronRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 py-3 text-center text-[11px] text-slate-600">
        Terminal Mostrador de {store.name} • Protegido por PIN
      </footer>

    </div>
  );
}
