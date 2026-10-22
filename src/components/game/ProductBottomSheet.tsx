'use client';

import { useState, useEffect } from 'react';
import { Product, Store, Reservation } from '@/types';
import { useGameSound } from '@/hooks/useGameSound';
import { useReservations } from '@/store/useReservations';
import { supabase } from '@/lib/supabase';
import {
  X, Clock, MapPin, Check, Sparkles, Store as StoreIcon,
  AlertCircle, ArrowRight, ShieldCheck,
  MessageCircle, Copy, AlertTriangle, Users, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCodeView from '@/components/QRCodeView';

interface Props {
  product: Product | null;
  onClose: () => void;
  onSuccessUnlock: () => void;
  stores?: Store[];
  tasa?: number;
}

type SheetStep =
  | 'SELECTION'
  | 'WAITING_VERIFICATION'
  | 'STOCK_CONFIRMED'
  | 'OPTION_A_TICKET'
  | 'OPTION_B_LAYAWAY'
  | 'OPTION_B_CONFIRMED'
  | 'OUT_OF_STOCK';

export default function ProductBottomSheet({
  product,
  onClose,
  onSuccessUnlock,
  stores = [],
  tasa = 500,
}: Props) {
  const { playTap, playUnlockSuccess, playDustSnap, playRadarPing } = useGameSound();
  const { setActiveReservation } = useReservations();

  // Estados del flujo paso a paso
  const [step, setStep] = useState<SheetStep>('SELECTION');
  const [stockConfirmationType, setStockConfirmationType] = useState<'green' | 'yellow'>('green');
  
  // Datos del producto y variante
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  
  // Datos de la reserva activa generada
  const [activeRes, setActiveRes] = useState<Reservation | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [generatedPin, setGeneratedPin] = useState<string>('');
  const [pagoMovilRef, setPagoMovilRef] = useState<string>('');
  const [pagoMovilAuraRef, setPagoMovilAuraRef] = useState<string>('');
  const [copiedBankData, setCopiedBankData] = useState<boolean>(false);
  const [copiedAuraBankData, setCopiedAuraBankData] = useState<boolean>(false);
  const [payAuraWithWallet, setPayAuraWithWallet] = useState<boolean>(false);
  const [userWalletCredit, setUserWalletCredit] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Contador regresivo para ticket de 3 horas
  const [timeLeft, setTimeLeft] = useState({ hours: 3, minutes: 0, seconds: 0 });

  // Inicializar variantes y precargar datos del cliente
  useEffect(() => {
    if (!product) {
      setStep('SELECTION');
      setActiveRes(null);
      return;
    }

    // Variantes dinámicas universales (Color, Modelo, Capacidad, etc.)
    const firstGroup = product.variants?.[0];
    const availableOptions = firstGroup?.options || product.sizes || [];
    if (availableOptions.length > 0) {
      setSelectedVariant(availableOptions[0]);
    } else {
      setSelectedVariant('Estándar');
    }

    // Precargar datos del usuario desde localStorage o Supabase
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('aura_customer_name') || '';
      const savedPhone = localStorage.getItem('aura_customer_phone') || '';
      if (savedName) setCustomerName(savedName);
      if (savedPhone) setCustomerPhone(savedPhone);
    }

    const loadAuthUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
          if (name && !customerName) setCustomerName(name);
          const phone = user.phone || user.user_metadata?.phone || '';
          if (phone && !customerPhone) setCustomerPhone(phone);

          const { data: prof } = await supabase
            .from('profiles')
            .select('wallet_credit_usd')
            .eq('id', user.id)
            .maybeSingle();

          if (prof?.wallet_credit_usd) {
            const credit = Number(prof.wallet_credit_usd);
            setUserWalletCredit(credit);
            if (credit >= Number((auraPrice * 0.05).toFixed(2))) {
              setPayAuraWithWallet(true);
            }
          }
        }
      } catch {}
    };
    loadAuthUser();
  }, [product]);

  // Manejar cierre con sonido Thanos suave
  const handleClose = () => {
    playDustSnap('fast');
    onClose();
  };

  // Temporizador regresivo para el ticket generado
  useEffect(() => {
    if (step !== 'OPTION_A_TICKET' && step !== 'OPTION_B_LAYAWAY') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Cálculos seguros con fallbacks para evitar cualquier error de tipo o runtime
  const auraPrice = Number(product?.aura_price_usd || product?.price || 10);
  const regularPrice = Number(product?.regular_price_usd || product?.price || auraPrice);
  
  // 5% de tarifa de desbloqueo oficial Aura (NO se descuenta del precio que recibe la tienda)
  const auraUnlockFeeUSD = Number((auraPrice * 0.05).toFixed(2));
  const auraUnlockFeeVES = Math.round(auraUnlockFeeUSD * (tasa || 883));
  
  // Cálculo de apartado 30% inicial directo para el comercio
  const deposit30USD = Number((auraPrice * 0.30).toFixed(2));
  const remaining70USD = Number((auraPrice - deposit30USD).toFixed(2));
  const deposit30VES = Math.round(deposit30USD * (tasa || 883));
  const remaining70VES = Math.round(remaining70USD * (tasa || 883));
  const totalVES = Math.round(auraPrice * (tasa || 883));

  // Tienda asociada
  const store = product ? stores.find((s) => s.id === product.storeId || s.id === product.store_id) : undefined;
  const storeName = store?.name || 'Tienda Oficial Aura';
  const storeZone = store?.zone || store?.address || 'Cumaná, Sucre';
  const storePhoneRaw = (store?.owner_whatsapp || store?.whatsapp || '04141234567').toString().replace(/[^0-9]/g, '');
  const storePhoneClean = storePhoneRaw.startsWith('58') ? '0' + storePhoneRaw.slice(2) : storePhoneRaw;

  // Variantes disponibles
  const variantGroup = product?.variants?.[0];
  const variantOptions = variantGroup?.options || (product?.sizes && product.sizes.length > 0 ? product.sizes : []);

  // ==============================================================================
  // PASO 2: SOLICITUD DE DISPONIBILIDAD (Sin pagar nada todavía)
  // ==============================================================================
  const handleRequestAvailability = async () => {
    if (!product) return;
    if (!customerName.trim()) {
      alert('Por favor ingresa tu nombre o apodo para el mostrador.');
      return;
    }
    if (!customerPhone.trim()) {
      alert('Por favor ingresa tu número de WhatsApp para confirmar tu retiro.');
      return;
    }

    playTap();
    setIsSubmitting(true);
    setStep('WAITING_VERIFICATION');

    // Guardar en localStorage para futuras visitas
    if (typeof window !== 'undefined') {
      localStorage.setItem('aura_customer_name', customerName.trim());
      localStorage.setItem('aura_customer_phone', customerPhone.trim());
    }

    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedPin(pin);

    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    // Verificador de sintaxis UUID para PostgreSQL
    const isValidUUID = (id?: string | null): id is string =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    // Determinar store_id válido (debe ser UUID válido para la BD)
    const effectiveStoreId = isValidUUID(store?.id)
      ? store.id
      : isValidUUID(product.store_id)
        ? product.store_id
        : isValidUUID(product.storeId)
          ? product.storeId
          : (stores.find(s => isValidUUID(s.id))?.id || null);

    const effectiveProductId = isValidUUID(product.id) ? product.id : null;

    let uid = currentUserId;
    if (!uid) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id || null;
      } catch {}
    }

    const newReservation: Reservation = {
      id: `res-${Date.now()}`,
      user_id: uid || undefined,
      pin: pin,
      pin_code: pin,
      store_id: effectiveStoreId || 'store-cumana',
      store_name: storeName,
      store_whatsapp: storePhoneRaw,
      store_address: storeZone,
      product_id: product.id,
      product_name: product.name,
      product_image: product.imageUrl || product.image_url,
      selected_size: selectedVariant || 'Estándar',
      price_usd: auraPrice,
      total_price: auraPrice,
      unlock_fee_usd: 0, // Sin pagar nada todavía
      store_pay_balance_usd: auraPrice,
      price_ves: totalVES,
      tasa: tasa,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      status: 'pending',
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };

    setActiveRes(newReservation);
    setActiveReservation(newReservation);

    // 1. Guardar la solicitud en Supabase para que llegue a Mostrador y Dashboard
    try {
      const { data: dbRes, error: insertError } = await supabase
        .from('reservations')
        .insert([{
          pin_code: pin,
          store_id: effectiveStoreId,
          product_id: effectiveProductId,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          selected_size: selectedVariant || 'Estándar',
          total_price: auraPrice,
          bcv_rate: tasa,
          status: 'pending',
          expires_at: expiresAt,
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error insertando reserva en Supabase:', insertError);
      }

      if (dbRes) {
        const finalReservation: Reservation = {
          ...newReservation,
          id: dbRes.id,
          pin: dbRes.pin_code || pin,
          pin_code: dbRes.pin_code || pin,
          status: dbRes.status || 'pending',
        };
        setActiveRes(finalReservation);
        setActiveReservation(finalReservation);
      }
    } catch (err) {
      console.warn('Registro local de reserva activo:', err);
    } finally {
      setIsSubmitting(false);
    }

    // 2. Si el producto tiene auto_confirm_stock activado (ej. comida o cupo diario)
    if (product.auto_confirm_stock) {
      setTimeout(() => {
        playUnlockSuccess();
        setStockConfirmationType('green');
        setStep('STOCK_CONFIRMED');
      }, 1400);
      return;
    }

    // Sonido suave de sonar de radar
    playRadarPing();
  };

  // ==============================================================================
  // PASO 3: ESCUCHA EN TIEMPO REAL DEL SEMÁFORO DE MOSTRADOR
  // ==============================================================================
  useEffect(() => {
    if (step !== 'WAITING_VERIFICATION' || !activeRes?.id) return;

    const resId = activeRes.id;

    // A. Suscripción Postgres Changes
    const channel = supabase
      .channel(`res_check_${resId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reservations', filter: `id=eq.${resId}` },
        (payload: { new?: Partial<Reservation> & Record<string, any> }) => {
          const status = payload.new?.status;
          if (status === 'confirmed' || status === 'confirmada' || status === 'STOCK_VERIFIED') {
            playUnlockSuccess();
            setStockConfirmationType('green');
            setStep('STOCK_CONFIRMED');
            setActiveRes((prev) => {
              if (!prev) return null;
              const updated = { ...prev, status: 'confirmed' as const };
              setActiveReservation(updated);
              return updated;
            });
          } else if (status === 'ultimo_par') {
            playUnlockSuccess();
            setStockConfirmationType('yellow');
            setStep('STOCK_CONFIRMED');
            setActiveRes((prev) => {
              if (!prev) return null;
              const updated = { ...prev, status: 'ultimo_par' as const };
              setActiveReservation(updated);
              return updated;
            });
          } else if (status === 'cancelled' || status === 'cancelada' || status === 'REJECTED_OUT_OF_STOCK') {
            setStep('OUT_OF_STOCK');
          }
        }
      )
      .subscribe();

    // B. Sondeo de respaldo cada 2.5s
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('reservations')
          .select('status')
          .eq('id', resId)
          .maybeSingle();

        if (data) {
          if (data.status === 'confirmed' || data.status === 'confirmada' || data.status === 'STOCK_VERIFIED') {
            playUnlockSuccess();
            setStockConfirmationType('green');
            setStep('STOCK_CONFIRMED');
            setActiveRes((prev) => {
              if (!prev) return null;
              const updated = { ...prev, status: 'confirmed' as const };
              setActiveReservation(updated);
              return updated;
            });
          } else if (data.status === 'ultimo_par') {
            playUnlockSuccess();
            setStockConfirmationType('yellow');
            setStep('STOCK_CONFIRMED');
            setActiveRes((prev) => {
              if (!prev) return null;
              const updated = { ...prev, status: 'ultimo_par' as const };
              setActiveReservation(updated);
              return updated;
            });
          } else if (data.status === 'cancelled' || data.status === 'cancelada' || data.status === 'REJECTED_OUT_OF_STOCK') {
            setStep('OUT_OF_STOCK');
          }
        }
      } catch {}
    }, 2500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [step, activeRes?.id, playUnlockSuccess, setActiveReservation]);

  // ==============================================================================
  // PASO 4A: ELECCIÓN CLIENTE -> OPCIÓN A (IR HOY MISMO - TICKET QR GRATIS 3 HORAS)
  // ==============================================================================
  const handleSelectOptionA = async () => {
    playTap();
    if (!activeRes) return;

    const updatedRes: Reservation = {
      ...activeRes,
      status: 'confirmed',
      payment_method: 'en_tienda',
      payment_type: 'reserva_3h',
      unlock_fee_usd: 0,
      store_pay_balance_usd: auraPrice,
    };

    setActiveRes(updatedRes);
    setActiveReservation(updatedRes);
    setStep('OPTION_A_TICKET');
    playUnlockSuccess();
    onSuccessUnlock();

    // Actualizar en Supabase
    try {
      await supabase
        .from('reservations')
        .update({
          status: 'confirmed',
          unlock_fee_usd: 0,
          store_pay_balance_usd: auraPrice,
        })
        .eq('id', activeRes.id);
    } catch {}
  };

  // ==============================================================================
  // PASO 4B: ELECCIÓN CLIENTE -> OPCIÓN B (APARTADO DIGITAL - CASHEA INVERSO 30%)
  // ==============================================================================
  const handleSelectOptionB = () => {
    playTap();
    setStep('OPTION_B_LAYAWAY');
  };

  const handleConfirmApartadoPagoMovil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !activeRes) return;
    if (!pagoMovilRef.trim()) {
      alert('Por favor ingresa los dígitos de la referencia de tu Pago Móvil al comercio.');
      return;
    }
    if (!payAuraWithWallet && !pagoMovilAuraRef.trim()) {
      alert('Por favor ingresa los dígitos de la referencia del desbloqueo a Aura (5%).');
      return;
    }

    playTap();

    const auraPayDesc = payAuraWithWallet
      ? 'Aura 5%: Billetera'
      : `Aura 5%: Ref #${pagoMovilAuraRef.trim()}`;

    const updatedRes: Reservation = {
      ...activeRes,
      status: 'confirmed',
      payment_method: 'pago_movil',
      payment_type: 'apartado_15d',
      payment_reference: pagoMovilRef.trim(),
      unlock_fee_usd: auraUnlockFeeUSD,
      initial_deposit: deposit30USD,
      store_pay_balance_usd: remaining70USD,
    };

    setActiveRes(updatedRes);
    setActiveReservation(updatedRes);
    playUnlockSuccess();
    setStep('OPTION_B_CONFIRMED');

    // Descontar saldo de billetera si aplica
    if (payAuraWithWallet && currentUserId && userWalletCredit >= auraUnlockFeeUSD) {
      try {
        const newCredit = Number((userWalletCredit - auraUnlockFeeUSD).toFixed(2));
        await supabase.from('profiles').update({ wallet_credit_usd: newCredit }).eq('id', currentUserId);
        setUserWalletCredit(newCredit);
      } catch {}
    }

    // Actualizar en Supabase
    try {
      const isValidUUID = Boolean(activeRes.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeRes.id));
      const query = supabase
        .from('reservations')
        .update({
          status: 'confirmed',
          payment_method: 'pago_movil',
          payment_type: 'apartado_15d',
          payment_reference: pagoMovilRef.trim(),
          customer_phone: `${customerPhone} [PAGO_MOVIL: Ref #${pagoMovilRef.trim()} - Apartado 30% - ${auraPayDesc}]`,
          unlock_fee_usd: auraUnlockFeeUSD,
          initial_deposit: deposit30USD,
          store_pay_balance_usd: remaining70USD,
        });

      if (isValidUUID) {
        await query.eq('id', activeRes.id);
      } else if (activeRes.pin_code || activeRes.pin) {
        await query.eq('pin_code', activeRes.pin_code || activeRes.pin);
      }
    } catch (err) {
      console.warn('Error actualizando reserva en Supabase:', err);
    }

    // Enviar mensaje directo por WhatsApp a la tienda
    const waText = encodeURIComponent(
      `Hola ${storeName}, acabo de realizar el apartado digital en Aura para "${product.name}" (${selectedVariant}).\n` +
      `Código de Boleto: #${generatedPin}\n` +
      `Referencia Pago Móvil Tienda (30%): ${pagoMovilRef.trim()} (Bs. ${deposit30VES.toLocaleString('es-VE')} / $${deposit30USD} USD).\n` +
      `Desbloqueo Aura (5%): $${auraUnlockFeeUSD} USD (${auraPayDesc}).\n` +
      `Saldo restante a pagar al retirar en depósito: $${remaining70USD} USD (14 a 30 días).`
    );
    window.open(`https://wa.me/${storePhoneRaw.startsWith('58') ? storePhoneRaw : `58${storePhoneRaw}`}?text=${waText}`, '_blank');
  };

  // Copiar datos de Pago Móvil de Aura (5% Desbloqueo)
  const handleCopyAuraBankData = () => {
    playTap();
    const text = `Pago Móvil Desbloqueo Aura:\nBanco: 0102 Banco de Venezuela\nTeléfono: 04140857379\nRIF: J-50348291-0\nMonto Desbloqueo (5%): Bs. ${auraUnlockFeeVES.toLocaleString('es-VE')} ($${auraUnlockFeeUSD} USD)`;
    navigator.clipboard.writeText(text);
    setCopiedAuraBankData(true);
    setTimeout(() => setCopiedAuraBankData(false), 2500);
  };

  // Copiar datos de Pago Móvil de la tienda
  const handleCopyBankData = () => {
    playTap();
    const text = `Pago Móvil ${storeName}:\nBanco: 0102 Banco de Venezuela\nTeléfono: ${storePhoneClean}\nRIF: J-40812345-0\nMonto Inicial (30%): Bs. ${deposit30VES.toLocaleString('es-VE')} ($${deposit30USD} USD)`;
    navigator.clipboard.writeText(text);
    setCopiedBankData(true);
    setTimeout(() => setCopiedBankData(false), 2500);
  };

  return (
    <AnimatePresence>
      {product && (
        <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
          
          {/* BACKDROP BLURRED CINEMATOGRÁFICO */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* CONTENEDOR PRINCIPAL BOTTOM SHEET */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[#040913]/95 border-t border-emerald-500/30 rounded-t-3xl sm:rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.85)] p-5 sm:p-6 max-h-[90vh] overflow-y-auto no-scrollbar z-10"
          >
            {/* Reflejo especular superior fino */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffb2]/50 to-transparent" />

            {/* Manija de arrastre */}
            <div className="w-12 h-1 rounded-full bg-slate-700/80 mx-auto mb-4" />

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-900/80 rounded-full transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* =====================================================================
                1. PANTALLA: SELECCIÓN & CONTACTO INICIAL
                ===================================================================== */}
            {step === 'SELECTION' && (
              <div className="space-y-4">
                
                {/* Encabezado con imagen, tienda y título */}
                <div className="flex gap-3.5 items-center">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 shadow-inner flex items-center justify-center">
                    {product.imageUrl || product.image_url ? (
                      <img
                        src={product.imageUrl || product.image_url || ''}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-600 font-bold">
                        Aura
                      </div>
                    )}
                  </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                    <StoreIcon size={13} className="text-[#00ffb2]" />
                    <span className="truncate">{storeName}</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white leading-tight line-clamp-2">
                    {product.name}
                  </h2>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-light">
                    <MapPin size={11} className="text-emerald-400 shrink-0" />
                    <span className="truncate">{storeZone}</span>
                  </div>
                </div>
              </div>

              {/* Selector de Variante Universal (si el producto las tiene) */}
              {variantOptions.length > 1 && (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-300">
                      Elige {variantGroup?.label || 'Opción'}:
                    </span>
                    <span className="text-[11px] text-[#00ffb2] font-semibold">
                      {selectedVariant}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {variantOptions.map((opt) => {
                      const isSel = selectedVariant === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            playTap();
                            setSelectedVariant(opt);
                          }}
                          className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                            isSel
                              ? 'bg-emerald-950/80 text-[#00ffb2] border-[#00ffb2] shadow-[0_0_12px_rgba(0,255,178,0.35)] scale-105'
                              : 'bg-[#060c18] text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Precios: Regular vs Precio Especial Aura */}
              <div className="bg-[#050b16] border border-slate-800/80 rounded-2xl p-3.5 space-y-2 shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Precio Regular en Tienda:</span>
                  <span className="line-through text-slate-500 font-bold">${regularPrice.toFixed(2)} USD</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">Precio Especial Aura:</span>
                    <span className="text-[10px] text-emerald-400">Congelado en vitrina de mostrador</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-[#00ffb2]">${auraPrice.toFixed(2)} USD</span>
                    <span className="block text-[10px] text-slate-400 font-mono">≈ Bs. {totalVES.toLocaleString('es-VE')}</span>
                  </div>
                </div>
              </div>

              {/* Formulario de Contacto para el Mostrador */}
              <div className="space-y-2.5 pt-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Tus Datos para el Mostrador (Sin Registro Obligatorio):
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Tu Nombre o Apodo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="p-3 bg-[#030712] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-[#00ffb2]"
                  />

                  <input
                    type="tel"
                    required
                    placeholder="Teléfono / WhatsApp"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="p-3 bg-[#030712] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-[#00ffb2]"
                  />
                </div>
              </div>

              {/* Botón Principal: Verificar disponibilidad / Apartar (Sin pagar nada todavía) */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRequestAvailability}
                className="game-sweep w-full cursor-pointer bg-gradient-to-r from-emerald-500 via-[#00ffb2] to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-4 px-6 rounded-2xl text-sm transition shadow-lg shadow-emerald-500/25 flex flex-col items-center justify-center gap-0.5 active:scale-95 disabled:opacity-50 mt-2"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} />
                  <span>Verificar disponibilidad / Apartar</span>
                </div>
                <span className="text-[10px] font-normal text-slate-900 opacity-90">
                  Sin pagar nada todavía • Consulta en vivo al estante físico
                </span>
              </button>
            </div>
          )}

          {/* =====================================================================
              2. PANTALLA: ESPERANDO VERIFICACIÓN EN ESTANTE (RADAR EN VIVO)
              ===================================================================== */}
          {step === 'WAITING_VERIFICATION' && (
            <div className="py-8 text-center space-y-6">
              {/* Animación de Ondas de Radar Concéntricas */}
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                <span className="absolute w-full h-full rounded-full border border-emerald-500/20 animate-ping" />
                <span className="absolute w-20 h-20 rounded-full border border-[#00ffb2]/40 animate-pulse" />
                <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-[#00ffb2] flex items-center justify-center shadow-[0_0_30px_rgba(0,255,178,0.4)]">
                  <Clock size={28} className="animate-spin" />
                </div>
              </div>

              <div className="space-y-1.5 max-w-sm mx-auto">
                <span className="text-[10px] uppercase font-black tracking-widest text-[#00ffb2]">
                  Paso 2 • Verificación en Estante
                </span>
                <h3 className="text-xl font-black text-white">
                  Consultando con {storeName}...
                </h3>
                <p className="text-xs text-slate-300 font-light leading-relaxed">
                  Al teléfono del mostrador llegó tu alerta. El encargado está mirando el estante físico en este momento.
                </p>
              </div>

              <div className="p-3 bg-[#030812] border border-slate-800 rounded-2xl text-xs text-slate-400 max-w-xs mx-auto flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Esperando respuesta de semáforo...</span>
              </div>

              <button
                type="button"
                onClick={() => setStep('SELECTION')}
                className="text-xs text-slate-500 hover:text-slate-300 underline cursor-pointer transition font-light"
              >
                Volver a la selección de producto
              </button>
            </div>
          )}

          {/* =====================================================================
              3. PANTALLA: STOCK CONFIRMADO (VERDE O AMARILLO) -> ELECCIÓN CLIENTE
              ===================================================================== */}
          {step === 'STOCK_CONFIRMED' && (
            <div className="space-y-4 py-1">
              
              {/* Banner de confirmación de stock */}
              {stockConfirmationType === 'yellow' ? (
                <div className="p-4 bg-amber-950/30 border border-amber-500/50 rounded-2xl flex items-center gap-3 text-amber-200">
                  <AlertTriangle size={24} className="text-amber-400 shrink-0 animate-bounce" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-300 tracking-wide">
                      ¡Confirmado: Es la última unidad en estante!
                    </h4>
                    <p className="text-[11px] text-slate-300 font-light mt-0.5">
                      El encargado la apartó para ti en el mostrador. Elige cómo deseas concretarla:
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/50 rounded-2xl flex items-center gap-3 text-emerald-200">
                  <Check size={24} className="text-[#00ffb2] shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-emerald-300 tracking-wide">
                      ¡Confirmado: Hay disponibilidad en estante!
                    </h4>
                    <p className="text-[11px] text-slate-300 font-light mt-0.5">
                      {storeName} te espera con el precio congelado. Elige tu modalidad:
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-1">
                
                {/* OPCIÓN A: IR HOY MISMO (GRATIS) */}
                <div
                  onClick={handleSelectOptionA}
                  className="cursor-pointer group relative overflow-hidden bg-[#050c18] hover:bg-[#071326] border-2 border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-4 transition active:scale-98 shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#00ffb2] border border-emerald-500/30">
                          Opción A • Gratis
                        </span>
                        <span className="text-xs font-bold text-white">Ir hoy mismo a la tienda</span>
                      </div>
                      <p className="text-xs text-slate-300 font-light leading-relaxed">
                        Recibe un <strong>Ticket QR válido por 3 horas</strong> para ir al local, revisar el producto con calma y pagarlo completo en caja.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-[#00ffb2] block">$0.00 Ahora</span>
                      <span className="text-[10px] text-slate-400 block">${auraPrice.toFixed(2)} en caja</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-3 w-full bg-emerald-500/20 group-hover:bg-[#00ffb2] text-[#00ffb2] group-hover:text-black font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-emerald-500/40"
                  >
                    <span>Generar Ticket QR de 3 Horas (Gratis)</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* OPCIÓN B: APARTADO DIGITAL (CASHEA INVERSO 15-30 DÍAS) */}
                <div
                  onClick={handleSelectOptionB}
                  className="cursor-pointer group relative overflow-hidden bg-[#070b18] hover:bg-[#0c1228] border border-indigo-500/40 hover:border-indigo-400 rounded-2xl p-4 transition active:scale-98 shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Opción B • 15 a 30 Días
                        </span>
                        <span className="text-xs font-bold text-white">Apartado Digital (Cashea Inverso)</span>
                      </div>
                      <p className="text-xs text-slate-300 font-light leading-relaxed">
                        Asegúralo transfiriendo el <strong>30% de inicial ($${deposit30USD})</strong> al Pago Móvil de la tienda. El local lo guarda en su depósito y lo retiras al pagar el 70% restante.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-indigo-300 block">30% Inicial</span>
                      <span className="text-[10px] text-slate-400 block">${deposit30USD} USD</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-3 w-full bg-indigo-500/20 group-hover:bg-indigo-600 text-indigo-200 group-hover:text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-indigo-500/40"
                  >
                    <span>Elegir Apartado Digital (30% Inicial)</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* =====================================================================
              4A. PANTALLA: TICKET QR OFICIAL LISTO (OPCIÓN A)
              ===================================================================== */}
          {step === 'OPTION_A_TICKET' && (
            <div className="space-y-4 py-2 text-center animate-in zoom-in-95 duration-200">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                <Check size={14} className="text-[#00ffb2]" />
                <span>Ticket de Retiro Activo</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white">
                  ¡Producto Apartado con Éxito!
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Muestra este código PIN o código QR en el mostrador de {storeName}.
                </p>
              </div>

              {/* CÓDIGO QR GENERADO & PIN */}
              <div className="bg-[#030812] border border-emerald-500/40 rounded-3xl p-5 max-w-xs mx-auto space-y-3 shadow-inner">
                <QRCodeView value={generatedPin} size={150} />

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">
                    PIN Oficial de Caja:
                  </span>
                  <span className="font-mono text-3xl font-black text-[#00ffb2] tracking-widest">
                    #{generatedPin}
                  </span>
                </div>

                {/* Temporizador Regresivo de 3 Horas */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-amber-300 font-bold bg-amber-950/40 border border-amber-800/40 py-1.5 px-3 rounded-xl">
                  <Clock size={13} className="text-amber-400 animate-pulse" />
                  <span>
                    Vence en: {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Desglose a pagar en caja física */}
              <div className="p-3 bg-[#050b16] border border-slate-800 rounded-2xl flex items-center justify-around text-xs max-w-xs mx-auto">
                <div>
                  <span className="text-[10px] text-slate-400 block">TOTAL EN CAJA:</span>
                  <span className="font-black text-white text-sm">${auraPrice.toFixed(2)} USD</span>
                </div>
                <div className="w-px h-6 bg-slate-800" />
                <div>
                  <span className="text-[10px] text-slate-400 block">TASA BCV:</span>
                  <span className="font-bold text-[#00ffb2] text-sm">Bs. {totalVES.toLocaleString('es-VE')}</span>
                </div>
              </div>

              {/* Botón de acción final: Ver en mis pases */}
              <button
                type="button"
                onClick={handleClose}
                className="w-full cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-3.5 rounded-2xl text-xs transition shadow-lg active:scale-95"
              >
                Listo • Ver Mi Pase en el Dock
              </button>
            </div>
          )}

          {/* =====================================================================
              4B. PANTALLA: APARTADO DIGITAL / PAGO MÓVIL DIRECTO (OPCIÓN B)
              ===================================================================== */}
          {step === 'OPTION_B_LAYAWAY' && (
            <div className="space-y-4 py-1">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-400">
                    Apartado Digital • 14 a 30 Días
                  </span>
                  <h3 className="text-base font-black text-white">
                    Asegura tu producto en depósito
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('STOCK_CONFIRMED')}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Volver
                </button>
              </div>

              {/* Resumen Ecuación Financiera */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#030812] border border-emerald-500/30 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-light">1. Desbloqueo Aura:</span>
                  <strong className="text-[#00ffb2] font-black text-xs sm:text-sm">${auraUnlockFeeUSD.toFixed(2)} USD</strong>
                  <span className="block text-[9px] text-slate-500 font-mono">5% de custodia</span>
                </div>
                <div className="bg-[#030812] border border-indigo-500/30 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-light">2. Inicial Tienda:</span>
                  <strong className="text-indigo-300 font-black text-xs sm:text-sm">${deposit30USD.toFixed(2)} USD</strong>
                  <span className="block text-[9px] text-slate-500 font-mono">30% en depósito</span>
                </div>
                <div className="bg-[#030812] border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-light">3. Al Retirar:</span>
                  <strong className="text-white font-black text-xs sm:text-sm">${remaining70USD.toFixed(2)} USD</strong>
                  <span className="block text-[9px] text-slate-500 font-mono">70% en caja</span>
                </div>
              </div>

              <form onSubmit={handleConfirmApartadoPagoMovil} className="space-y-4">
                
                {/* 1. SECCIÓN: PAGO DEL 5% DESBLOQUEO AURA */}
                <div className="bg-[#030812] border border-emerald-500/30 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#00ffb2] flex items-center gap-1.5">
                      <Sparkles size={13} />
                      Paso 1: Desbloqueo y Custodia Aura (5%)
                    </span>
                    <span className="font-black text-white text-xs">${auraUnlockFeeUSD.toFixed(2)} USD</span>
                  </div>

                  {userWalletCredit >= auraUnlockFeeUSD ? (
                    <label className="flex items-center gap-2 p-2 bg-emerald-950/40 border border-emerald-500/40 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={payAuraWithWallet}
                        onChange={(e) => setPayAuraWithWallet(e.target.checked)}
                        className="accent-emerald-400 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[11px] text-emerald-200 font-bold">
                        Pagar con saldo de Billetera Aura (${userWalletCredit.toFixed(2)} USD disponible)
                      </span>
                    </label>
                  ) : null}

                  {!payAuraWithWallet && (
                    <div className="space-y-2 pt-1 border-t border-slate-800/80">
                      <div className="text-[11px] text-slate-300 space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Banco / Teléfono Aura:</span>
                          <span className="text-white font-mono">0102 BDV • 04140857379</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">RIF / Monto en Bs:</span>
                          <span className="text-[#00ffb2] font-mono font-bold">J-50348291-0 • Bs. {auraUnlockFeeVES.toLocaleString('es-VE')}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCopyAuraBankData}
                          className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Copy size={11} />
                          <span>{copiedAuraBankData ? '¡Copiado!' : 'Copiar Pago Móvil Aura'}</span>
                        </button>
                        <input
                          type="text"
                          required={!payAuraWithWallet}
                          placeholder="Ref Pago Móvil Aura (4 dígitos)"
                          value={pagoMovilAuraRef}
                          onChange={(e) => setPagoMovilAuraRef(e.target.value)}
                          className="flex-1 p-1.5 bg-[#020508] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. SECCIÓN: PAGO DEL 30% INICIAL AL COMERCIO */}
                <div className="bg-[#030812] border border-indigo-500/30 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <StoreIcon size={13} />
                      Paso 2: Abono 30% Inicial para {storeName}
                    </span>
                    <span className="font-black text-white text-xs">${deposit30USD.toFixed(2)} USD</span>
                  </div>

                  <div className="text-[11px] text-slate-300 space-y-0.5 pt-1 border-t border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Banco / Teléfono Comercio:</span>
                      <span className="text-white font-mono">0102 BDV • {storePhoneClean}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">RIF / Monto Inicial en Bs:</span>
                      <span className="text-[#00ffb2] font-mono font-bold">J-40812345-0 • Bs. {deposit30VES.toLocaleString('es-VE')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyBankData}
                      className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Copy size={11} />
                      <span>{copiedBankData ? '¡Copiado!' : 'Copiar Pago Móvil Tienda'}</span>
                    </button>
                    <input
                      type="text"
                      required
                      placeholder="Ref Pago Móvil Tienda (4 dígitos)"
                      value={pagoMovilRef}
                      onChange={(e) => setPagoMovilRef(e.target.value)}
                      className="flex-1 p-1.5 bg-[#020508] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                  Al confirmar, tu boleto quedará guardado en tu teléfono y en el sistema de {storeName}. El producto queda en depósito con el 70% restante (${remaining70USD.toFixed(2)} USD) a liquidar al retirar dentro de los 14 a 30 días.
                </p>

                <button
                  type="submit"
                  className="game-sweep w-full cursor-pointer bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:brightness-110 text-white font-black py-3.5 rounded-2xl text-xs transition shadow-lg shadow-indigo-600/25 active:scale-95"
                >
                  Confirmar Apartado y Guardar Boleto
                </button>
              </form>
            </div>
          )}

          {/* =====================================================================
              4C. PANTALLA: APARTADO CONFIRMADO CON ÉXITO (RECIBO Y QR ACTIVO)
              ===================================================================== */}
          {step === 'OPTION_B_CONFIRMED' && (
            <div className="space-y-4 py-2 text-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full inline-block mb-1.5">
                  📦 Apartado en Depósito Activo (14 a 30 Días)
                </span>
                <h3 className="text-xl font-black text-white">
                  ¡Apartado Guardado con Éxito!
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Tu producto <strong className="text-white">{product?.name}</strong> está resguardado en el depósito de <strong className="text-emerald-400">{storeName}</strong>.
                </p>
              </div>

              {/* CÓDIGO QR Y PIN */}
              <div className="bg-[#030812] border border-indigo-500/30 rounded-2xl p-4 space-y-2">
                <div className="flex justify-center">
                  <QRCodeView value={generatedPin} size={130} />
                </div>
                <div className="font-mono text-3xl font-black text-[#00ffb2] tracking-widest">
                  #{generatedPin}
                </div>
                <p className="text-[11px] text-slate-400">
                  Muestra este PIN o QR en el mostrador para retirar tu producto.
                </p>
              </div>

              {/* RESUMEN FINANCIERO */}
              <div className="bg-[#020508] border border-slate-800 rounded-2xl p-3 text-xs space-y-1.5 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Desbloqueo Aura (5%):</span>
                  <span className="text-[#00ffb2] font-bold">${auraUnlockFeeUSD.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">30% Inicial Tienda:</span>
                  <span className="text-indigo-300 font-bold">${deposit30USD.toFixed(2)} USD (Ref: #{pagoMovilRef})</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-white font-bold">70% Restante a Pagar al Retirar:</span>
                  <span className="text-white font-black">${remaining70USD.toFixed(2)} USD (Bs. {remaining70VES.toLocaleString('es-VE')})</span>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    const waText = encodeURIComponent(
                      `Hola ${storeName}, acabo de realizar el apartado digital en Aura para "${product?.name}" (${selectedVariant}).\n` +
                      `Código de Boleto: #${generatedPin}\n` +
                      `Referencia Pago Móvil Tienda (30%): ${pagoMovilRef.trim()}\n` +
                      `Monto 30% Inicial: Bs. ${deposit30VES.toLocaleString('es-VE')} ($${deposit30USD} USD).\n` +
                      `Saldo restante al retirar: $${remaining70USD} USD.`
                    );
                    window.open(`https://wa.me/${storePhoneRaw.startsWith('58') ? storePhoneRaw : `58${storePhoneRaw}`}?text=${waText}`, '_blank');
                  }}
                  className="w-full bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <MessageCircle size={15} />
                  <span>Reabrir WhatsApp del Comercio</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    onSuccessUnlock();
                    handleClose();
                  }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-3.5 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Listo • Ver Mi Boleto en Mis Pases
                </button>
              </div>
            </div>
          )}

          {/* =====================================================================
              5. PANTALLA: AGOTADO EN ESTANTE (ROJO EN MOSTRADOR)
              ===================================================================== */}
          {step === 'OUT_OF_STOCK' && (
            <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-rose-950/60 border border-rose-500/50 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(244,63,94,0.3)]">
                <AlertCircle size={32} />
              </div>

              <div className="space-y-1.5 max-w-sm mx-auto">
                <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider">
                  Reporte de Estante en Vivo
                </span>
                <h3 className="text-xl font-black text-white">
                  Producto Agotado en Mostrador
                </h3>
                <p className="text-xs text-slate-300 font-light leading-relaxed">
                  El encargado verificó el estante y lamentablemente esta unidad se acaba de agotar. La tienda ha guardado tu interés en su reporte de demanda para reponer mercancía pronto.
                </p>
              </div>

              <div className="space-y-2 pt-2 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    alert(`¡Anotado en la fila de espera para ${product?.name || 'este producto'}! Te notificaremos apenas el comercio reponga inventario con el mismo precio congelado.`);
                    handleClose();
                  }}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black py-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  <Users size={14} />
                  <span>Anotarme en la Fila de Espera (Mismo Precio)</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-3 rounded-xl text-xs transition cursor-pointer"
                >
                  Seguir Explorando en Radar
                </button>
              </div>
            </div>
          )}

        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
