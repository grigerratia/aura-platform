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
  DollarSign, ShieldCheck, Zap, Crown, Award, Layers, Sparkles, Lock, ArrowUpRight,
  Upload, Image as ImageIcon, Camera
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

  // Verificación Rápida B2B
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    storefront_photo_url: '',
    rif_or_id_number: '',
    instagram_handle: ''
  });
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Modo Mostrador (PIN)
  const [showPinModal, setShowPinModal] = useState(false);
  const [cashierPin, setCashierPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Formulario Adaptativo Multi-Rubro
  const [formData, setFormData] = useState<{
    product_id: string;
    name: string;
    description: string;
    brand: string;
    imageUrl: string;
    category: string;
    category_archetype: CategoryArchetype;
    price: string;
    regular_price: string;
    sale_price: string;
    stock: number;
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
    description: '',
    brand: '',
    imageUrl: '',
    category: 'Calzado',
    category_archetype: 'RETAIL_STANDARD',
    price: '',
    regular_price: '',
    sale_price: '',
    stock: 10,
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
    const { data, error } = await supabase
      .from('store_products')
      .select(`
        *,
        products (*)
      `)
      .eq('store_id', sId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar inventario:', error);
      return;
    }

    if (data) {
      const mapped = data.map((item: any) => ({
        ...item,
        products: item.products ? {
          ...item.products,
          category_archetype: item.products.archetype || item.products.category_archetype || 'RETAIL_STANDARD'
        } : null
      }));
      setProducts(mapped);
    }
  }, []);

  const fetchReservations = useCallback(async (sId: string) => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          products (name, imageUrl, archetype)
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
            product_image: r.products?.imageUrl || r.products?.image_url || r.product_image,
            selected_size: r.selected_size || 'Única',
            category_archetype: r.category_archetype || r.products?.archetype || 'RETAIL_STANDARD',
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

    // 1. Buscar en stores por owner_id
    let targetStoreData: any = null;
    const { data: storeByOwner } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle();

    if (storeByOwner) {
      targetStoreData = storeByOwner;
    } else {
      // 2. Si no, consultar profiles.store_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.store_id) {
        const { data: storeData } = await supabase
          .from('stores')
          .select('*')
          .eq('id', profile.store_id)
          .maybeSingle();

        if (storeData) {
          targetStoreData = storeData;
          if (!storeData.owner_id) {
            await supabase.from('stores').update({ owner_id: user.id }).eq('id', storeData.id);
          }
        }
      }
    }

    if (targetStoreData) {
      setStoreId(targetStoreData.id);
      setStore(targetStoreData as Store);

      await supabase.from('profiles').upsert({
        id: user.id,
        role: 'owner',
        store_id: targetStoreData.id,
        full_name: user.user_metadata?.full_name || 'Comerciante Aura'
      });

      await Promise.all([
        fetchInventory(targetStoreData.id),
        fetchReservations(targetStoreData.id)
      ]);
    } else {
      router.push('/negocios');
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

  // Semáforo de Acción
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

      if (newStatus === 'ultimo_par') {
        await supabase
          .from('store_products')
          .update({ stock: 1 })
          .eq('store_id', reservation.store_id)
          .eq('product_id', reservation.product_id);
      } else if (newStatus === 'cancelled') {
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

  // Validar PIN en caja
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

        setPinSuccessMessage(`✓ Venta validada: PIN #${cleanPin} (${target.customer_name}).`);
        setPinInput('');
        if (storeId) fetchReservations(storeId);
      } catch {
        setPinSuccessMessage(`PIN #${cleanPin} validado con éxito.`);
      }
    } else {
      alert('PIN no encontrado o ya expirado. Verifica los 4 dígitos.');
    }
  };

  // Candado de Confianza: liberar stock a billetera
  const handleAttendedNoSale = async (res: Reservation) => {
    const feeToRefund = res.unlock_fee_usd && res.unlock_fee_usd > 0 ? res.unlock_fee_usd : 3.00;
    if (!confirm(`¿El cliente asistió pero no llevó la prenda? Se liberará el stock y se abonarán $${feeToRefund.toFixed(2)} USD a su Billetera Aura.`)) return;

    try {
      await supabase
        .from('reservations')
        .update({ status: 'ATTENDED_NO_SALE' })
        .eq('id', res.id);

      await supabase
        .from('store_products')
        .update({ is_active: true, stock: 10 })
        .eq('store_id', res.store_id)
        .eq('product_id', res.product_id);

      await refundFeeToWallet({
        reservationId: res.id,
        amountUsd: feeToRefund
      });

      alert(`✓ Stock liberado. Saldo de $${feeToRefund.toFixed(2)} acreditado al cliente.`);
      if (storeId) {
        fetchReservations(storeId);
        fetchInventory(storeId);
      }
    } catch (err: any) {
      alert('Error al liberar stock: ' + err.message);
    }
  };

  // Subir imagen a Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      alert('La imagen no debe superar los 6MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanFileName = `${storeId || 'tienda'}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(cleanFileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Error al subir imagen a Storage:', error);
        alert('No se pudo subir automáticamente. Puedes pegar el enlace directo (URL) de la imagen o verificar las políticas de almacenamiento.');
        return;
      }

      const { data: publicData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      if (publicData?.publicUrl) {
        setFormData(prev => ({ ...prev, imageUrl: publicData.publicUrl }));
      }
    } catch (err: any) {
      alert('Error al procesar la imagen: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Guardar Producto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setLoading(true);

    try {
      let currentProductId = formData.product_id;
      const archetypeConfig = getArchetypeConfig(formData.category_archetype);

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

      const specsPayload: Record<string, any> = {};
      if (formData.spec_1.trim()) specsPayload['especificacion_1'] = formData.spec_1.trim();
      if (formData.spec_2.trim()) specsPayload['especificacion_2'] = formData.spec_2.trim();

      const priceNum = parseFloat(formData.price);
      const regularPriceNum = formData.regular_price ? parseFloat(formData.regular_price) : priceNum;
      const salePriceNum = formData.sale_price ? parseFloat(formData.sale_price) : null;
      const finalAuraPrice = salePriceNum || priceNum;

      const rawFee = finalAuraPrice * 0.10;
      const unlockFeeCalculated = formData.is_clearance 
        ? Math.min(rawFee, archetypeConfig.maxUnlockFeeCap) 
        : 0;

      if (!currentProductId) {
        const uniqueSlug = `${formData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
        const { data: newP, error: pError } = await supabase
          .from('products')
          .insert([{ 
            name: formData.name,
            slug: uniqueSlug,
            description: formData.description.trim() || null,
            brand: formData.brand.trim() || null,
            imageUrl: formData.imageUrl.trim() || null,
            category: formData.category,
            archetype: formData.category_archetype,
            variants: variantsPayload,
            specs: specsPayload,
            regular_price_usd: regularPriceNum,
            aura_price_usd: finalAuraPrice,
            unlock_fee_usd: unlockFeeCalculated,
            auto_confirm_stock: formData.auto_confirm_stock,
            is_sponsored: formData.is_sponsored,
            published_at: new Date().toISOString(),
            price: regularPriceNum || finalAuraPrice
          }])
          .select()
          .single();
        if (pError) throw pError;
        currentProductId = newP.id;
      }

      const discountPercent = regularPriceNum > finalAuraPrice
        ? Math.round(((regularPriceNum - finalAuraPrice) / regularPriceNum) * 100)
        : formData.is_clearance ? 25 : 0;

      const finalStock = Number(formData.stock) > 0 
        ? Number(formData.stock) 
        : (formData.stock_status === 'available' ? 10 : formData.stock_status === 'last_units' ? 2 : 0);

      const { error: spError } = await supabase
        .from('store_products')
        .insert([{
          store_id: storeId,
          product_id: currentProductId,
          price: finalAuraPrice,
          stock: finalStock,
          discount_percent: discountPercent,
          is_active: formData.is_active
        }]);

      if (spError) throw spError;

      alert(`✓ Producto publicado en tu vitrina.`);
      setIsAdding(false);
      setFormData({
        product_id: '',
        name: '',
        description: '',
        brand: '',
        imageUrl: '',
        category: 'Calzado',
        category_archetype: 'RETAIL_STANDARD',
        price: '',
        regular_price: '',
        sale_price: '',
        stock: 10,
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
    if (!confirm("¿Deseas eliminar todos los productos para comenzar de cero?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('store_products').delete().eq('store_id', storeId);
      if (error) throw error;
      await fetchInventory(storeId);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setVerifyLoading(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({
          storefront_photo_url: verifyForm.storefront_photo_url.trim(),
          rif_or_id_number: verifyForm.rif_or_id_number.trim(),
          instagram_handle: verifyForm.instagram_handle.trim(),
          verification_status: 'PENDING_REVIEW'
        })
        .eq('id', storeId);

      if (error) throw error;
      alert("✓ Solicitud enviada con éxito.");
      setShowVerifyModal(false);
      if (store) {
        setStore({
          ...store,
          verification_status: 'PENDING_REVIEW',
          storefront_photo_url: verifyForm.storefront_photo_url.trim(),
          rif_or_id_number: verifyForm.rif_or_id_number.trim(),
          instagram_handle: verifyForm.instagram_handle.trim()
        });
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleUpdateCashierPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !cashierPin.trim()) return;
    setPinLoading(true);
    try {
      const cleanPin = cashierPin.trim();
      const { error } = await supabase
        .from('stores')
        .update({ cashier_access_pin: cleanPin })
        .eq('id', storeId);

      if (error) throw error;
      alert(`✓ PIN de Mostrador actualizado: ${cleanPin}`);
      setShowPinModal(false);
      if (store) setStore({ ...store, cashier_access_pin: cleanPin });
    } catch (err: any) {
      alert("Error al actualizar PIN: " + err.message);
    } finally {
      setPinLoading(false);
    }
  };

  if (loading && !isAdding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020508] text-white">
        <Loader2 className="animate-spin text-emerald-400" size={36} />
      </div>
    );
  }

  const storeSlug = store?.slug || '';
  const storeUrl = typeof window !== 'undefined' ? `${window.location.origin}/${storeSlug}` : `https://aura.lat/${storeSlug}`;

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
  const planName = planTier === 'DOMINIO_80' ? 'Dominio' : planTier === 'ACELERADOR_45' ? 'Acelerador' : 'Vitrina';

  return (
    <div className="min-h-screen bg-[#020508] text-slate-200 flex flex-col md:flex-row font-sans selection:bg-[#00ffb2] selection:text-black">
      
      {/* 1. SIDEBAR DE COMERCIO */}
      <aside className="w-full md:w-64 bg-[#030910] border-r border-slate-900 flex flex-col shrink-0">
        
        {/* Cabecera del Comercio */}
        <div className="p-4 md:p-5 border-b border-slate-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center font-black text-base text-black shrink-0">
              A
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-white text-sm tracking-tight truncate max-w-[130px]">
                {store?.name || 'Mi Comercio'}
              </h2>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                Plan {planName}
              </span>
            </div>
          </div>

          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/negocios'))}
            className="md:hidden cursor-pointer p-1.5 text-slate-400 hover:text-rose-400 transition"
            title="Cerrar Sesión"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <nav className="flex-1 p-3 space-y-1 flex md:flex-col overflow-x-auto">
          <button
            onClick={() => setActiveTab('reservations')}
            className={`cursor-pointer flex items-center gap-2.5 w-full p-2.5 rounded-xl font-bold text-xs transition ${
              activeTab === 'reservations'
                ? 'bg-slate-900 text-white border border-slate-800'
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <Clock size={16} className={activeTab === 'reservations' ? 'text-emerald-400' : ''} />
            <span className="whitespace-nowrap">Semáforo de Reservas</span>
            {pendingReservations.length > 0 && (
              <span className="ml-auto bg-emerald-500/20 text-[#00ffb2] px-1.5 py-0.5 rounded text-[10px] font-bold">
                {pendingReservations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`cursor-pointer flex items-center gap-2.5 w-full p-2.5 rounded-xl font-bold text-xs transition ${
              activeTab === 'inventory'
                ? 'bg-slate-900 text-white border border-slate-800'
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <Package size={16} className={activeTab === 'inventory' ? 'text-emerald-400' : ''} />
            <span className="whitespace-nowrap">Mi Vitrina ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`cursor-pointer flex items-center gap-2.5 w-full p-2.5 rounded-xl font-bold text-xs transition ${
              activeTab === 'qr'
                ? 'bg-slate-900 text-white border border-slate-800'
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <QrCode size={16} className={activeTab === 'qr' ? 'text-emerald-400' : ''} />
            <span className="whitespace-nowrap">Hablador QR</span>
          </button>

          {/* MODO MOSTRADOR */}
          <div className="p-3 bg-[#020508] border border-slate-900 rounded-xl mt-4 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Lock size={12} className="text-emerald-400" /> Mostrador
              </span>
              <button
                type="button"
                onClick={() => {
                  setCashierPin(store?.cashier_access_pin || '1234');
                  setShowPinModal(true);
                }}
                className="text-slate-400 hover:text-white text-[10px] underline cursor-pointer"
              >
                PIN: {store?.cashier_access_pin || '1234'}
              </button>
            </div>
            {storeId && (
              <Link
                href={`/mostrador/${storeId}`}
                target="_blank"
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold py-1.5 px-2.5 rounded-lg flex items-center justify-between transition text-[11px]"
              >
                <span>Terminal de Caja</span>
                <ArrowRight size={12} />
              </Link>
            )}
          </div>
        </nav>

        {/* Pie de Sidebar */}
        <div className="p-3 border-t border-slate-900 flex items-center justify-between">
          {storeSlug && (
            <Link
              href={`/${storeSlug}`}
              target="_blank"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold transition"
            >
              <span>Ver mi vitrina</span>
              <ArrowUpRight size={12} />
            </Link>
          )}
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/negocios'))}
            className="cursor-pointer text-slate-500 hover:text-rose-400 transition p-1.5"
            title="Cerrar Sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* 2. CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-6xl space-y-5">
        
        {/* BARRA SUPERIOR DE ACCIONES */}
        <div className="bg-[#030910] border border-slate-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center font-bold text-sm">
              {store?.name?.charAt(0) || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white text-base">
                  {store?.name || 'Mi Comercio'}
                </h1>
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="En línea" />
              </div>
              <p className="text-xs text-slate-400">
                {store?.zone || 'Cumaná, Sucre'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {storeSlug && (
              <Link
                href={`/${storeSlug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-xl transition border border-slate-800"
              >
                <span>Vitrina Pública</span>
                <ArrowUpRight size={13} />
              </Link>
            )}

            <button
              onClick={() => setShowPinModal(true)}
              className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-xl transition border border-slate-800"
            >
              <Lock size={13} className="text-emerald-400" />
              <span>PIN</span>
            </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/negocios');
              }}
              className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:bg-rose-950/30 px-3 py-2 rounded-xl transition border border-rose-950/50"
              title="Cerrar Sesión"
            >
              <LogOut size={14} />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* BANNER DE VERIFICACIÓN (DISCRETO Y DIRECTO) */}
        {(!store?.verification_status || store.verification_status === 'DRAFT_UNVERIFIED') && (
          <div className="bg-amber-950/30 border border-amber-900/40 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-400 shrink-0" />
              <span>Tienda en borrador: Verifícala para aparecer en el buscador público de Cumaná.</span>
            </div>
            <button
              onClick={() => {
                setVerifyForm({
                  storefront_photo_url: store?.storefront_photo_url || '',
                  rif_or_id_number: store?.rif_or_id_number || store?.rif || '',
                  instagram_handle: store?.instagram_handle || ''
                });
                setShowVerifyModal(true);
              }}
              className="cursor-pointer bg-amber-400 hover:bg-amber-300 text-black font-black px-3.5 py-1.5 rounded-xl text-xs transition shrink-0"
            >
              Verificar en 1 min
            </button>
          </div>
        )}

        {store?.verification_status === 'PENDING_REVIEW' && (
          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex items-center gap-2 text-xs text-slate-300">
            <Clock size={15} className="text-emerald-400 shrink-0" />
            <span>Verificación en revisión por el equipo de Aura. Se activará en breve.</span>
          </div>
        )}

        {/* MÉTRICAS (DISEÑO LIMPIO Y MATE) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          <div className="bg-[#030910] p-4 rounded-2xl border border-slate-900 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp size={13} className="text-emerald-400" /> Ventas validadas por Aura
            </span>
            <div className="text-2xl font-black text-white flex items-baseline gap-2">
              <span>${totalSalesUSD.toFixed(2)}</span>
              <span className="text-xs text-slate-400 font-bold">USD</span>
              <span className="text-xs text-emerald-400 font-semibold">
                ≈ Bs. {totalSalesVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              {completedReservations.length} compras completadas en tienda
            </span>
          </div>

          <div className="bg-[#030910] p-4 rounded-2xl border border-slate-900 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users size={13} className="text-amber-400" /> Demanda no satisfecha
            </span>
            <div className="text-2xl font-black text-white flex items-baseline gap-2">
              <span className="text-amber-400">{missedCustomersCount}</span>
              <span className="text-xs text-slate-400 font-bold">clientes sin stock</span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              Intentaron apartar cuando la talla o cupo estaba agotado
            </span>
          </div>

        </section>

        {/* PESTAÑA 1: SEMÁFORO DE RESERVAS */}
        {activeTab === 'reservations' && (
          <div className="space-y-4">
            
            {/* VALIDADOR DE PIN RÁPIDO */}
            <div className="bg-[#030910] p-4 rounded-2xl border border-slate-900 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white text-sm">Validar PIN de Cliente en Caja</h3>
                  <p className="text-xs text-slate-400">Ingresa los 4 dígitos del boleto cuando el cliente retire en tu local.</p>
                </div>

                <form onSubmit={handleValidatePin} className="flex gap-2 shrink-0">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="PIN #4821"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="px-3 py-2 bg-[#020508] text-white rounded-xl font-mono text-center w-28 text-sm border border-slate-800 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    <CheckCircle2 size={15} />
                    <span>Validar</span>
                  </button>
                </form>
              </div>

              {pinSuccessMessage && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={14} /> {pinSuccessMessage}
                </div>
              )}
            </div>

            {/* LISTA DE RESERVAS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span>Reservas en Curso ({pendingReservations.length})</span>
              </div>

              {pendingReservations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingReservations.map((res) => {
                    const hasPagoMovil = res.customer_phone?.includes('PAGO_MOVIL') || res.customer_phone?.includes('REF:');
                    const isWaitlist = res.customer_name?.includes('[FILA DE ESPERA]');
                    const archetype = getArchetypeConfig(res.category_archetype);

                    return (
                      <div
                        key={res.id}
                        className="bg-[#030910] p-4 rounded-2xl border border-slate-900 flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                PIN #{res.pin}
                              </span>
                              <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                                {archetype.name.split(',')[0]}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-900/40">
                              {res.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                            </span>
                          </div>

                          <h4 className="font-bold text-white text-sm leading-snug">
                            {res.product_name}
                          </h4>

                          {hasPagoMovil && (
                            <div className="mt-1.5 p-1.5 bg-emerald-950/40 rounded-lg border border-emerald-900/40 text-[11px] text-emerald-300 flex items-center gap-1.5">
                              <Smartphone size={12} className="text-emerald-400 shrink-0" />
                              <span className="truncate">{res.customer_phone}</span>
                            </div>
                          )}

                          <div className="mt-2 space-y-0.5 text-xs text-slate-400">
                            {res.selected_size && (
                              <p>Variante: <span className="text-white font-medium">{res.selected_size}</span></p>
                            )}
                            <p>Cliente: <span className="text-white font-medium">{res.customer_name}</span> ({res.customer_phone})</p>
                            
                            {res.unlock_fee_usd && res.unlock_fee_usd > 0 ? (
                              <div className="p-2 bg-[#020508] rounded-xl border border-slate-900 mt-1.5 text-xs">
                                <span className="text-slate-400">Cobrar en caja: </span>
                                <strong className="text-white font-black">${(res.store_pay_balance_usd ?? res.price_usd).toFixed(2)} USD</strong>
                                <span className="text-emerald-400 ml-1.5 font-bold">Bs. {res.price_ves}</span>
                              </div>
                            ) : (
                              <p className="pt-1">Total en caja: <strong className="text-white font-black">${res.price_usd} USD</strong> (Bs. {res.price_ves})</p>
                            )}
                          </div>
                        </div>

                        {/* SEMÁFORO DE ACCIÓN */}
                        <div className="pt-2 border-t border-slate-900 space-y-2">
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              onClick={() => handleUpdateReservationStatus(res, 'confirmed')}
                              className="cursor-pointer bg-emerald-600/80 hover:bg-emerald-600 text-white py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                              title="Hay stock disponible"
                            >
                              <Check size={13} />
                              <span>Sí Hay</span>
                            </button>

                            <button
                              onClick={() => handleUpdateReservationStatus(res, 'ultimo_par')}
                              className="cursor-pointer bg-amber-500/80 hover:bg-amber-500 text-black py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                              title="Última unidad disponible"
                            >
                              <AlertCircle size={13} />
                              <span>Último</span>
                            </button>

                            <button
                              onClick={() => handleUpdateReservationStatus(res, 'cancelled')}
                              className="cursor-pointer bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-300 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                              title="Agotado"
                            >
                              <X size={13} />
                              <span>Agotado</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAttendedNoSale(res)}
                            className="w-full text-slate-400 hover:text-white bg-[#020508] hover:bg-slate-900 border border-slate-850 rounded-xl py-1.5 text-[11px] font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ShieldCheck size={12} className="text-emerald-400" />
                            <span>Cliente no llevó: Liberar stock a Billetera</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#030910] p-8 rounded-2xl border border-slate-900 text-center text-xs text-slate-400">
                  No tienes reservas pendientes en este momento.
                </div>
              )}
            </div>

          </div>
        )}

        {/* PESTAÑA 2: MI VITRINA */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Inventario de la Tienda ({products.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Tus productos activos en el catálogo de Aura.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {products.length > 0 && (
                  <button
                    onClick={handleClearInventory}
                    className="cursor-pointer text-slate-400 hover:text-rose-400 text-xs font-bold px-3 py-2 rounded-xl transition border border-slate-850"
                  >
                    Vaciar Inventario
                  </button>
                )}
                <button
                  onClick={() => setIsAdding(true)}
                  className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <Plus size={15} />
                  <span>Añadir Producto</span>
                </button>
              </div>
            </header>

            {products.length === 0 ? (
              <div className="bg-[#030910] border border-slate-900 rounded-2xl p-10 text-center max-w-md mx-auto space-y-3">
                <Package size={32} className="text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">Tu vitrina no tiene productos</h3>
                <p className="text-xs text-slate-400">
                  Agrega tus artículos estrella para que los compradores puedan reservarlos.
                </p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition"
                >
                  <Plus size={14} />
                  <span>Publicar Mi Primer Producto</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {products.map((item) => {
                  const archetype = getArchetypeConfig(item.products?.category_archetype);
                  const p = item.products;

                  return (
                    <div
                      key={item.id}
                      className="bg-[#030910] p-4 rounded-2xl border border-slate-900 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        {p?.imageUrl && (
                          <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-950 mb-3 border border-slate-850">
                            <img
                              src={p.imageUrl}
                              alt={p.name || 'Producto'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                            {archetype.name.split(',')[0]}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${item.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        </div>

                        {p?.brand && (
                          <span className="text-[10px] text-emerald-400/90 font-bold uppercase tracking-wider block mb-0.5">
                            {p.brand}
                          </span>
                        )}

                        <h3 className="font-bold text-white text-sm leading-snug line-clamp-2">
                          {p?.name}
                        </h3>

                        {p?.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                            {p.description}
                          </p>
                        )}

                        {p?.variants && p.variants.length > 0 && (
                          <p className="text-[11px] text-slate-400 mt-1 truncate">
                            {p.variants[0].label}: {p.variants[0].options.join(', ')}
                          </p>
                        )}

                        <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-900">
                          <div>
                            <span className="text-lg font-black text-white">${item.price}</span>
                            <span className="text-xs text-slate-400 font-bold ml-1">USD</span>
                          </div>
                          <span className="text-xs text-slate-400 font-medium">
                            Stock: <strong className="text-white">{item.stock ?? 10}</strong> un.
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
                        <button
                          onClick={() => deleteProduct(item.id)}
                          className="cursor-pointer text-slate-500 hover:text-rose-400 font-bold flex items-center gap-1 transition"
                        >
                          <Trash2 size={13} />
                          <span>Quitar</span>
                        </button>
                        <span className="text-[11px] text-slate-400">
                          {item.is_active ? 'Visible' : 'Pausado'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODAL MULTI-RUBRO DE AÑADIR PRODUCTO */}
            {isAdding && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
                <div className="bg-[#030910] w-full max-w-lg rounded-3xl overflow-hidden border border-slate-800 shadow-2xl my-4 text-white">
                  <div className="p-4 sm:p-5 border-b border-slate-900 flex justify-between items-center">
                    <h3 className="font-bold text-sm text-white">Publicar Producto en Vitrina</h3>
                    <button
                      onClick={() => setIsAdding(false)}
                      className="p-1 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveProduct} className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
                    
                    {/* Foto del Producto */}
                    <div className="space-y-2 p-3 bg-[#020508] border border-slate-850 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                          <Camera size={13} className="text-emerald-400" />
                          <span>Foto del Producto</span>
                        </label>
                        {formData.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, imageUrl: '' })}
                            className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                          >
                            Quitar foto
                          </button>
                        )}
                      </div>

                      {formData.imageUrl ? (
                        <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                          <img
                            src={formData.imageUrl}
                            alt="Vista previa"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <label className="w-full cursor-pointer bg-slate-900 hover:bg-slate-850 border border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl py-3 px-3 flex items-center justify-center gap-2 text-slate-300 transition text-xs font-semibold">
                            {uploadingImage ? (
                              <>
                                <Loader2 size={15} className="animate-spin text-emerald-400" />
                                <span>Subiendo foto a Supabase...</span>
                              </>
                            ) : (
                              <>
                                <Upload size={15} className="text-emerald-400" />
                                <span>Subir foto desde dispositivo</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingImage}
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}

                      <div className="pt-1">
                        <input
                          type="url"
                          placeholder="O pega el enlace de la foto (https://...)"
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                          className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white text-xs placeholder:text-slate-600 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Rubro Comercial */}
                    <div className="space-y-1">
                      <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Rubro Comercial</label>
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
                        className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                      >
                        <option value="RETAIL_STANDARD">Retail & Moda (Ropa, Calzado, Joyería)</option>
                        <option value="GASTRO_FLASH">Gastro Flash (Restaurantes, Cafés, Comida)</option>
                        <option value="HIGH_TICKET">High Ticket (Electrodomésticos, Muebles)</option>
                        <option value="URGENT_SEARCH">Urgente (Ferretería, Farmacia, Repuestos)</option>
                        <option value="VEHICLES_CLASSIFIED">Vehículos & Motos</option>
                      </select>
                    </div>

                    {/* Nombre */}
                    <div className="space-y-1">
                      <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Nombre del Producto</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Zapato Deportivo Casual o Combo Burger"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setFormData({ ...formData, name: e.target.value, product_id: '' });
                        }}
                        className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Marca y Stock */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Marca / Fabricante</label>
                        <input
                          type="text"
                          placeholder="Ej: Nike, Samsung, Casero..."
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Stock / Unidades</label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="10"
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                          className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Descripción */}
                    <div className="space-y-1">
                      <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Descripción o Detalles</label>
                      <textarea
                        rows={2}
                        placeholder="Describe el producto, materiales, estado o detalles importantes..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 resize-none text-xs"
                      />
                    </div>

                    {/* Precios */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Precio Regular ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="35.00"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Precio Oferta Aura ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Opcional"
                          value={formData.sale_price}
                          onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                          className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Variantes según rubro */}
                    {formData.category_archetype === 'RETAIL_STANDARD' && (
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Tallas (separadas por coma)</label>
                        <input
                          type="text"
                          placeholder="37, 38, 39, 40"
                          value={formData.sizes}
                          onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                          className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    {formData.category_archetype === 'GASTRO_FLASH' && (
                      <div className="space-y-2 p-3 bg-[#020508] border border-slate-850 rounded-xl">
                        <div className="space-y-1">
                          <label className="text-slate-400 font-bold text-[10px] uppercase">Modalidad</label>
                          <input
                            type="text"
                            placeholder="En Mesa, Para Llevar"
                            value={formData.variant_options}
                            onChange={(e) => setFormData({ ...formData, variant_options: e.target.value })}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-slate-400 font-bold text-[10px]">Cupos Hoy</label>
                            <input
                              type="number"
                              value={formData.stock_quota}
                              onChange={(e) => setFormData({ ...formData, stock_quota: parseInt(e.target.value) || 10 })}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 font-bold text-[10px]">Válido Hasta</label>
                            <input
                              type="text"
                              placeholder="Ej: 21:00"
                              value={formData.spec_1}
                              onChange={(e) => setFormData({ ...formData, spec_1: e.target.value })}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {formData.category_archetype === 'HIGH_TICKET' && (
                      <div className="grid grid-cols-2 gap-2 p-3 bg-[#020508] border border-slate-850 rounded-xl">
                        <div>
                          <label className="text-slate-400 font-bold text-[10px]">Garantía</label>
                          <input
                            type="text"
                            placeholder="1 año"
                            value={formData.spec_1}
                            onChange={(e) => setFormData({ ...formData, spec_1: e.target.value })}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold text-[10px]">Modelo / Voltaje</label>
                          <input
                            type="text"
                            placeholder="110V"
                            value={formData.spec_2}
                            onChange={(e) => setFormData({ ...formData, spec_2: e.target.value })}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Opciones adicionales */}
                    <div className="space-y-2 pt-2 border-t border-slate-900">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.is_clearance}
                          onChange={(e) => setFormData({ ...formData, is_clearance: e.target.checked })}
                          className="w-4 h-4 rounded text-emerald-500 cursor-pointer"
                        />
                        <Flame size={13} className="text-amber-400" />
                        <span>Destacar en sección "Remates y Liquidaciones"</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.is_sponsored}
                          onChange={(e) => setFormData({ ...formData, is_sponsored: e.target.checked })}
                          className="w-4 h-4 rounded text-emerald-500 cursor-pointer"
                        />
                        <Sparkles size={13} className="text-emerald-400" />
                        <span>Impulso Aura Ads (Prioridad en búsquedas)</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || uploadingImage}
                      className="cursor-pointer w-full bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 rounded-xl font-bold text-xs transition mt-2 disabled:opacity-50"
                    >
                      {loading ? 'Publicando...' : uploadingImage ? 'Subiendo foto...' : 'Publicar Producto'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: HABLADOR FÍSICO QR */}
        {activeTab === 'qr' && (
          <div className="space-y-4">
            <header>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Hablador QR para Vitrina
              </h2>
              <p className="text-xs text-slate-400">
                Imprime este código y colócalo en tu mostrador o puerta.
              </p>
            </header>

            <div className="max-w-xs mx-auto bg-[#030910] p-6 rounded-2xl border border-slate-900 text-center space-y-4">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                AURA • Vitrina Local
              </div>

              <div className="p-3 bg-white rounded-xl inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(storeUrl)}`}
                  alt={`QR de ${store?.name}`}
                  className="w-40 h-40 mx-auto"
                />
              </div>

              <div className="space-y-0.5">
                <strong className="block text-white font-bold text-sm">{store?.name}</strong>
                <span className="text-[11px] text-slate-400 font-mono truncate block">{storeUrl}</span>
              </div>

              <button
                onClick={() => window.print()}
                className="cursor-pointer w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 border border-slate-800"
              >
                <Printer size={14} />
                <span>Imprimir Cartel</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL 1: VERIFICACIÓN */}
        {showVerifyModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-[#030910] max-w-sm w-full rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-white">Verificar Tienda</h3>
                  <p className="text-xs text-slate-400">Activa tu vitrina en el buscador de Cumaná.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleRequestVerification} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">Foto de Fachada (URL) *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://ejemplo.com/mifachada.jpg"
                    value={verifyForm.storefront_photo_url}
                    onChange={(e) => setVerifyForm({ ...verifyForm, storefront_photo_url: e.target.value })}
                    className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">RIF o Cédula *</label>
                  <input
                    type="text"
                    required
                    placeholder="J-40123456-7"
                    value={verifyForm.rif_or_id_number}
                    onChange={(e) => setVerifyForm({ ...verifyForm, rif_or_id_number: e.target.value })}
                    className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">Instagram Comercial (@) *</label>
                  <input
                    type="text"
                    required
                    placeholder="@mitiendacumana"
                    value={verifyForm.instagram_handle}
                    onChange={(e) => setVerifyForm({ ...verifyForm, instagram_handle: e.target.value })}
                    className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="cursor-pointer w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl text-xs transition mt-2"
                >
                  {verifyLoading ? "Enviando..." : "Enviar Verificación"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: PIN DE MOSTRADOR */}
        {showPinModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-[#030910] max-w-xs w-full rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-white">PIN de Mostrador</h3>
                  <p className="text-xs text-slate-400">Para tus empleados en caja.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUpdateCashierPin} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold text-[10px] uppercase">Nuevo PIN (4 a 6 dígitos)</label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    placeholder="1234"
                    value={cashierPin}
                    onChange={(e) => setCashierPin(e.target.value)}
                    className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl font-mono text-center text-lg text-white outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Acceso en: <span className="font-mono text-slate-400">/mostrador/{storeId}</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={pinLoading}
                  className="cursor-pointer w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 rounded-xl text-xs transition"
                >
                  {pinLoading ? "Guardando..." : "Guardar PIN"}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}