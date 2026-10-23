'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Reservation, Store, CategoryArchetype } from '@/types';
import { getArchetypeConfig, refundFeeToWallet, logLostDemand } from '@/lib/monetization';
import { AURA_OFFICIAL_CATEGORIES } from '@/lib/categories';
import { useGameSound } from '@/hooks/useGameSound';
import {
  Package, Plus, Trash2, Loader2,
  CheckCircle2, AlertCircle, LogOut,
  Clock, Check, X, QrCode, Printer,
  Flame, ArrowRight, TrendingUp, Users, Smartphone,
  ShieldCheck, Zap, Crown, Award, Layers, Sparkles, Lock, ArrowUpRight,
  Upload, Image as ImageIcon, Camera, Compass, Radio, Megaphone,
  Edit, Ticket
} from 'lucide-react';
import Link from 'next/link';
import MegaphoneMerchantWidget from '@/components/merchant/MegaphoneMerchantWidget';

export default function OwnerDashboard() {
  const router = useRouter();
  const { playAlertChime, playUnlockSuccess, playTap } = useGameSound();

  const [storeId, setStoreId] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [activeTab, setActiveTab] = useState<'reservations' | 'history' | 'inventory' | 'qr' | 'megaphone'>('reservations');
  const [loading, setLoading] = useState(true);
  const [openMegaphoneCount, setOpenMegaphoneCount] = useState(0);

  // Inventario
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingStoreProductId, setEditingStoreProductId] = useState<string | null>(null);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'active' | 'paused'>('all');

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
    subcategory: string;
    category_archetype: CategoryArchetype;
    price: string;
    regular_price: string;
    sale_price: string;
    stock: number;
    variant_label: string;
    variant_options: string;
    spec_1_label: string;
    spec_1_val: string;
    spec_2_label: string;
    spec_2_val: string;
    auto_confirm_stock: boolean;
    stock_quota: number;
    stock_status: 'available' | 'last_units' | 'sold_out';
    is_clearance: boolean;
    is_sponsored: boolean;
    is_active: boolean;
    // Distinción de Canales: Radar, Relámpago y Manadas
    has_discount: boolean;
    is_wholesale: boolean;
    wholesale_min_units: number;
    wholesale_price: string;
  }>({
    product_id: '',
    name: '',
    description: '',
    brand: '',
    imageUrl: '',
    category: 'Moda',
    subcategory: 'Calzado',
    category_archetype: 'RETAIL_STANDARD',
    price: '',
    regular_price: '',
    sale_price: '',
    stock: 10,
    variant_label: '',
    variant_options: '',
    spec_1_label: 'Conectividad / Material',
    spec_1_val: '',
    spec_2_label: 'Garantía / Modelo',
    spec_2_val: '',
    auto_confirm_stock: false,
    stock_quota: 10,
    stock_status: 'available',
    is_clearance: false,
    is_sponsored: false,
    is_active: true,
    has_discount: false,
    is_wholesale: false,
    wholesale_min_units: 6,
    wholesale_price: ''
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
      let data: any[] | null = null;
      let error: any = null;

      // Intentar traer con relación de productos para obtener nombre y foto del producto
      const resWithProducts = await supabase
        .from('reservations')
        .select('*, products(name, imageUrl, archetype)')
        .eq('store_id', sId)
        .order('created_at', { ascending: false });

      if (!resWithProducts.error && resWithProducts.data) {
        data = resWithProducts.data;
      } else {
        const fallback = await supabase
          .from('reservations')
          .select('*')
          .eq('store_id', sId)
          .order('created_at', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error('Error cargando reservas en dashboard:', error);
        return;
      }

      if (data) {
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
            product_image: r.products?.imageUrl || r.product_image || r.image_url,
            selected_size: r.selected_size || 'Única',
            category_archetype: r.products?.archetype || r.category_archetype || 'RETAIL_STANDARD',
            price_usd: priceUsd,
            total_price: priceUsd,
            unlock_fee_usd: Number(r.unlock_fee_usd || 0),
            store_pay_balance_usd: Number(r.store_pay_balance_usd ?? priceUsd),
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
    } catch (err) {
      console.error('Excepción en fetchReservations:', err);
    }
  }, [store?.name]);

  const checkUser = useCallback(async () => {
    let user: any = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user;
      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user;
      }
    } catch (err) {
      console.error('Error obteniendo sesión en dashboard:', err);
    }

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

  // Suscripción en tiempo real y sondeo de reservas para el dueño
  useEffect(() => {
    if (!storeId) return;

    // A. Suscripción en tiempo real con Postgres Changes
    const channel = supabase
      .channel(`dashboard_reservations_${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations', filter: `store_id=eq.${storeId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            playAlertChime();
          }
          fetchReservations(storeId);
        }
      )
      .subscribe();

    // B. Sondeo de respaldo cada 3 segundos
    const pollInterval = setInterval(() => {
      fetchReservations(storeId);
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [storeId, fetchReservations]);

  // Solicitudes abiertas del Megáfono en tiempo real
  useEffect(() => {
    const fetchMegaphoneCount = async () => {
      try {
        const { count } = await supabase
          .from('megaphone_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'OPEN');
        setOpenMegaphoneCount(count || 0);
      } catch {}
    };

    fetchMegaphoneCount();

    const channel = supabase
      .channel('dashboard_megaphone_count_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'megaphone_requests' },
        () => {
          fetchMegaphoneCount();
        }
      )
      .subscribe();

    const interval = setInterval(fetchMegaphoneCount, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

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
      await supabase
        .from('reservations')
        .update({ status: newStatus })
        .eq('id', reservation.id);

      if (newStatus === 'ultimo_par' || newStatus === 'cancelled') {
        if (newStatus === 'cancelled') {
          await logLostDemand({
            storeId: reservation.store_id,
            productId: reservation.product_id,
            productName: reservation.product_name,
            selectedVariant: reservation.selected_size,
            customerPhone: reservation.customer_phone,
            reason: 'OUT_OF_STOCK'
          });
        }

        // Apagar el producto en Radar (si es último par lo tomó este cliente; si es rojo está agotado)
        if (reservation.store_id && reservation.product_id) {
          await supabase
            .from('store_products')
            .update({ is_active: false, stock: 0 })
            .eq('store_id', reservation.store_id)
            .eq('product_id', reservation.product_id);
        }

        if (reservation.product_id) {
          await supabase
            .from('store_products')
            .update({ is_active: false, stock: 0 })
            .eq('id', reservation.product_id);

          await supabase
            .from('store_products')
            .update({ is_active: false, stock: 0 })
            .eq('product_id', reservation.product_id);
        }
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

    if (!target) {
      try {
        // 1. Buscar en reservations por PIN y storeId
        let query = supabase.from('reservations').select('*').eq('pin_code', cleanPin);
        if (storeId) {
          query = query.eq('store_id', storeId);
        }
        let { data: dbMatch } = await query.order('created_at', { ascending: false }).maybeSingle();

        // 2. Si no encontró restringiendo a storeId, buscar por PIN en toda la tabla reservations
        if (!dbMatch) {
          const { data: globalMatch } = await supabase
            .from('reservations')
            .select('*')
            .eq('pin_code', cleanPin)
            .order('created_at', { ascending: false })
            .maybeSingle();
          if (globalMatch) dbMatch = globalMatch;
        }

        if (dbMatch) {
          target = {
            id: dbMatch.id,
            pin: dbMatch.pin_code,
            pin_code: dbMatch.pin_code,
            customer_name: dbMatch.customer_name || 'Comprador Radar',
            customer_phone: dbMatch.customer_phone || '',
            product_name: dbMatch.product_name || 'Producto en Tienda',
            product_image: dbMatch.image_url || null,
            store_name: store?.name || 'Mi Tienda',
            price_usd: Number(dbMatch.total_price || dbMatch.price_usd || 0),
            price_ves: Number((dbMatch.total_price || dbMatch.price_usd || 0) * (dbMatch.bcv_rate || tasaUsed || 55)),
            tasa: Number(dbMatch.bcv_rate || tasaUsed || 55),
            status: dbMatch.status,
            store_id: dbMatch.store_id,
            product_id: dbMatch.product_id,
            created_at: dbMatch.created_at,
            expires_at: dbMatch.expires_at,
          };
        }
      } catch (e) {
        console.warn('Error buscando PIN en Supabase:', e);
      }
    }

    // 3. Fallback adicional con cotizaciones de Megáfono (en caso de que la reserva se haya generado antes)
    if (!target && storeId) {
      try {
        const { data: quoteMatch } = await supabase
          .from('megaphone_quotes')
          .select('*, megaphone_requests(query_text)')
          .eq('store_id', storeId)
          .eq('status', 'ACCEPTED_BY_BUYER')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (quoteMatch) {
          const qText = (quoteMatch as any).megaphone_requests?.query_text || 'Artículo Consultado (Megáfono)';
          target = {
            id: quoteMatch.id,
            pin: cleanPin,
            pin_code: cleanPin,
            customer_name: 'Comprador Radar (Megáfono)',
            customer_phone: '04120000000',
            product_name: qText,
            product_image: quoteMatch.photo_url || null,
            store_name: store?.name || 'Mi Tienda',
            price_usd: Number(quoteMatch.price_usd || 0),
            price_ves: Number((quoteMatch.price_usd || 0) * (tasaUsed || 55)),
            tasa: tasaUsed || 55,
            status: 'confirmed',
            store_id: storeId,
            product_id: quoteMatch.auto_seeded_product_id,
            created_at: quoteMatch.created_at,
            expires_at: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
          };
        }
      } catch (qErr) {
        console.warn('Error en fallback de megaphone_quotes:', qErr);
      }
    }

    if (target) {
      try {
        const isValidUUID = Boolean(target.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target.id));
        const targetPin = target.pin || target.pin_code || cleanPin;

        let errorResult: any = null;
        if (isValidUUID) {
          const { error } = await supabase
            .from('reservations')
            .update({ status: 'completed' })
            .eq('id', target.id);
          if (error) errorResult = error;
        }

        if (targetPin) {
          const { error } = await supabase
            .from('reservations')
            .update({ status: 'completed' })
            .eq('pin_code', targetPin);
          if (error && !errorResult) errorResult = error;
        }

        // También marcar cualquier cotización de Megáfono aceptada como completada
        if (storeId) {
          try {
            await supabase
              .from('megaphone_quotes')
              .update({ status: 'COMPLETED' })
              .eq('store_id', storeId)
              .eq('status', 'ACCEPTED_BY_BUYER');
          } catch {
            await supabase
              .from('megaphone_quotes')
              .update({ status: 'REJECTED' })
              .eq('store_id', storeId)
              .eq('status', 'ACCEPTED_BY_BUYER');
          }
        }

        // Disparar evento para clientes en la misma máquina o ventana
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('aura_ticket_completed', {
            detail: { reservation: { ...target, status: 'completed' } }
          }));
        }

        setPinSuccessMessage(`✓ Venta cobrada y entregada: PIN #${cleanPin} (${target.customer_name}).`);
        setPinInput('');
        if (storeId) fetchReservations(storeId);
      } catch (err: any) {
        console.error('Error al validar PIN:', err);
        alert('Error inesperado: ' + err.message);
      }
    } else {
      alert('PIN no encontrado o ya expirado. Verifica los 4 dígitos.');
    }
  };

  // Cobro directo en caja de una reserva confirmada
  const handleCompleteReservation = async (reservation: Reservation) => {
    try {
      const isValidUUID = Boolean(reservation.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reservation.id));
      const targetPin = reservation.pin || reservation.pin_code;

      let errorResult: any = null;
      if (isValidUUID) {
        const { error } = await supabase
          .from('reservations')
          .update({ status: 'completed' })
          .eq('id', reservation.id);
        if (error) errorResult = error;
      }

      if (targetPin) {
        const { error } = await supabase
          .from('reservations')
          .update({ status: 'completed' })
          .eq('pin_code', targetPin);
        if (error && !errorResult) errorResult = error;
      }

      if (errorResult) {
        console.error('Error al completar reserva:', errorResult);
        alert('Error al actualizar reserva: ' + errorResult.message);
        return;
      }

      setPinSuccessMessage(`Venta cobrada y entregada: PIN #${reservation.pin} (${reservation.customer_name}).`);
      if (storeId) fetchReservations(storeId);
    } catch (err: any) {
      console.error('Error completando reserva:', err);
      alert('Error inesperado: ' + err.message);
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

    if (file.size > 8 * 1024 * 1024) {
      alert('La imagen no debe superar los 8MB.');
      return;
    }

    // Vista previa inmediata para el usuario
    const localPreviewUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, imageUrl: localPreviewUrl }));

    setUploadingImage(true);
    try {
      // Refrescar sesión para asegurar token activo
      await supabase.auth.getSession();

      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanFileName = `${storeId || 'tienda'}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(cleanFileName, file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error al subir imagen a Storage:', error);
        alert(`No se pudo subir la foto a la nube (${error.message || 'Error de políticas'}). Puedes pegar el enlace directo de la imagen o ejecutar el script SQL de permisos en Supabase.`);
        return;
      }

      const { data: publicData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      if (publicData?.publicUrl) {
        setFormData(prev => ({ ...prev, imageUrl: publicData.publicUrl }));
      }
    } catch (err: any) {
      alert('Error al procesar la imagen: ' + (err.message || 'Error desconocido'));
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
      if (formData.variant_options.trim()) {
        const label = formData.variant_label.trim() || 'Opción / Modelo';
        const parsedOpts = formData.variant_options.split(',').map(s => s.trim()).filter(Boolean);
        if (parsedOpts.length > 0) {
          variantsPayload.push({ label, options: parsedOpts });
        }
      } else if (formData.category_archetype === 'GASTRO_FLASH') {
        variantsPayload = [{ label: 'Modalidad', options: ['En Mesa', 'Para Llevar'] }];
      } else if (formData.category_archetype === 'VEHICLES_CLASSIFIED') {
        variantsPayload = [{ label: 'Transmisión', options: ['Automática', 'Sincrónica'] }];
      }

      const specsPayload: Record<string, any> = {};
      if (formData.spec_1_val.trim()) {
        const key = formData.spec_1_label.trim() || 'especificacion_1';
        specsPayload[key] = formData.spec_1_val.trim();
      }
      if (formData.spec_2_val.trim()) {
        const key = formData.spec_2_label.trim() || 'especificacion_2';
        specsPayload[key] = formData.spec_2_val.trim();
      }

      const priceNum = parseFloat(formData.price);
      const regularPriceNum = formData.regular_price ? parseFloat(formData.regular_price) : priceNum;
      const salePriceNum = formData.sale_price ? parseFloat(formData.sale_price) : null;
      
      const hasDiscount = Boolean(formData.has_discount && salePriceNum && salePriceNum < regularPriceNum);
      const finalAuraPrice = hasDiscount && salePriceNum ? salePriceNum : priceNum;

      const rawFee = finalAuraPrice * 0.10;
      const unlockFeeCalculated = formData.is_clearance 
        ? Math.min(rawFee, archetypeConfig.maxUnlockFeeCap) 
        : 0;

      const discountPercent = (hasDiscount && regularPriceNum > finalAuraPrice)
        ? Math.round(((regularPriceNum - finalAuraPrice) / regularPriceNum) * 100)
        : formData.is_clearance ? 25 : 0;

      const isWholesale = Boolean(formData.is_wholesale);
      const wholesaleMinUnits = isWholesale ? (Number(formData.wholesale_min_units) || 6) : 1;
      const wholesalePriceNum = isWholesale && formData.wholesale_price ? parseFloat(formData.wholesale_price) : null;

      // Respaldo estructural en specs para soporte retrocompatible
      specsPayload.is_wholesale = isWholesale;
      specsPayload.wholesale_min_units = wholesaleMinUnits;
      if (wholesalePriceNum) specsPayload.wholesale_price_usd = wholesalePriceNum;
      specsPayload.has_discount = hasDiscount;

      const finalStock = Number(formData.stock) > 0 
        ? Number(formData.stock) 
        : (formData.stock_status === 'available' ? 10 : formData.stock_status === 'last_units' ? 2 : 0);

      if (editingStoreProductId) {
        // MODO EDICIÓN GARANTIZADO: Actualizar producto base en products sin duplicar en store_products
        let targetProdId = currentProductId;
        if (!targetProdId) {
          const { data: spItem } = await supabase
            .from('store_products')
            .select('product_id')
            .eq('id', editingStoreProductId)
            .maybeSingle();
          targetProdId = spItem?.product_id;
        }

        if (targetProdId) {
          const { error: pUpdateErr } = await supabase
            .from('products')
            .update({
              name: formData.name,
              description: formData.description.trim() || null,
              brand: formData.brand.trim() || null,
              imageUrl: formData.imageUrl.trim() || null,
              category: formData.category,
              subcategory: formData.subcategory?.trim() || null,
              archetype: formData.category_archetype,
              variants: variantsPayload,
              specs: specsPayload,
              regular_price_usd: regularPriceNum,
              aura_price_usd: finalAuraPrice,
              unlock_fee_usd: unlockFeeCalculated,
              auto_confirm_stock: formData.auto_confirm_stock,
              is_sponsored: formData.is_sponsored,
              price: regularPriceNum || finalAuraPrice,
            })
            .eq('id', targetProdId);
          if (pUpdateErr) throw pUpdateErr;
        }

        // Actualizar registro existente en store_products
        const { error: spUpdateErr } = await supabase
          .from('store_products')
          .update({
            price: finalAuraPrice,
            stock: finalStock,
            discount_percent: discountPercent,
            is_active: formData.is_active,
            metadata: {
              is_wholesale: isWholesale,
              wholesale_min_units: wholesaleMinUnits,
              wholesale_price_usd: wholesalePriceNum,
              has_discount: hasDiscount,
            }
          })
          .eq('id', editingStoreProductId);
        if (spUpdateErr) throw spUpdateErr;

        alert('✓ Producto actualizado exitosamente.');
      } else {
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
              subcategory: formData.subcategory?.trim() || null,
              archetype: formData.category_archetype,
              variants: variantsPayload,
              specs: specsPayload,
              regular_price_usd: regularPriceNum,
              aura_price_usd: finalAuraPrice,
              unlock_fee_usd: unlockFeeCalculated,
              auto_confirm_stock: formData.auto_confirm_stock,
              is_sponsored: formData.is_sponsored,
              published_at: new Date().toISOString(),
              price: regularPriceNum || finalAuraPrice,
            }])
            .select()
            .single();
          if (pError) throw pError;
          currentProductId = newP.id;
        }

        const { error: spError } = await supabase
          .from('store_products')
          .insert([{
            store_id: storeId,
            product_id: currentProductId,
            price: finalAuraPrice,
            stock: finalStock,
            discount_percent: discountPercent,
            is_active: formData.is_active,
            metadata: {
              is_wholesale: isWholesale,
              wholesale_min_units: wholesaleMinUnits,
              wholesale_price_usd: wholesalePriceNum,
              has_discount: hasDiscount,
            }
          }]);

        if (spError) throw spError;

        alert(`✓ Producto publicado exitosamente en ${hasDiscount ? 'Ofertas Relámpago' : 'Radar'}${isWholesale ? ' y Manadas' : ''}.`);
      }

      setIsAdding(false);
      setEditingStoreProductId(null);
      setFormData({
        product_id: '',
        name: '',
        description: '',
        brand: '',
        imageUrl: '',
        category: 'Moda',
        subcategory: 'Calzado',
        category_archetype: 'RETAIL_STANDARD',
        price: '',
        regular_price: '',
        sale_price: '',
        stock: 10,
        variant_label: '',
        variant_options: '',
        spec_1_label: 'Conectividad / Material',
        spec_1_val: '',
        spec_2_label: 'Garantía / Modelo',
        spec_2_val: '',
        auto_confirm_stock: false,
        stock_quota: 10,
        stock_status: 'available',
        is_clearance: false,
        is_sponsored: false,
        is_active: true,
        has_discount: false,
        is_wholesale: false,
        wholesale_min_units: 6,
        wholesale_price: ''
      });
      fetchInventory(storeId);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (item: any) => {
    const p = item.products || {};
    setEditingStoreProductId(item.id);
    setSearchTerm(p.name || '');

    let variantLabel = '';
    let variantOpts = '';
    if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
      variantLabel = p.variants[0].label || '';
      variantOpts = Array.isArray(p.variants[0].options) ? p.variants[0].options.join(', ') : '';
    }

    let spec1Val = '';
    let spec2Val = '';
    if (p.specs && typeof p.specs === 'object') {
      const keys = Object.keys(p.specs).filter(k => !k.startsWith('is_') && !k.startsWith('has_') && !k.includes('wholesale'));
      if (keys[0]) spec1Val = p.specs[keys[0]] || '';
      if (keys[1]) spec2Val = p.specs[keys[1]] || '';
    }

    const regPrice = p.regular_price_usd || item.price || 0;
    const auraPrice = p.aura_price_usd || item.price || 0;
    const hasDiscount = Boolean(item.has_discount || item.discount_percent > 0 || item.metadata?.has_discount || p.has_discount);
    const isWholesale = Boolean(item.is_wholesale || item.metadata?.is_wholesale || p.is_wholesale || p.specs?.is_wholesale);
    const wholesaleMin = item.wholesale_min_units || item.metadata?.wholesale_min_units || p.specs?.wholesale_min_units || 6;
    const wholesalePrice = item.metadata?.wholesale_price_usd || p.specs?.wholesale_price_usd || '';

    setFormData({
      product_id: p.id || item.product_id,
      name: p.name || '',
      description: p.description || '',
      brand: p.brand || '',
      imageUrl: p.imageUrl || p.image_url || '',
      category: p.category || 'Moda',
      subcategory: p.subcategory || '',
      category_archetype: p.archetype || p.category_archetype || 'RETAIL_STANDARD',
      price: String(regPrice || auraPrice || ''),
      regular_price: String(regPrice || ''),
      sale_price: hasDiscount ? String(auraPrice || '') : '',
      stock: item.stock ?? 10,
      variant_label: variantLabel,
      variant_options: variantOpts,
      spec_1_label: 'Conectividad / Material',
      spec_1_val: spec1Val,
      spec_2_label: 'Garantía / Modelo',
      spec_2_val: spec2Val,
      auto_confirm_stock: Boolean(p.auto_confirm_stock),
      stock_quota: item.stock ?? 10,
      stock_status: item.stock > 2 ? 'available' : item.stock > 0 ? 'last_units' : 'sold_out',
      is_clearance: Boolean(p.is_clearance),
      is_sponsored: Boolean(p.is_sponsored),
      is_active: Boolean(item.is_active),
      has_discount: hasDiscount,
      is_wholesale: isWholesale,
      wholesale_min_units: wholesaleMin,
      wholesale_price: String(wholesalePrice || ''),
    });

    setIsAdding(true);
  };

  const handleToggleActive = async (storeProductId: string, currentActive: boolean) => {
    try {
      const nextActive = !currentActive;
      setProducts(prev => prev.map(p => p.id === storeProductId ? { ...p, is_active: nextActive } : p));
      
      const { error } = await supabase
        .from('store_products')
        .update({ is_active: nextActive })
        .eq('id', storeProductId);

      if (error) {
        console.error('Error actualizando estado de producto:', error);
        if (storeId) fetchInventory(storeId);
      }
    } catch (err) {
      console.error('Error al pausar/activar producto:', err);
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
          <Link
            href="/"
            className="flex items-center gap-3 min-w-0 group cursor-pointer"
            title="Volver a Portada Aura (Modo Cliente)"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center font-black text-base text-black shrink-0 group-hover:shadow-[0_0_12px_rgba(0,255,178,0.4)] group-hover:scale-105 transition-all">
              A
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-white text-sm tracking-tight truncate max-w-[130px] group-hover:text-[#00ffb2] transition-colors">
                {store?.name || 'Mi Comercio'}
              </h2>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                Plan {planName}
              </span>
            </div>
          </Link>

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
            onClick={() => setActiveTab('history')}
            className={`cursor-pointer flex items-center gap-2.5 w-full p-2.5 rounded-xl font-bold text-xs transition ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white border border-slate-800'
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <CheckCircle2 size={16} className={activeTab === 'history' ? 'text-emerald-400' : ''} />
            <span className="whitespace-nowrap">Historial de Ventas</span>
            {completedReservations.length > 0 && (
              <span className="ml-auto bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                {completedReservations.length}
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

          <button
            onClick={() => setActiveTab('megaphone')}
            className={`cursor-pointer flex items-center gap-2.5 w-full p-2.5 rounded-xl font-bold text-xs transition ${
              activeTab === 'megaphone'
                ? 'bg-slate-900 text-white border border-slate-800'
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <Megaphone size={16} className={activeTab === 'megaphone' ? 'text-emerald-400' : 'text-[#00ffb2]'} />
            <span className="whitespace-nowrap">El Megáfono</span>
            {openMegaphoneCount > 0 && (
              <span className="ml-auto bg-emerald-500/20 text-[#00ffb2] px-1.5 py-0.5 rounded text-[10px] font-bold">
                {openMegaphoneCount}
              </span>
            )}
          </button>

          <Link
            href="/"
            className="cursor-pointer flex items-center gap-2.5 w-full p-2.5 rounded-xl font-bold text-xs text-slate-400 hover:bg-slate-900/50 hover:text-[#00ffb2] transition"
            title="Volver a Portada Aura (Modo Cliente)"
          >
            <Compass size={16} className="text-emerald-400" />
            <span className="whitespace-nowrap">Ir a Portada</span>
          </Link>

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
            {/* BOTÓN RETORNO A PORTADA (MODO CLIENTE) */}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-black bg-emerald-950/40 hover:bg-[#00ffb2] border border-emerald-800/50 px-3 py-2 rounded-xl transition-all shadow-[0_0_12px_rgba(0,255,178,0.12)] group cursor-pointer"
              title="Volver a la Portada de Aura (Modo Cliente)"
            >
              <Compass size={14} className="text-emerald-400 group-hover:text-black transition-colors" />
              <span>Ir a Portada</span>
            </Link>

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
            
            {/* LISTA DE RESERVAS */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 font-bold bg-[#030910] p-3 rounded-2xl border border-slate-900">
                <span className="text-white text-sm font-black">Pedidos por Entregar ({pendingReservations.length})</span>
                
                <form onSubmit={handleValidatePin} className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="PIN #0000"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="px-3 py-1.5 bg-[#020508] text-white rounded-xl font-mono text-center w-28 text-xs border border-slate-800 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition"
                  >
                    <CheckCircle2 size={13} />
                    <span>Validar</span>
                  </button>
                </form>
              </div>

              {pinSuccessMessage && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} /> <span>{pinSuccessMessage}</span>
                  </div>
                  <button onClick={() => setPinSuccessMessage(null)} className="text-emerald-400 hover:text-white cursor-pointer p-0.5">
                    <X size={14} />
                  </button>
                </div>
              )}

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

                        {/* ACCIONES DE ESTADO: SI YA ESTÁ CONFIRMADA O ES PAGO MÓVIL, MOSTRAR BOTÓN DE COBRAR/ENTREGAR */}
                        {res.status === 'confirmed' || res.status === 'confirmada' || res.status === 'ultimo_par' || hasPagoMovil ? (
                          <div className="pt-2 border-t border-slate-900 space-y-2">
                            <div className="p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                              <span className="text-emerald-300 font-bold flex items-center gap-1.5 text-[11px]">
                                <Check size={14} className="text-[#00ffb2]" />
                                {hasPagoMovil ? 'Apartado en Depósito (Pago Móvil)' : 'Stock Confirmado en Mostrador'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">PIN #{res.pin}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCompleteReservation(res)}
                              className="w-full cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
                            >
                              <CheckCircle2 size={15} />
                              <span>Validar y Entregar (PIN #{res.pin})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAttendedNoSale(res)}
                              className="w-full text-slate-400 hover:text-white bg-[#020508] hover:bg-slate-900 border border-slate-850 rounded-xl py-1.5 text-[11px] font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <ShieldCheck size={12} className="text-emerald-400" />
                              <span>Cliente no concretó</span>
                            </button>
                          </div>
                        ) : (
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
                              <span>Cliente no concretó</span>
                            </button>
                          </div>
                        )}
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

        {/* PESTAÑA: HISTORIAL DE VENTAS Y CANJES */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-400" />
                  Historial de Ventas y Canjes ({completedReservations.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Registro de productos retirados y cobrados en tu tienda a través de Aura.
                </p>
              </div>

              <div className="bg-[#030910] border border-slate-900 px-4 py-2 rounded-xl text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Recaudado</span>
                <span className="text-lg font-black text-[#00ffb2]">${totalSalesUSD.toFixed(2)} USD</span>
              </div>
            </header>

            {completedReservations.length === 0 ? (
              <div className="bg-[#030910] p-12 rounded-3xl border border-slate-900 text-center space-y-3">
                <CheckCircle2 size={40} className="text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">Sin ventas completadas todavía</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Cuando un cliente acuda a tu local y valides su PIN de 4 dígitos en caja o escanees su QR, la venta quedará registrada aquí permanentemente.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedReservations.map((res) => {
                  const dateStr = res.confirmed_at || res.created_at;
                  const formattedDate = dateStr
                    ? new Date(dateStr).toLocaleDateString('es-VE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Reciente';

                  return (
                    <div
                      key={res.id}
                      className="bg-[#030910] border border-slate-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-800 transition shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-emerald-400 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                            PIN #{res.pin || res.pin_code || 'TICKET'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">{formattedDate}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-900/40">
                            ✓ Entregado en Tienda
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-white">{res.product_name}</h4>
                        <p className="text-xs text-slate-300">
                          Cliente: <strong>{res.customer_name}</strong> • Tel: {res.customer_phone}
                        </p>
                        {res.selected_size && (
                          <p className="text-[11px] text-slate-400">
                            Variante / Talla: <span className="text-white font-medium">{res.selected_size}</span>
                          </p>
                        )}
                      </div>

                      <div className="sm:text-right shrink-0 bg-slate-950/80 p-3 rounded-xl border border-slate-850">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Cobrado en caja</span>
                        <span className="text-lg font-black text-white">
                          ${(res.store_pay_balance_usd ?? res.price_usd).toFixed(2)} USD
                        </span>
                        {res.price_ves && (
                          <span className="block text-[11px] text-emerald-400 font-mono">
                            Bs. {res.price_ves}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                  onClick={() => {
                    setEditingStoreProductId(null);
                    setIsAdding(true);
                  }}
                  className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <Plus size={15} />
                  <span>Añadir Producto</span>
                </button>
              </div>
            </header>

            {/* Filtros de Inventario (Visibles vs Pausados) */}
            {products.length > 0 && (
              <div className="flex items-center gap-1.5 p-1 bg-[#030910] rounded-xl border border-slate-900 w-fit">
                <button
                  type="button"
                  onClick={() => setInventoryFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    inventoryFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryFilter('active')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    inventoryFilter === 'active'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Visibles ({products.filter((p) => p.is_active).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryFilter('paused')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    inventoryFilter === 'paused'
                      ? 'bg-slate-800 text-amber-300 border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Pausados ({products.filter((p) => !p.is_active).length})</span>
                </button>
              </div>
            )}

            {products.length === 0 ? (
              <div className="bg-[#030910] border border-slate-900 rounded-2xl p-10 text-center max-w-md mx-auto space-y-3">
                <Package size={32} className="text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">Tu vitrina no tiene productos</h3>
                <p className="text-xs text-slate-400">
                  Agrega tus artículos estrella para que los compradores puedan reservarlos.
                </p>
                <button
                  onClick={() => {
                    setEditingStoreProductId(null);
                    setIsAdding(true);
                  }}
                  className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition"
                >
                  <Plus size={14} />
                  <span>Publicar Mi Primer Producto</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {products
                  .filter((p) => {
                    if (inventoryFilter === 'active') return p.is_active;
                    if (inventoryFilter === 'paused') return !p.is_active;
                    return true;
                  })
                  .map((item) => {
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

                        <div className="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                              {archetype.name.split(',')[0]}
                            </span>
                            {/* Badges de Canal */}
                            {item.has_discount || item.discount_percent > 0 ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <Zap size={10} /> Relámpago (-{item.discount_percent}%)
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-[#00ffb2] border border-emerald-500/30 flex items-center gap-1">
                                <span>🧭 Radar</span>
                              </span>
                            )}
                            {(item.is_wholesale || item.products?.is_wholesale || item.products?.specs?.is_wholesale) && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <Users size={10} /> Manadas (Min {item.wholesale_min_units || item.products?.wholesale_min_units || item.products?.specs?.wholesale_min_units || 6} uds)
                              </span>
                            )}
                          </div>
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

                      <div className="pt-2.5 border-t border-slate-900 flex items-center justify-between gap-2 text-xs flex-wrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditProduct(item)}
                            className="cursor-pointer px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold flex items-center gap-1 transition"
                            title="Editar detalles de este producto"
                          >
                            <Edit size={12} className="text-emerald-400" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(item.id, item.is_active)}
                            className={`cursor-pointer px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition text-[11px] ${
                              item.is_active
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 hover:bg-rose-950/40 hover:text-rose-400'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-emerald-950/60 hover:text-emerald-300'
                            }`}
                            title={item.is_active ? 'Click para pausar' : 'Click para activar en vitrina'}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                            <span>{item.is_active ? 'Visible' : 'Pausado (Activar)'}</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteProduct(item.id)}
                          className="cursor-pointer text-slate-500 hover:text-rose-400 font-bold flex items-center gap-1 transition text-[11px] ml-auto"
                          title="Eliminar de la vitrina"
                        >
                          <Trash2 size={12} />
                          <span>Quitar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODAL MULTI-RUBRO DE AÑADIR / EDITAR PRODUCTO */}
            {isAdding && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
                <div className="bg-[#030910] w-full max-w-lg rounded-3xl overflow-hidden border border-slate-800 shadow-2xl my-4 text-white">
                  <div className="p-4 sm:p-5 border-b border-slate-900 flex justify-between items-center">
                    <h3 className="font-bold text-sm text-white">
                      {editingStoreProductId ? 'Editar Producto en Vitrina' : 'Publicar Producto en Vitrina'}
                    </h3>
                    <button
                      onClick={() => {
                        setIsAdding(false);
                        setEditingStoreProductId(null);
                        setSearchTerm('');
                      }}
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

                    {/* Categoría Oficial y Subcategoría */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Categoría Principal</label>
                        <select
                          value={formData.category}
                          onChange={(e) => {
                            const selectedName = e.target.value;
                            const catDef = AURA_OFFICIAL_CATEGORIES.find(c => c.name.toLowerCase() === selectedName.toLowerCase()) || AURA_OFFICIAL_CATEGORIES[0];
                            setFormData({ 
                              ...formData, 
                              category: catDef.name,
                              category_archetype: catDef.archetype,
                              subcategory: catDef.subcategories[0] || ''
                            });
                          }}
                          className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500 text-xs"
                        >
                          {AURA_OFFICIAL_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.name} className="bg-slate-900 text-slate-200">
                              {cat.name} ({cat.description})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Subcategoría</label>
                        {(() => {
                          const currentCatDef = AURA_OFFICIAL_CATEGORIES.find(
                            c => c.name.toLowerCase() === formData.category.toLowerCase()
                          ) || AURA_OFFICIAL_CATEGORIES[0];
                          return (
                            <select
                              value={formData.subcategory}
                              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                              className="w-full p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500 text-xs"
                            >
                              {currentCatDef.subcategories.map((sub) => (
                                <option key={sub} value={sub} className="bg-slate-900 text-slate-200">
                                  {sub}
                                </option>
                              ))}
                              <option value="General" className="bg-slate-900 text-slate-200">General / Otro</option>
                            </select>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Nombre */}
                    <div className="space-y-1">
                      <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Nombre del Producto</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Audífonos Inalámbricos Bluetooth o Zapato Deportivo"
                        value={formData.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSearchTerm(val);
                          setFormData({
                            ...formData,
                            name: val,
                            product_id: editingStoreProductId ? formData.product_id : '',
                          });
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
                          placeholder="Ej: Sony, Nike, Casero, etc."
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

                    {/* Sección: Estrategia de Precio & Canales (Radar, Relámpago, Manadas) */}
                    <div className="space-y-3 p-3.5 bg-[#020508] border border-slate-800 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                          Estrategia de Precio y Modalidad Aura
                        </label>
                        <span className="text-[10px] text-slate-500 font-medium">Define dónde se publicará</span>
                      </div>

                      {/* Precio Regular (Obligatorio) */}
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center justify-between">
                          <span>Precio Regular de Venta en Tienda ($ USD)</span>
                          <span className="text-[9px] text-emerald-400 font-normal">Obligatorio</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="35.00"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 font-black text-sm"
                        />
                      </div>

                      {/* 1. Opción Descuento / Oferta Flash (Para Relámpago) */}
                      <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-amber-200 font-bold text-xs">
                          <input
                            type="checkbox"
                            checked={formData.has_discount}
                            onChange={(e) => setFormData({ ...formData, has_discount: e.target.checked })}
                            className="w-4 h-4 rounded text-amber-500 cursor-pointer"
                          />
                          <Zap size={14} className="text-amber-400 shrink-0" />
                          <span>¿Tiene Descuento / Oferta Flash? (Publicar en Relámpago)</span>
                        </label>

                        {formData.has_discount && (
                          <div className="space-y-2 pt-1.5 animate-in fade-in">
                            <div className="space-y-1">
                              <label className="text-amber-300/80 font-bold uppercase tracking-wider text-[10px] block">
                                Precio con Descuento ($ USD)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Ej: 28.00"
                                value={formData.sale_price}
                                onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                                className="w-full p-2 bg-slate-950 border border-amber-500/40 rounded-xl text-white outline-none focus:border-amber-400 text-xs"
                              />
                            </div>
                            <div className="p-2 bg-amber-500/10 rounded-lg text-[10px] text-amber-300 font-medium leading-relaxed">
                              ⚡ <strong>Atención:</strong> Al aplicar descuento, este producto aparecerá en <strong>Ofertas Relámpago</strong>. Como Radar es un buscador de catálogo estándar, los productos en oferta no aparecerán en Radar.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. Opción Venta al Mayor (Para Manadas) */}
                      <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-purple-200 font-bold text-xs">
                          <input
                            type="checkbox"
                            checked={formData.is_wholesale}
                            onChange={(e) => setFormData({ ...formData, is_wholesale: e.target.checked })}
                            className="w-4 h-4 rounded text-purple-500 cursor-pointer"
                          />
                          <Users size={14} className="text-purple-400 shrink-0" />
                          <span>¿Se vende al mayor? (Publicar en Manadas para compras grupales)</span>
                        </label>

                        {formData.is_wholesale && (
                          <div className="space-y-2 pt-1.5 animate-in fade-in">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-purple-300/80 font-bold uppercase tracking-wider text-[10px] block">
                                  Mínimo de Unidades
                                </label>
                                <input
                                  type="number"
                                  min="2"
                                  placeholder="6"
                                  value={formData.wholesale_min_units}
                                  onChange={(e) => setFormData({ ...formData, wholesale_min_units: parseInt(e.target.value) || 2 })}
                                  className="w-full p-2 bg-slate-950 border border-purple-500/40 rounded-xl text-white outline-none focus:border-purple-400 text-xs font-bold"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-purple-300/80 font-bold uppercase tracking-wider text-[10px] block">
                                  Precio Mayorista ($/ud)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Ej: 22.00"
                                  value={formData.wholesale_price}
                                  onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                                  className="w-full p-2 bg-slate-950 border border-purple-500/40 rounded-xl text-white outline-none focus:border-purple-400 text-xs font-bold"
                                />
                              </div>
                            </div>
                            <div className="p-2 bg-purple-500/10 rounded-lg text-[10px] text-purple-300 font-medium leading-relaxed">
                              👥 <strong>Compras en Manada:</strong> Los clientes podrán coordinarse en grupos para sumar las {formData.wholesale_min_units || 6} unidades y desbloquear tu precio mayorista.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Resumen de Canales de Publicación */}
                      <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-[10px] space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-wider block">
                          Canales donde aparecerá este producto:
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {!formData.has_discount ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-[#00ffb2] border border-emerald-500/30 font-bold flex items-center gap-1">
                              <span>🧭 Radar (Buscador y Vitrina)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                              <span>⚡ Relámpago (Oferta con Descuento)</span>
                            </span>
                          )}

                          {formData.is_wholesale && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1">
                              <span>👥 Manadas (Mayor: a partir de {formData.wholesale_min_units || 6} uds)</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Variantes u Opciones (Universal y Flexible) */}
                    <div className="space-y-2 p-3 bg-[#020508] border border-slate-850 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                          Variantes u Opciones (Opcional)
                        </label>
                        <span className="text-[10px] text-slate-500">Dejar vacío si es producto único</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-400 text-[10px] block mb-1">Nombre de la Variante</label>
                          <input
                            type="text"
                            placeholder="Ej: Color, Modelo, Versión, Capacidad..."
                            value={formData.variant_label}
                            onChange={(e) => setFormData({ ...formData, variant_label: e.target.value })}
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 text-[10px] block mb-1">Opciones (separadas por coma)</label>
                          <input
                            type="text"
                            placeholder="Ej: Negro, Blanco, Azul o 64GB, 128GB..."
                            value={formData.variant_options}
                            onChange={(e) => setFormData({ ...formData, variant_options: e.target.value })}
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Especificaciones / Ficha Técnica (Opcional) */}
                    <div className="space-y-2 p-3 bg-[#020508] border border-slate-850 rounded-2xl">
                      <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px] block">
                        Características Clave / Ficha Técnica (Opcional)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Propiedad (ej: Conectividad)"
                            value={formData.spec_1_label}
                            onChange={(e) => setFormData({ ...formData, spec_1_label: e.target.value })}
                            className="w-1/2 p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-emerald-500"
                          />
                          <input
                            type="text"
                            placeholder="Valor (ej: Bluetooth 5.3)"
                            value={formData.spec_1_val}
                            onChange={(e) => setFormData({ ...formData, spec_1_val: e.target.value })}
                            className="w-1/2 p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Propiedad (ej: Garantía)"
                            value={formData.spec_2_label}
                            onChange={(e) => setFormData({ ...formData, spec_2_label: e.target.value })}
                            className="w-1/2 p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-emerald-500"
                          />
                          <input
                            type="text"
                            placeholder="Valor (ej: 6 meses)"
                            value={formData.spec_2_val}
                            onChange={(e) => setFormData({ ...formData, spec_2_val: e.target.value })}
                            className="w-1/2 p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Gastro Flash (Restaurantes) */}
                    {formData.category_archetype === 'GASTRO_FLASH' && (
                      <div className="grid grid-cols-2 gap-2 p-3 bg-[#020508] border border-slate-850 rounded-2xl">
                        <div>
                          <label className="text-slate-400 font-bold text-[10px] uppercase block mb-1">Cupos Disponibles Hoy</label>
                          <input
                            type="number"
                            min="1"
                            value={formData.stock_quota}
                            onChange={(e) => setFormData({ ...formData, stock_quota: parseInt(e.target.value) || 10 })}
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold text-[10px] uppercase block mb-1">Válido Hasta (Hora)</label>
                          <input
                            type="text"
                            placeholder="Ej: 21:00"
                            value={formData.spec_1_val}
                            onChange={(e) => setFormData({ ...formData, spec_1_val: e.target.value, spec_1_label: 'Válido Hasta' })}
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-emerald-500"
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
                        <span>Destacar en sección &quot;Remates y Liquidaciones&quot;</span>
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
                      {loading ? (editingStoreProductId ? 'Guardando cambios...' : 'Publicando...') : uploadingImage ? 'Subiendo foto...' : (editingStoreProductId ? 'Guardar Cambios' : 'Publicar Producto')}
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

        {/* PESTAÑA 5: EL MEGÁFONO EN VIVO */}
        {activeTab === 'megaphone' && store && (
          <div className="space-y-4">
            <header className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Megaphone size={18} className="text-[#00ffb2]" />
                <span>El Megáfono</span>
              </h2>
            </header>

            <MegaphoneMerchantWidget
              store={store}
              bcvRate={tasaUsed}
              onNavigateToReservations={(pin?: string) => {
                setActiveTab('reservations');
                if (pin && pin !== 'TICKET') setPinInput(pin);
                if (storeId) fetchReservations(storeId);
              }}
              onQuoteSubmitted={() => {
                if (storeId) fetchInventory(storeId);
              }}
            />
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