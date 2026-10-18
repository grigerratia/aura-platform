'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Reservation, Store, CategoryArchetype } from '@/types';
import { ARCHETYPE_CONFIGS, getArchetypeConfig, refundFeeToWallet, logLostDemand } from '@/lib/monetization';
import {
  Package, Plus, Search, Trash2, Loader2,
  CheckCircle2, AlertCircle, LogOut, ChevronRight,
  Clock, Check, X, QrCode, Printer,
  Flame, ArrowRight, TrendingUp, Users, Smartphone,
  DollarSign, ShieldCheck, Zap, Crown, Award, Layers, Sparkles
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

  // Formulario Adaptativo Multi-Rubro V3.0
  const [formData, setFormData] = useState<{
    product_id: string;
    name: string;
    category: string;
    category_archetype: CategoryArchetype;
    price: string;
    regular_price: string;
    sale_price: string;
    sizes: string;
    variant_options: string;
    auto_confirm_stock: boolean;
    stock_quota: number;
    spec_1: string;
    spec_2: string;
    stock_status: 'available' | 'last_units' | 'sold_out';
    is_clearance: boolean;
    is_sponsored: boolean;
    is_active: boolean;
  }>({
    product_id: '',
    name: '',
    category: 'Calzado',
    category_archetype: 'RETAIL_STANDARD',
    price: '',
    regular_price: '',
    sale_price: '',
    sizes: '37, 38, 39, 40',
    variant_options: 'En Mesa, Para Llevar',
    auto_confirm_stock: false,
    stock_quota: 10,
    spec_1: '',
    spec_2: '',
    stock_status: 'available',
    is_clearance: false,
    is_sponsored: false,
    is_active: true
  });

  const fetchInventory = useCallback(async (sId: string) => {
    const { data } = await supabase
      .from('store_products')
      .select(`
        *,
        products (name, description, category, sizes, category_archetype, variants, specs, regular_price_usd, aura_price_usd, unlock_fee_usd, is_sponsored)
      `)
      .eq('store_id', sId)
      .order('created_at', { ascending: false });

    if (data) setProducts(data);
  }, []);

  const fetchReservations = useCallback(async (sId: string) => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          products (name, image_url, category_archetype)
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
            category_archetype: r.category_archetype || r.products?.category_archetype || 'RETAIL_STANDARD',
            price_usd: priceUsd,
            total_price: priceUsd,
            unlock_fee_usd: Number(r.unlock_fee_usd || 0),
            store_pay_balance_usd: Number(r.store_pay_balance_usd || priceUsd),
            paid_with_wallet: Boolean(r.paid_with_wallet),
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
      const targetDbStatus = newStatus === 'cancelled' ? 'cancelled' : 'confirmed';

      await supabase
        .from('reservations')
        .update({ status: targetDbStatus })
        .eq('id', reservation.id);

      // Colateral sobre inventario
      if (newStatus === 'ultimo_par') {
        await supabase
          .from('store_products')
          .update({ stock: 1 })
          .eq('store_id', reservation.store_id)
          .eq('product_id', reservation.product_id);
      } else if (newStatus === 'cancelled') {
        // Registrar demanda perdida (Motor 1 & 4)
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

      if (storeId) {
        fetchReservations(storeId);
        fetchInventory(storeId);
      }
    } catch (err: any) {
      alert('Error al actualizar reserva: ' + err.message);
    }
  };

  // Validar PIN en Caja (Validar Entrega y Cobro)
  const handleValidatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    const cleanPin = pinInput.trim().replace('#', '');
    let target = reservations.find(r => r.pin === cleanPin || r.pin_code === cleanPin);

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

        setPinSuccessMessage(`¡Venta validada con éxito! PIN #${cleanPin} completado para ${target.customer_name}.`);
        setPinInput('');
        if (storeId) fetchReservations(storeId);
      } catch {
        setPinSuccessMessage(`PIN #${cleanPin} validado localmente con éxito.`);
      }
    } else {
      alert('PIN no encontrado o ya expirado. Verifica los 4 dígitos con el cliente.');
    }
  };

  // CANDADO DE CONFIANZA: [Cliente asistió pero no llevó el producto (Liberar Stock)]
  const handleAttendedNoSale = async (res: Reservation) => {
    const feeToRefund = res.unlock_fee_usd && res.unlock_fee_usd > 0 ? res.unlock_fee_usd : 3.00;
    if (!confirm(`¿Confirmas que ${res.customer_name} asistió a la tienda pero no llevó el producto? Se liberará el stock y se abonarán $${feeToRefund.toFixed(2)} USD a su Billetera Aura.`)) return;

    try {
      // 1. Actualizar reserva a ATTENDED_NO_SALE
      await supabase
        .from('reservations')
        .update({ status: 'ATTENDED_NO_SALE' })
        .eq('id', res.id);

      // 2. Liberar stock en la tienda
      await supabase
        .from('store_products')
        .update({ is_active: true, stock: 10 })
        .eq('store_id', res.store_id)
        .eq('product_id', res.product_id);

      // 3. Acreditar saldo a favor en la billetera de protección
      await refundFeeToWallet({
        reservationId: res.id,
        amountUsd: feeToRefund
      });

      alert(`✓ Stock liberado con éxito en tu vitrina. El saldo a favor de $${feeToRefund.toFixed(2)} USD fue acreditado en la Billetera Aura de ${res.customer_name}.`);
      if (storeId) {
        fetchReservations(storeId);
        fetchInventory(storeId);
      }
    } catch (err: any) {
      alert('Error al liberar stock: ' + err.message);
    }
  };

  // Guardar Producto Adaptativo Multi-Rubro V3.0
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setLoading(true);

    try {
      let currentProductId = formData.product_id;
      const archetypeConfig = getArchetypeConfig(formData.category_archetype);

      // Construcción de variantes JSONB según arquetipo
      let variantsPayload: { label: string; options: string[] }[] = [];
      if (formData.category_archetype === 'RETAIL_STANDARD') {
        const parsedSizes = formData.sizes.split(',').map(s => s.trim()).filter(Boolean);
        variantsPayload = [{ label: 'Talla', options: parsedSizes }];
      } else if (formData.category_archetype === 'GASTRO_FLASH') {
        const parsedModes = formData.variant_options.split(',').map(s => s.trim()).filter(Boolean);
        variantsPayload = [{ label: 'Modalidad', options: parsedModes.length > 0 ? parsedModes : ['En Mesa', 'Para Llevar'] }];
      } else if (formData.category_archetype === 'VEHICLES_CLASSIFIED') {
        variantsPayload = [{ label: 'Transmisión', options: ['Automática', 'Sincrónica'] }];
      }

      // Ficha técnica JSONB
      const specsPayload: Record<string, any> = {};
      if (formData.spec_1.trim()) specsPayload['especificacion_1'] = formData.spec_1.trim();
      if (formData.spec_2.trim()) specsPayload['especificacion_2'] = formData.spec_2.trim();

      const priceNum = parseFloat(formData.price);
      const regularPriceNum = formData.regular_price ? parseFloat(formData.regular_price) : priceNum;
      const salePriceNum = formData.sale_price ? parseFloat(formData.sale_price) : null;
      const finalAuraPrice = salePriceNum || priceNum;

      // Calcular fee de desbloqueo (10% con tope de arquetipo)
      const rawFee = finalAuraPrice * 0.10;
      const unlockFeeCalculated = formData.is_clearance 
        ? Math.min(rawFee, archetypeConfig.maxUnlockFeeCap) 
        : 0;

      // Si es un producto nuevo en el catálogo global
      if (!currentProductId) {
        const { data: newP, error: pError } = await supabase
          .from('products')
          .insert([{ 
            name: formData.name,
            category: formData.category,
            category_archetype: formData.category_archetype,
            variants: variantsPayload,
            specs: specsPayload,
            regular_price_usd: regularPriceNum,
            aura_price_usd: finalAuraPrice,
            unlock_fee_usd: unlockFeeCalculated,
            auto_confirm_stock: formData.auto_confirm_stock,
            stock_quota: formData.stock_quota,
            is_sponsored: formData.is_sponsored,
            published_at: new Date().toISOString(),
            sizes: formData.sizes.split(',').map(s => s.trim()).filter(Boolean)
          }])
          .select()
          .single();
        if (pError) throw pError;
        currentProductId = newP.id;
      }

      const discountPercent = regularPriceNum > finalAuraPrice
        ? Math.round(((regularPriceNum - finalAuraPrice) / regularPriceNum) * 100)
        : formData.is_clearance ? 25 : 0;

      // Insertar en store_products
      const { error: spError } = await supabase
        .from('store_products')
        .insert([{
          store_id: storeId,
          product_id: currentProductId,
          price: finalAuraPrice,
          stock: formData.stock_status === 'available' ? 10 : formData.stock_status === 'last_units' ? 2 : 0,
          discount_percent: discountPercent,
          is_active: formData.is_active
        }]);

      if (spError) throw spError;

      alert(`✓ Producto publicado en tu vitrina (${archetypeConfig.name}).`);
      setIsAdding(false);
      setFormData({
        product_id: '',
        name: '',
        category: 'Calzado',
        category_archetype: 'RETAIL_STANDARD',
        price: '',
        regular_price: '',
        sale_price: '',
        sizes: '37, 38, 39, 40',
        variant_options: 'En Mesa, Para Llevar',
        auto_confirm_stock: false,
        stock_quota: 10,
        spec_1: '',
        spec_2: '',
        stock_status: 'available',
        is_clearance: false,
        is_sponsored: false,
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

  const handleClearInventory = async () => {
    if (!storeId) return;
    if (!confirm("⚠️ ¿Estás seguro de que deseas eliminar TODOS los productos de tu vitrina para comenzar de cero? Esta acción no se puede deshacer.")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('store_products').delete().eq('store_id', storeId);
      if (error) throw error;
      alert("✓ Tu inventario ha sido vaciado. Ya puedes comenzar a subir tus nuevos productos.");
      await fetchInventory(storeId);
    } catch (err: any) {
      alert("Error al vaciar inventario: " + err.message);
    } finally {
      setLoading(false);
    }
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

  // Métricas del Panel de Impacto
  const completedReservations = reservations.filter(
    r => r.status === 'completed' || r.status === 'completada' || r.status === 'COMPLETED_IN_STORE' || r.payment_reference
  );
  const totalSalesUSD = completedReservations.reduce((sum, r) => sum + (r.price_usd || 0), 0);
  const tasaUsed = reservations[0]?.tasa || 55;
  const totalSalesVES = totalSalesUSD * tasaUsed;

  const missedDemand = reservations.filter(
    r => r.status === 'cancelled' || r.status === 'cancelada' || r.status === 'REJECTED_OUT_OF_STOCK' || r.customer_name?.includes('[FILA DE ESPERA]')
  );
  const missedCustomersCount = missedDemand.length;

  const pendingReservations = reservations.filter(
    r => r.status === 'pending' || r.status === 'pendiente' || r.status === 'confirmed' || r.status === 'confirmada' || r.status === 'ultimo_par' || r.status === 'PENDING_STOCK_CHECK' || r.status === 'STOCK_VERIFIED' || r.status === 'QR_ACTIVE'
  );

  const planTier = store?.plan_tier || 'VITRINA_20';
  const planName = planTier === 'DOMINIO_80' ? 'Dominio ($80/mes)' : planTier === 'ACELERADOR_45' ? 'Acelerador ($45/mes)' : 'Vitrina ($20/mes)';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR DE COMERCIO */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between md:justify-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center font-black text-xl text-slate-950">
            A
          </div>
          <div className="min-w-0">
            <h2 className="font-black text-white text-base tracking-tight leading-none truncate max-w-[140px]">
              {store?.name || 'AURA OPS'}
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] bg-indigo-500/30 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-400/30">
                {planName}
              </span>
            </div>
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
        
        {/* PANEL DE IMPACTO Y DEMANDA PERDIDA */}
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
              <span>Intentaron apartar pero la talla o producto estaba agotado. ¡Surtir estos artículos representa ventas directas!</span>
            </p>
          </div>

        </section>

        {/* PESTAÑA 1: SEMÁFORO DE RESERVAS Y VALIDACIÓN EN CAJA */}
        {activeTab === 'reservations' && (
          <div className="space-y-6">
            
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Semáforo de Reservas en Tienda
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">
                  Confirma stock en estante o valida el PIN cuando el cliente llegue a caja física.
                </p>
              </div>
            </header>

            {/* CAJA DE VALIDACIÓN POR PIN DE RETIRO + CANDADO DE CONFIANZA */}
            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-6 rounded-3xl shadow-lg border border-indigo-800">
              <div className="max-w-2xl">
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-300 block mb-1">
                  Validador de Mostrador & Candado de Confianza
                </span>
                <h3 className="text-xl font-black mb-1">¿El cliente está frente al mostrador?</h3>
                <p className="text-xs text-white/80 mb-4">
                  Pídele su PIN de 4 dígitos para completar la venta o liberar el stock si la prenda no le quedó.
                </p>

                <form onSubmit={handleValidatePin} className="flex flex-wrap gap-2">
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
                    className="cursor-pointer bg-teal-400 hover:bg-teal-300 text-slate-950 font-black px-5 py-3 rounded-xl transition text-xs sm:text-sm flex items-center gap-2 shadow-md"
                  >
                    <CheckCircle2 size={18} /> Validar Entrega y Cobro
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
                    const archetype = getArchetypeConfig(res.category_archetype);

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
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-black bg-slate-900 text-teal-400 px-2 py-0.5 rounded-md">
                                  PIN #{res.pin}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {archetype.name.split(',')[0]}
                                </span>
                              </div>
                              <h4 className="font-black text-slate-900 text-base mt-1.5 leading-snug">
                                {res.product_name}
                              </h4>
                            </div>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {res.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                            </span>
                          </div>

                          {/* Badge de Pago Móvil Directo */}
                          {hasPagoMovil && (
                            <div className="mb-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                              <Smartphone size={14} className="text-emerald-600 shrink-0" />
                              <div className="font-medium truncate text-[11px]">
                                <strong>Pago Notificado:</strong> {res.customer_phone}
                              </div>
                            </div>
                          )}

                          {/* Badge de Fila de Espera */}
                          {isWaitlist && (
                            <div className="mb-2 p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                              <Users size={14} className="text-amber-600 shrink-0" />
                              <div className="text-[11px]">
                                <strong>Fila de Espera:</strong> Cliente aguarda turno si el actual no retira.
                              </div>
                            </div>
                          )}

                          <div className="space-y-1 text-xs text-slate-600">
                            {res.selected_size && (
                              <p>Variante / Talla: <strong className="text-slate-900">{res.selected_size}</strong></p>
                            )}
                            <p>Cliente: <strong className="text-slate-900">{res.customer_name}</strong> ({res.customer_phone})</p>
                            
                            {/* Desglose de Split Payment */}
                            {res.unlock_fee_usd && res.unlock_fee_usd > 0 ? (
                              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 mt-2 space-y-0.5">
                                <div className="text-[11px] text-teal-700 font-semibold flex items-center gap-1">
                                  <ShieldCheck size={12} /> Anticipo cobrado por Aura: <strong>${res.unlock_fee_usd.toFixed(2)} USD</strong>
                                </div>
                                <div className="text-xs text-slate-900 font-bold">
                                  Cobrar en tu caja: <strong className="text-emerald-700 font-black">${(res.store_pay_balance_usd ?? res.price_usd).toFixed(2)} USD</strong> (Bs. {res.price_ves})
                                </div>
                              </div>
                            ) : (
                              <p className="mt-1">Total a cobrar en caja: <strong className="text-emerald-700 font-black">${res.price_usd} USD</strong> (Bs. {res.price_ves})</p>
                            )}
                          </div>
                        </div>

                        {/* SEMÁFORO DE ACCIÓN + CANDADO DE CONFIANZA */}
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Semáforo de Disponibilidad en Estante:
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              onClick={() => handleUpdateReservationStatus(res, 'confirmed')}
                              className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl text-[11px] font-bold transition flex flex-col items-center justify-center text-center leading-tight shadow-sm"
                              title="El producto está en el estante y quedan más unidades"
                            >
                              <Check size={14} className="mb-0.5" />
                              <span>Sí hay (Activo)</span>
                            </button>

                            <button
                              onClick={() => handleUpdateReservationStatus(res, 'ultimo_par')}
                              className="cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 p-2 rounded-xl text-[11px] font-black transition flex flex-col items-center justify-center text-center leading-tight shadow-sm"
                              title="Último par/unidad: activa la fila de espera"
                            >
                              <AlertCircle size={14} className="mb-0.5" />
                              <span>Último Par</span>
                            </button>

                            <button
                              onClick={() => handleUpdateReservationStatus(res, 'cancelled')}
                              className="cursor-pointer bg-red-600 hover:bg-red-500 text-white p-2 rounded-xl text-[11px] font-bold transition flex flex-col items-center justify-center text-center leading-tight shadow-sm"
                              title="Agotado: registra demanda perdida"
                            >
                              <X size={14} className="mb-0.5" />
                              <span>Agotado</span>
                            </button>
                          </div>

                          {/* BOTÓN SECUNDARIO CANDADO DE CONFIANZA */}
                          <button
                            type="button"
                            onClick={() => handleAttendedNoSale(res)}
                            className="w-full text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-dashed border-slate-200 rounded-xl py-2 px-3 text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                          >
                            <ShieldCheck size={13} className="text-teal-600" />
                            <span>Cliente asistió pero no llevó (Liberar Stock a Billetera)</span>
                          </button>
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

        {/* PESTAÑA 2: MI VITRINA 80/20 (CATÁLOGO MULTI-RUBRO) */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Mi Vitrina Multi-Rubro ({products.length} Productos)
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">
                  Sube tus 15 a 40 productos clave con variantes dinámicas (Restaurantes, Retail, Tecnología, Vehículos).
                </p>
              </div>
              <div className="flex items-center gap-2">
                {products.length > 0 && (
                  <button
                    onClick={handleClearInventory}
                    className="cursor-pointer bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-3 rounded-2xl font-bold flex items-center gap-1.5 text-xs sm:text-sm transition shadow-sm"
                    title="Eliminar todos los productos de tu vitrina para comenzar de nuevo"
                  >
                    <Trash2 size={16} /> Vaciar Inventario
                  </button>
                )}
                <button
                  onClick={() => setIsAdding(true)}
                  className="cursor-pointer bg-slate-900 hover:bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 text-sm transition shadow-lg shadow-slate-900/10"
                >
                  <Plus size={18} /> Añadir Producto
                </button>
              </div>
            </header>

            {/* GRID O ESTADO VACÍO DE PRODUCTOS EN VITRINA */}
            {products.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto my-6">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-900">Tu vitrina está lista para despegar</h3>
                <p className="text-xs text-slate-500 mt-1 mb-6">
                  Aún no tienes productos publicados. Agrega tus artículos o combos estrella para que los compradores de Cumaná puedan reservarlos hoy mismo.
                </p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="cursor-pointer bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white px-6 py-3.5 rounded-2xl font-black text-sm transition shadow-lg shadow-teal-500/20 inline-flex items-center gap-2"
                >
                  <Plus size={18} /> Publicar Mi Primer Producto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((item) => {
                const archetype = getArchetypeConfig(item.products?.category_archetype);

                return (
                  <div
                    key={item.id}
                    className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {archetype.name.split(',')[0]}
                        </span>
                        <div className={`h-2.5 w-2.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>

                      <h3 className="font-bold text-slate-900 text-base leading-snug mb-1">
                        {item.products?.name}
                      </h3>

                      {item.products?.variants && item.products.variants.length > 0 && (
                        <p className="text-xs text-slate-500 mb-2">
                          {item.products.variants[0].label}: <span className="font-semibold text-slate-700">{item.products.variants[0].options.join(', ')}</span>
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
                );
              })}
            </div>
            )}

            {/* MODAL ADAPTATIVO MULTI-RUBRO V3.0 */}
            {isAdding && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
                <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-100 my-4 animate-in zoom-in-95">
                  <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                      <h2 className="font-black text-lg">Publicar Producto en tu Vitrina</h2>
                      <p className="text-xs text-slate-400">Formulario Inteligente según tu Rubro Comercial</p>
                    </div>
                    <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white cursor-pointer">
                      Cerrar
                    </button>
                  </div>

                  <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    
                    {/* SELECTOR DE ARQUETIPO DE CATEGORÍA */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Rubro / Arquetipo Comercial</label>
                      <select
                        value={formData.category_archetype}
                        onChange={(e) => {
                          const arch = e.target.value as CategoryArchetype;
                          setFormData({ 
                            ...formData, 
                            category_archetype: arch,
                            category: arch === 'GASTRO_FLASH' ? 'Comida' : arch === 'HIGH_TICKET' ? 'Electrodomésticos' : arch === 'VEHICLES_CLASSIFIED' ? 'Vehículos' : 'Calzado'
                          });
                        }}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="RETAIL_STANDARD">🛍️ Retail & Moda (Ropa, Calzado, Juguetes, Joyería)</option>
                        <option value="GASTRO_FLASH">🍽️ Gastro Flash (Restaurantes, Cafés, Panaderías - Cupos Hoy)</option>
                        <option value="HIGH_TICKET">📺 High Ticket (Electrodomésticos, Muebles, Tecnología - Apartado)</option>
                        <option value="URGENT_SEARCH">🔧 Urgente (Ferretería, Farmacia, Repuestos)</option>
                        <option value="VEHICLES_CLASSIFIED">🚗 Vehículos & Motos (Agendamiento de Citas Verificadas)</option>
                      </select>
                    </div>

                    {/* Nombre del Producto */}
                    <div className="space-y-1 relative">
                      <label className="text-xs font-bold uppercase text-slate-500">Nombre del Producto o Combo</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Combo Hamburguesa Especial + Bebida (o Zapato Deportivo)"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setFormData({ ...formData, name: e.target.value, product_id: '' });
                        }}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Precios y Split-Payment */}
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
                        <label className="text-xs font-bold uppercase text-slate-500">Precio Oferta Aura ($)</label>
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

                    {/* CAMPOS ADAPTATIVOS SEGÚN ARQUETIPO */}
                    {formData.category_archetype === 'RETAIL_STANDARD' && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-500">Tallas Disponibles (Separadas por coma)</label>
                        <input
                          type="text"
                          placeholder="Ej: 37, 38, 39, 40"
                          value={formData.sizes}
                          onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {formData.category_archetype === 'GASTRO_FLASH' && (
                      <div className="space-y-3 p-4 bg-amber-50/60 border border-amber-200 rounded-2xl">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-amber-900">Modalidades de Consumo</label>
                          <input
                            type="text"
                            placeholder="Ej: En Mesa / Local, Para Llevar"
                            value={formData.variant_options}
                            onChange={(e) => setFormData({ ...formData, variant_options: e.target.value })}
                            className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-amber-900">Cupos Disponibles Hoy</label>
                            <input
                              type="number"
                              value={formData.stock_quota}
                              onChange={(e) => setFormData({ ...formData, stock_quota: parseInt(e.target.value) || 10 })}
                              className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-amber-900">Válido Hoy Hasta</label>
                            <input
                              type="text"
                              placeholder="Ej: 21:00 hrs"
                              value={formData.spec_1}
                              onChange={(e) => setFormData({ ...formData, spec_1: e.target.value })}
                              className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="autoConfirmCheck"
                            checked={formData.auto_confirm_stock}
                            onChange={(e) => setFormData({ ...formData, auto_confirm_stock: e.target.checked })}
                            className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                          />
                          <label htmlFor="autoConfirmCheck" className="text-xs font-bold text-amber-950 flex items-center gap-1 cursor-pointer">
                            <Zap size={14} className="text-amber-600" />
                            Autoconfirmar cupo sin esperar botón verde (Ideal para combos del día)
                          </label>
                        </div>
                      </div>
                    )}

                    {formData.category_archetype === 'HIGH_TICKET' && (
                      <div className="grid grid-cols-2 gap-2 p-3 bg-teal-50 border border-teal-200 rounded-2xl">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-teal-900">Garantía</label>
                          <input
                            type="text"
                            placeholder="Ej: 1 año"
                            value={formData.spec_1}
                            onChange={(e) => setFormData({ ...formData, spec_1: e.target.value })}
                            className="w-full p-2 bg-white border border-teal-300 rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-teal-900">Voltaje / Modelo</label>
                          <input
                            type="text"
                            placeholder="Ej: 110V / Samsung"
                            value={formData.spec_2}
                            onChange={(e) => setFormData({ ...formData, spec_2: e.target.value })}
                            className="w-full p-2 bg-white border border-teal-300 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {formData.category_archetype === 'VEHICLES_CLASSIFIED' && (
                      <div className="grid grid-cols-2 gap-2 p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-rose-900">Año de Fabricación</label>
                          <input
                            type="text"
                            placeholder="Ej: 2021"
                            value={formData.spec_1}
                            onChange={(e) => setFormData({ ...formData, spec_1: e.target.value })}
                            className="w-full p-2 bg-white border border-rose-300 rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-rose-900">Kilometraje (km)</label>
                          <input
                            type="text"
                            placeholder="Ej: 45.000 km"
                            value={formData.spec_2}
                            onChange={(e) => setFormData({ ...formData, spec_2: e.target.value })}
                            className="w-full p-2 bg-white border border-rose-300 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Switches Adicionales: Remates & Aura Ads */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="clearanceCheck"
                          checked={formData.is_clearance}
                          onChange={(e) => setFormData({ ...formData, is_clearance: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="clearanceCheck" className="text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer">
                          <Flame size={14} className="text-amber-500" />
                          Destacar en &quot;Remates y Flash Outlets&quot;
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="sponsoredCheck"
                          checked={formData.is_sponsored}
                          onChange={(e) => setFormData({ ...formData, is_sponsored: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="sponsoredCheck" className="text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer">
                          <Sparkles size={14} className="text-teal-500" />
                          Impulso Aura Ads (Aparecer de primero en búsquedas)
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="cursor-pointer w-full bg-slate-900 hover:bg-indigo-600 text-white py-3.5 rounded-xl font-black text-sm transition mt-2 shadow-md"
                    >
                      {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Publicar Producto en Vitrina'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: HABLADOR FÍSICO QR */}
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