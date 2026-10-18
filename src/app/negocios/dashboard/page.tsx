'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Reservation, Store } from '@/types';
import {
  Package, Plus, Search, Trash2, Loader2,
  CheckCircle2, AlertCircle, LogOut, ChevronRight,
  Clock, Check, X, QrCode, Printer,
  Flame, ArrowRight, TrendingUp, Users, Smartphone,
  DollarSign, MessageSquare
} from 'lucide-react';
import Link from 'next/link';

export default function OwnerDashboard() {
  const router = useRouter();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [activeTab, setActiveTab] = useState<'reservations' | 'inventory' | 'qr'>('reservations');
  const [loading, setLoading] = useState(true);

  // Inventario
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Reservas
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pinInput, setPinInput] = useState('');
  const [pinSuccessMessage, setPinSuccessMessage] = useState<string | null>(null);

  // Formulario de Producto 80/20
  const [formData, setFormData] = useState({
    product_id: '',
    name: '',
    category: 'Calzado',
    price: '',
    sale_price: '',
    sizes: '37, 38, 39, 40',
    stock_status: 'available',
    is_clearance: false,
    is_active: true
  });

  const fetchInventory = useCallback(async (sId: string) => {
    const { data } = await supabase
      .from('store_products')
      .select(`
        *,
        products (name, description, category, sizes)
      `)
      .eq('store_id', sId)
      .order('created_at', { ascending: false });

    if (data) setProducts(data);
  }, []);

  const fetchReservations = useCallback(async (sId: string) => {
    try {
      // 1. Intentamos leer de la tabla reservations
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          products (name, image_url)
        `)
        .eq('store_id', sId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: Reservation[] = data.map((r: any) => {
          const priceUsd = Number(r.total_price || r.price_usd || 0);
          const bcvRate = Number(r.bcv_rate || r.tasa || 55);
          return {
            id: r.id,
            pin: r.pin_code || r.pin || '0000',
            pin_code: r.pin_code || r.pin || '0000',
            store_id: r.store_id,
            store_name: store?.name || 'Mi Tienda',
            product_id: r.product_id,
            product_name: r.products?.name || r.product_name || 'Producto Apartado',
            product_image: r.products?.image_url || r.product_image,
            selected_size: r.selected_size || 'Única',
            price_usd: priceUsd,
            total_price: priceUsd,
            price_ves: Number((priceUsd * bcvRate).toFixed(2)),
            tasa: bcvRate,
            bcv_rate: bcvRate,
            customer_name: r.customer_name,
            customer_phone: r.customer_phone,
            status: r.status,
            expires_at: r.expires_at,
            created_at: r.created_at,
            payment_reference: r.customer_phone?.includes('REF:') || r.customer_phone?.includes('PAGO_MOVIL') ? 'Sí' : undefined,
          };
        });
        setReservations(mapped);
        return;
      }

      // 2. Fallback: leemos de orders si reservations aún no estuviera accesible
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', sId)
        .order('created_at', { ascending: false });

      if (ordersData) {
        const mapped: Reservation[] = ordersData.map((ord: any) => ({
          id: ord.id?.toString() || Math.random().toString(),
          pin: ord.customer_info?.pin || '1234',
          pin_code: ord.customer_info?.pin || '1234',
          store_id: ord.store_id,
          store_name: 'Mi Tienda',
          product_id: ord.items?.[0]?.id || '',
          product_name: ord.items?.[0]?.name || 'Producto Apartado',
          selected_size: ord.customer_info?.selected_size || 'Única',
          price_usd: ord.total_usd,
          price_ves: ord.total_ves,
          tasa: 55,
          customer_name: ord.customer_info?.name || 'Cliente Aura',
          customer_phone: ord.customer_info?.phone || '',
          status: ord.status || 'pending',
          expires_at: new Date(new Date(ord.created_at).getTime() + 3 * 3600000).toISOString(),
          created_at: ord.created_at
        }));
        setReservations(mapped);
      }
    } catch {
      // Silencioso
    }
  }, [store?.name]);

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/negocios');

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    let targetStoreId = profile?.store_id;

    if (!targetStoreId) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      if (storeData) {
        targetStoreId = storeData.id;
        setStore(storeData as Store);
      }
    } else {
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('id', targetStoreId)
        .single();
      if (storeData) setStore(storeData as Store);
    }

    if (targetStoreId) {
      setStoreId(targetStoreId);
      await Promise.all([
        fetchInventory(targetStoreId),
        fetchReservations(targetStoreId)
      ]);
    } else {
      alert("Error: No se encontró vinculación con ninguna tienda.");
    }
    setLoading(false);
  }, [router, fetchInventory, fetchReservations]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  // Buscar en catálogo global
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 2) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);
        setGlobalResults(data || []);
      } else {
        setGlobalResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // SEMÁFORO DE ACCIÓN: Botón Verde, Amarillo y Rojo
  const handleUpdateReservationStatus = async (
    reservation: Reservation, 
    newStatus: 'confirmed' | 'ultimo_par' | 'cancelled'
  ) => {
    try {
      // 1. Actualizar estado de la reserva compatible con Postgres CHECK constraint ('pending', 'confirmed', 'completed', 'cancelled', 'expired')
      const targetDbStatus = newStatus === 'cancelled' ? 'cancelled' : 'confirmed';

      await supabase
        .from('reservations')
        .update({ status: targetDbStatus })
        .eq('id', reservation.id);

      // 2. Acción colateral sobre el inventario según el color del semáforo
      if (newStatus === 'ultimo_par') {
        // Botón Amarillo: Apaga la talla o marca últimas unidades
        await supabase
          .from('store_products')
          .update({ stock: 1 })
          .eq('store_id', reservation.store_id)
          .eq('product_id', reservation.product_id);
      } else if (newStatus === 'cancelled') {
        // Botón Rojo: Marca agotado en vitrina
        await supabase
          .from('store_products')
          .update({ is_active: false, stock: 0 })
          .eq('store_id', reservation.store_id)
          .eq('product_id', reservation.product_id);
      }

      if (storeId) {
        fetchReservations(storeId);
        fetchInventory(storeId);
      }
    } catch (err: any) {
      alert('Error al actualizar reserva: ' + err.message);
    }
  };

  // Validar PIN en Caja (Garantizado con consulta directa a Supabase por pin_code)
  const handleValidatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    const cleanPin = pinInput.trim().replace('#', '');
    let target = reservations.find(r => r.pin === cleanPin || r.pin_code === cleanPin);

    // Si aún no está en la memoria del cliente, buscamos directamente en Supabase
    if (!target && storeId) {
      try {
        const { data: dbMatch } = await supabase
          .from('reservations')
          .select('*')
          .eq('store_id', storeId)
          .eq('pin_code', cleanPin)
          .order('created_at', { ascending: false })
          .maybeSingle();

        if (dbMatch) {
          target = {
            id: dbMatch.id,
            pin: dbMatch.pin_code,
            pin_code: dbMatch.pin_code,
            customer_name: dbMatch.customer_name,
            customer_phone: dbMatch.customer_phone,
            product_name: 'Producto en Tienda',
            store_name: store?.name || 'Mi Tienda',
            price_usd: Number(dbMatch.total_price || 0),
            price_ves: Number((dbMatch.total_price || 0) * (dbMatch.bcv_rate || 55)),
            tasa: Number(dbMatch.bcv_rate || 55),
            status: dbMatch.status,
            store_id: dbMatch.store_id,
            product_id: dbMatch.product_id,
            created_at: dbMatch.created_at,
            expires_at: dbMatch.expires_at,
          };
        }
      } catch {
        // Continuar
      }
    }

    if (target) {
      try {
        await supabase
          .from('reservations')
          .update({ status: 'completed' })
          .eq('id', target.id);

        setPinSuccessMessage(`¡Venta validada con éxito! PIN #${cleanPin} procesado para ${target.customer_name}.`);
        setPinInput('');
        if (storeId) fetchReservations(storeId);
      } catch {
        setPinSuccessMessage(`PIN #${cleanPin} validado localmente con éxito.`);
      }
    } else {
      alert('PIN no encontrado o ya expirado. Verifica los 4 dígitos con el cliente.');
    }
  };

  // Guardar Producto en Vitrina 80/20
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setLoading(true);

    try {
      let currentProductId = formData.product_id;
      const parsedSizes = formData.sizes.split(',').map(s => s.trim()).filter(Boolean);

      // Si es un producto nuevo en el catálogo global
      if (!currentProductId) {
        const { data: newP, error: pError } = await supabase
          .from('products')
          .insert([{ 
            name: formData.name,
            category: formData.category,
            sizes: parsedSizes
          }])
          .select()
          .single();
        if (pError) throw pError;
        currentProductId = newP.id;
      }

      const priceNum = parseFloat(formData.price);
      const salePriceNum = formData.sale_price ? parseFloat(formData.sale_price) : null;
      const discountPercent = salePriceNum && salePriceNum < priceNum
        ? Math.round(((priceNum - salePriceNum) / priceNum) * 100)
        : formData.is_clearance ? 30 : 0;

      // Insertar en store_products
      const { error: spError } = await supabase
        .from('store_products')
        .insert([{
          store_id: storeId,
          product_id: currentProductId,
          price: priceNum,
          stock: formData.stock_status === 'available' ? 10 : formData.stock_status === 'last_units' ? 2 : 0,
          discount_percent: discountPercent,
          is_active: formData.is_active
        }]);

      if (spError) throw spError;

      alert("Producto añadido exitosamente a tu vitrina digital.");
      setIsAdding(false);
      setFormData({
        product_id: '',
        name: '',
        category: 'Calzado',
        price: '',
        sale_price: '',
        sizes: '37, 38, 39, 40',
        stock_status: 'available',
        is_clearance: false,
        is_active: true
      });
      fetchInventory(storeId);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("¿Eliminar este producto de tu vitrina?")) return;
    await supabase.from('store_products').delete().eq('id', id);
    if (storeId) fetchInventory(storeId);
  };

  if (loading && !isAdding) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  const storeSlug = store?.slug || '';
  const storeUrl = typeof window !== 'undefined' ? `${window.location.origin}/${storeSlug}` : `https://aura.lat/${storeSlug}`;

  // 🌟 CÁLCULO DE MÉTRICAS DE IMPACTO Y DEMANDA PERDIDA
  const completedReservations = reservations.filter(
    r => r.status === 'completed' || r.status === 'completada' || r.payment_reference
  );
  const totalSalesUSD = completedReservations.reduce((sum, r) => sum + (r.price_usd || 0), 0);
  const tasaUsed = reservations[0]?.tasa || 55;
  const totalSalesVES = totalSalesUSD * tasaUsed;

  // Demanda no satisfecha: canceladas por falta de stock (Botón Rojo) o registros de fila de espera
  const missedDemand = reservations.filter(
    r => r.status === 'cancelled' || r.status === 'cancelada' || r.customer_name?.includes('[FILA DE ESPERA]')
  );
  const missedCustomersCount = missedDemand.length;

  const pendingReservations = reservations.filter(
    r => r.status === 'pending' || r.status === 'pendiente' || r.status === 'confirmed' || r.status === 'confirmada' || r.status === 'ultimo_par'
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR DE COMERCIO */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between md:justify-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center font-black text-xl text-slate-950">
            A
          </div>
          <div>
            <h2 className="font-black text-white text-base tracking-tight leading-none truncate max-w-[140px]">
              {store?.name || 'AURA OPS'}
            </h2>
            <span className="text-[10px] text-teal-400 font-bold uppercase tracking-widest">
              Panel de Tienda
            </span>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 p-4 space-y-1.5 flex md:flex-col overflow-x-auto">
          <button
            onClick={() => setActiveTab('reservations')}
            className={`cursor-pointer flex items-center gap-3 w-full p-3 rounded-xl font-bold text-xs transition ${
              activeTab === 'reservations'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Clock size={18} />
            <span className="whitespace-nowrap">Semáforo de Reservas</span>
            {pendingReservations.length > 0 && (
              <span className="ml-auto bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black">
                {pendingReservations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`cursor-pointer flex items-center gap-3 w-full p-3 rounded-xl font-bold text-xs transition ${
              activeTab === 'inventory'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Package size={18} />
            <span className="whitespace-nowrap">Mi Vitrina 80/20</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`cursor-pointer flex items-center gap-3 w-full p-3 rounded-xl font-bold text-xs transition ${
              activeTab === 'qr'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <QrCode size={18} />
            <span className="whitespace-nowrap">Hablador QR Vitrina</span>
          </button>
        </nav>

        {/* PIE DE SIDEBAR */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          {storeSlug && (
            <Link
              href={`/${storeSlug}`}
              target="_blank"
              className="text-xs text-teal-400 hover:underline flex items-center gap-1 font-bold"
            >
              Ver mi vitrina <ArrowRight size={12} />
            </Link>
          )}
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/negocios'))}
            className="cursor-pointer text-slate-400 hover:text-red-400 transition p-2"
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-7xl space-y-6">
        
        {/* 🌟 PANEL DE IMPACTO Y DEMANDA PERDIDA (ARRIBA DEL TODO) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Tarjeta 1: Ventas Generadas por Aura */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-indigo-900/60 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <TrendingUp size={14} /> Ventas Generadas por Aura este mes
              </span>
              <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/30">
                QRs & Pagos Validados
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl sm:text-4xl font-black text-white">
                ${totalSalesUSD.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-slate-300">USD</span>
              <span className="text-xs font-semibold text-teal-400 ml-2">
                ≈ Bs. {totalSalesVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-2 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span><strong>{completedReservations.length} clientes</strong> compraron en tu tienda física gracias a Aura.</span>
            </p>
          </div>

          {/* Tarjeta 2: Demanda Perdida / Búsquedas Agotadas */}
          <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white p-6 rounded-3xl border border-purple-900/60 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Users size={14} /> Demanda no Satisfecha en tu Tienda
              </span>
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Clics a Botón Rojo & Fila
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl sm:text-4xl font-black text-amber-400">
                {missedCustomersCount}
              </span>
              <span className="text-sm font-bold text-slate-300">clientes sin stock</span>
            </div>

            <p className="text-xs text-slate-300 mt-2 flex items-center gap-1.5">
              <AlertCircle size={14} className="text-amber-400 shrink-0" />
              <span>Intentaron apartar pero la talla estaba agotada. ¡Surtir estos productos representa ventas inmediatas!</span>
            </p>
          </div>

        </section>

        {/* PESTAÑA 1: SEMÁFORO DE RESERVAS Y VALIDACIÓN EN CAJA */}
        {activeTab === 'reservations' && (
          <div className="space-y-6">
            
            {/* Header de Reservas */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Semáforo de Reservas en Tienda
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">
                  Confirma si el producto está en el estante y valida el PIN cuando el cliente llegue a pagar.
                </p>
              </div>
            </header>

            {/* CAJA DE VALIDACIÓN POR PIN DE RETIRO */}
            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-6 rounded-3xl shadow-lg border border-indigo-800">
              <div className="max-w-xl">
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-300 block mb-1">
                  Validador de Caja en 1 Toque
                </span>
                <h3 className="text-xl font-black mb-2">¿El cliente está frente al mostrador?</h3>
                <p className="text-xs text-white/80 mb-4">
                  Pídele su PIN de 4 dígitos para marcar la reserva como entregada y sumar puntos a su reputación.
                </p>

                <form onSubmit={handleValidatePin} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Ej: 4821"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="p-3 bg-white text-slate-900 rounded-xl font-mono font-black text-lg text-center w-36 outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <button
                    type="submit"
                    className="cursor-pointer bg-teal-400 hover:bg-teal-300 text-slate-950 font-black px-6 py-3 rounded-xl transition text-sm flex items-center gap-2 shadow-md"
                  >
                    <CheckCircle2 size={18} /> Validar Entrega
                  </button>
                </form>

                {pinSuccessMessage && (
                  <div className="mt-3 p-3 bg-teal-500/20 border border-teal-400/40 rounded-xl text-teal-200 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} /> {pinSuccessMessage}
                  </div>
                )}
              </div>
            </div>

            {/* LISTADO DE RESERVAS CON EL SEMÁFORO */}
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock size={18} className="text-indigo-600" />
                Reservas y Turnos Activos ({pendingReservations.length})
              </h3>

              {pendingReservations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingReservations.map((res) => {
                    const hasPagoMovil = res.customer_phone?.includes('PAGO_MOVIL') || res.customer_phone?.includes('REF:');
                    const isWaitlist = res.customer_name?.includes('[FILA DE ESPERA]');

                    return (
                      <div
                        key={res.id}
                        className={`bg-white p-5 rounded-3xl border shadow-sm flex flex-col justify-between space-y-4 ${
                          hasPagoMovil ? 'border-emerald-300 ring-2 ring-emerald-400/20' : 'border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="font-mono text-xs font-black bg-slate-900 text-teal-400 px-2 py-0.5 rounded-md">
                                PIN #{res.pin}
                              </span>
                              <h4 className="font-black text-slate-900 text-base mt-1.5">
                                {res.product_name}
                              </h4>
                            </div>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              res.status === 'confirmed' || res.status === 'confirmada'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {res.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                            </span>
                          </div>

                          {/* Badge de Pago Móvil Directo */}
                          {hasPagoMovil && (
                            <div className="mb-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                              <Smartphone size={15} className="text-emerald-600 shrink-0" />
                              <div className="font-medium truncate">
                                <strong>Pago Móvil Notificado:</strong> {res.customer_phone}
                              </div>
                            </div>
                          )}

                          {/* Badge de Fila de Espera */}
                          {isWaitlist && (
                            <div className="mb-3 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                              <Users size={15} className="text-amber-600 shrink-0" />
                              <div>
                                <strong>Fila de Espera:</strong> Cliente aguarda turno por WhatsApp si el actual no retira.
                              </div>
                            </div>
                          )}

                          <div className="space-y-1 text-xs text-slate-600">
                            {res.selected_size && (
                              <p>Talla solicitada: <strong className="text-slate-900">{res.selected_size}</strong></p>
                            )}
                            <p>Cliente: <strong className="text-slate-900">{res.customer_name}</strong> ({res.customer_phone})</p>
                            <p>Total a cobrar en caja: <strong className="text-emerald-700 font-black">${res.price_usd} USD</strong> (Bs. {res.price_ves})</p>
                          </div>
                        </div>

                        {/* EL SEMÁFORO DE ACCIÓN: 3 BOTONES DEL MODELO */}
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Semáforo de Disponibilidad en Estante:
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {/* BOTÓN VERDE */}
                            <button
                              onClick={() => handleUpdateReservationStatus(res, 'confirmed')}
                              className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl text-[11px] font-bold transition flex flex-col items-center justify-center text-center leading-tight shadow-sm"
                              title="El producto está en el estante y quedan más unidades"
                            >
                              <Check size={14} className="mb-0.5" />
                              <span>Sí hay (Activo)</span>
                            </button>

                            {/* BOTÓN AMARILLO */}
                            <button
                              onClick={() => handleUpdateReservationStatus(res, 'ultimo_par')}
                              className="cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 p-2 rounded-xl text-[11px] font-black transition flex flex-col items-center justify-center text-center leading-tight shadow-sm"
                              title="El producto está en el estante pero es el último par (apaga la talla)"
                            >
                              <AlertCircle size={14} className="mb-0.5" />
                              <span>Último Par</span>
                            </button>

                            {/* BOTÓN ROJO */}
                            <button
                              onClick={() => handleUpdateReservationStatus(res, 'cancelled')}
                              className="cursor-pointer bg-red-600 hover:bg-red-500 text-white p-2 rounded-xl text-[11px] font-bold transition flex flex-col items-center justify-center text-center leading-tight shadow-sm"
                              title="Ya se vendió en tienda física. Marca agotado."
                            >
                              <X size={14} className="mb-0.5" />
                              <span>Agotado</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center">
                  <p className="text-slate-500 text-sm font-medium">No tienes reservas pendientes en este momento.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* PESTAÑA 2: MI VITRINA 80/20 (CATÁLOGO RÁPIDO) */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Mi Vitrina 80/20 ({products.length} Productos)
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">
                  Sube únicamente tus 15 a 40 productos más buscados y remates. No necesitas subir miles de artículos.
                </p>
              </div>
              <button
                onClick={() => setIsAdding(true)}
                className="cursor-pointer bg-slate-900 hover:bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 text-sm transition shadow-lg shadow-slate-900/10"
              >
                <Plus size={18} /> Añadir a mi Vitrina
              </button>
            </header>

            {/* GRID DE PRODUCTOS EN VITRINA */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {item.products?.category || 'Calzado'}
                      </span>
                      <div className={`h-2.5 w-2.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </div>

                    <h3 className="font-bold text-slate-900 text-base leading-snug mb-1">
                      {item.products?.name}
                    </h3>

                    {item.products?.sizes && (
                      <p className="text-xs text-slate-500 mb-3">
                        Tallas: <span className="font-semibold text-slate-700">{Array.isArray(item.products.sizes) ? item.products.sizes.join(', ') : item.products.sizes}</span>
                      </p>
                    )}

                    <div className="flex items-baseline justify-between mt-2">
                      <div>
                        <span className="text-2xl font-black text-indigo-900">${item.price}</span>
                        <span className="text-xs font-bold text-slate-400 ml-1">USD</span>
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        {item.stock <= 1 ? 'Últimas unidades' : 'Disponible'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => deleteProduct(item.id)}
                      className="cursor-pointer text-slate-400 hover:text-red-500 text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Trash2 size={15} /> Quitar
                    </button>
                    <span className="text-[11px] font-bold text-slate-400">
                      {item.is_active ? 'Visible en Aura' : 'Pausado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* MODAL PARA AÑADIR PRODUCTO 80/20 */}
            {isAdding && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95">
                  <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                      <h2 className="font-black text-lg">Añadir Producto a Vitrina</h2>
                      <p className="text-xs text-slate-400">Listo en 30 segundos desde tu celular</p>
                    </div>
                    <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white cursor-pointer">
                      Cerrar
                    </button>
                  </div>

                  <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                    {/* Búsqueda en catálogo global */}
                    <div className="space-y-1 relative">
                      <label className="text-xs font-bold uppercase text-slate-500">Nombre del Producto</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Zapato Deportivo Casual Negro"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setFormData({ ...formData, name: e.target.value, product_id: '' });
                        }}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />

                      {globalResults.length > 0 && (
                        <div className="absolute w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                          {globalResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, product_id: p.id, name: p.name });
                                setSearchTerm(p.name);
                                setGlobalResults([]);
                              }}
                              className="w-full p-3 text-left hover:bg-indigo-50 flex items-center justify-between text-xs font-bold text-slate-800"
                            >
                              <span>{p.name}</span>
                              <ChevronRight size={14} className="text-slate-400" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-500">Precio Regular ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Ej: 35.00"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-500">Precio Oferta / Remate ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Opcional"
                          value={formData.sale_price}
                          onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Tallas Disponibles (Separadas por coma)</label>
                      <input
                        type="text"
                        placeholder="Ej: 38, 39, 40, 41"
                        value={formData.sizes}
                        onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="clearanceCheck"
                        checked={formData.is_clearance}
                        onChange={(e) => setFormData({ ...formData, is_clearance: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="clearanceCheck" className="text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer">
                        <Flame size={14} className="text-amber-500" />
                        Destacar en &quot;Remates y Liquidaciones del Día&quot;
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="cursor-pointer w-full bg-slate-900 hover:bg-indigo-600 text-white py-3.5 rounded-xl font-black text-sm transition mt-2 shadow-md"
                    >
                      {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Publicar en mi Vitrina Digital'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: HABLADOR FÍSICO QR PARA VITRINA */}
        {activeTab === 'qr' && (
          <div className="space-y-6">
            <header>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Hablador Físico QR para tu Vitrina
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm font-medium">
                Imprime este cartel y colócalo en tu puerta o mostrador para convertir a los transeúntes en clientes.
              </p>
            </header>

            <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border-2 border-slate-900 text-center space-y-6">
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-teal-400 text-xs font-black uppercase tracking-wider">
                AURA • Vitrina Local
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">
                  ¿Pasaste rápido o estamos cerrados?
                </h2>
                <p className="text-slate-600 text-xs mt-2">
                  Escanea aquí para ver nuestros precios reales adentro y apartar tu talla con precio congelado.
                </p>
              </div>

              {/* CÓDIGO QR GENERADO */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(storeUrl)}`}
                  alt={`QR de ${store?.name}`}
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <div className="space-y-1">
                <strong className="block text-slate-900 font-black text-base">{store?.name}</strong>
                <span className="text-xs text-slate-500 font-mono">{storeUrl}</span>
              </div>

              <button
                onClick={() => window.print()}
                className="cursor-pointer w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md"
              >
                <Printer size={16} /> Imprimir Cartel de Vitrina
              </button>

            </div>
          </div>
        )}

      </main>

    </div>
  );
}