'use client';

import { useState, useEffect } from 'react';
import { Product, Store, Reservation } from '@/types';
import { useGameSound } from '@/hooks/useGameSound';
import { useReservations, recordCompletedPurchase } from '@/store/useReservations';
import { supabase } from '@/lib/supabase';
import {
  X, Clock, MapPin, Check, Sparkles, Store as StoreIcon,
  AlertCircle, ArrowRight, ShieldCheck,
  MessageCircle, Copy, AlertTriangle, Users, CheckCircle2, Zap,
  Smartphone, ExternalLink, Loader2, QrCode, RefreshCw
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
  | 'PURCHASE_COMPLETED'
  | 'OUT_OF_STOCK';

export default function ProductBottomSheet({
  product,
  onClose,
  onSuccessUnlock,
  stores = [],
  tasa = 500,
}: Props) {
  const { playTap, playUnlockSuccess, playDustSnap, playRadarPing } = useGameSound();
  const { activeReservation, setActiveReservation, clearActiveReservation } = useReservations();

  // Estados del flujo paso a paso
  const [step, setStep] = useState<SheetStep>('SELECTION');
  const [selectedModality, setSelectedModality] = useState<'option_a' | 'option_b'>('option_a');
  const [stockConfirmationType, setStockConfirmationType] = useState<'green' | 'yellow'>('green');
  const [layawaySubStep, setLayawaySubStep] = useState<1 | 2>(1);
  const [isUserBlocked, setIsUserBlocked] = useState<boolean>(false);
  const [userBlockReason, setUserBlockReason] = useState<string>('');
  
  // Datos del producto y variante
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerCedula, setCustomerCedula] = useState<string>('');
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

  // Estados de Pago Automatizado SPIDI (Desbloqueo 5%)
  const [spidiLoading, setSpidiLoading] = useState<boolean>(false);
  const [spidiSession, setSpidiSession] = useState<{
    sessionId: string;
    paymentUrl: string;
    paymentQr?: string;
    amountUsd: number;
  } | null>(null);
  const [spidiPaid, setSpidiPaid] = useState<boolean>(false);
  const [spidiBankRef, setSpidiBankRef] = useState<string>('');
  const [showManualAuraPay, setShowManualAuraPay] = useState<boolean>(false);

  // Estados de Pago Automatizado SPIDI (Abono 30% Tienda)
  const [spidiStoreLoading, setSpidiStoreLoading] = useState<boolean>(false);
  const [spidiStoreSession, setSpidiStoreSession] = useState<{
    sessionId: string;
    paymentUrl: string;
    paymentQr?: string;
    amountUsd: number;
  } | null>(null);
  const [spidiStorePaid, setSpidiStorePaid] = useState<boolean>(false);
  const [spidiStoreBankRef, setSpidiStoreBankRef] = useState<string>('');
  const [showManualStorePay, setShowManualStorePay] = useState<boolean>(false);

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
      const savedCedula = localStorage.getItem('aura_customer_cedula') || '';
      const savedPhone = localStorage.getItem('aura_customer_phone') || '';
      if (savedName) setCustomerName(savedName);
      if (savedCedula) setCustomerCedula(savedCedula);
      if (savedPhone) setCustomerPhone(savedPhone);
    }

    // Reanudar proceso si ya había una reserva activa para este producto
    if (activeReservation && (activeReservation.product_id === product.id || activeReservation.product_name === product.name)) {
      setActiveRes(activeReservation);
      if (activeReservation.pin || activeReservation.pin_code) {
        setGeneratedPin(activeReservation.pin || activeReservation.pin_code || '');
      }
      if (activeReservation.requested_modality) {
        setSelectedModality(activeReservation.requested_modality);
      } else if (activeReservation.payment_type === 'apartado_7d' || activeReservation.payment_type === 'apartado_15d') {
        setSelectedModality('option_b');
      }

      const isApartadoType =
        activeReservation.payment_type === 'apartado_7d' ||
        activeReservation.payment_type === 'apartado_15d' ||
        activeReservation.current_step === 'OPTION_B_LAYAWAY' ||
        activeReservation.current_step === 'OPTION_B_CONFIRMED';

      if (isApartadoType) {
        if (activeReservation.payment_reference) {
          setStep('OPTION_B_CONFIRMED');
        } else {
          setStep('OPTION_B_LAYAWAY');
          // Verificar si el paso 1 ya fue pagado para restaurar exactamente el paso
          const isFeePaid =
            activeReservation.aura_fee_status === 'paid' ||
            activeReservation.spidi_status === 'paid' ||
            Boolean(activeReservation.aura_fee_reference && activeReservation.aura_fee_reference !== 'Pendiente');

          if (isFeePaid) {
            setSpidiPaid(true);
            setSpidiBankRef(activeReservation.spidi_bank_reference || activeReservation.aura_fee_reference || '');
            setLayawaySubStep(2);
          } else {
            setLayawaySubStep(1);
          }
        }
      } else if (activeReservation.payment_type === 'reserva_3h') {
        setStep('OPTION_A_TICKET');
      } else if (activeReservation.status === 'confirmed' || activeReservation.status === 'confirmada') {
        setStockConfirmationType('green');
        setStep('STOCK_CONFIRMED');
      } else if (activeReservation.status === 'ultimo_par') {
        setStockConfirmationType('yellow');
        setStep('STOCK_CONFIRMED');
      } else if (activeReservation.status === 'pending' || activeReservation.status === 'PENDING_STOCK_CHECK') {
        setStep('WAITING_VERIFICATION');
      }
    } else {
      setStep('SELECTION');
      setActiveRes(null);
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
          const cedula = user.user_metadata?.id_doc || '';
          if (cedula && !customerCedula) setCustomerCedula(cedula);

          const { data: prof } = await supabase
            .from('profiles')
            .select('wallet_credit_usd, id_doc, is_blocked, block_reason')
            .eq('id', user.id)
            .maybeSingle();

          if (prof?.id_doc && !customerCedula) {
            setCustomerCedula(prof.id_doc);
          }

          if (prof?.is_blocked) {
            setIsUserBlocked(true);
            setUserBlockReason(prof.block_reason || 'Cuenta suspendida preventivamente por impago o retraso en apartados.');
          }

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
  }, [product, activeReservation]);

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
    if (isUserBlocked) {
      alert(userBlockReason || 'Tu cuenta está temporalmente suspendida por impago o retraso. Comunícate con soporte de Aura.');
      return;
    }
    if (!customerName.trim()) {
      alert('Por favor ingresa tu nombre y apellido para el mostrador.');
      return;
    }
    if (!customerCedula.trim()) {
      alert('Por favor ingresa tu cédula o documento de identidad.');
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
      localStorage.setItem('aura_customer_cedula', customerCedula.trim());
      localStorage.setItem('aura_customer_phone', customerPhone.trim());
    }

    // PIN interno de trazabilidad para cumplir con restricción NOT NULL en BD y permitir seguimiento en mostrador
    const trackingPin = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedPin(trackingPin);

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

    const fullCustomerName = `${customerName.trim()} [CI: ${customerCedula.trim()}]`;

    const newReservation: Reservation = {
      id: `res-${Date.now()}`,
      user_id: uid || undefined,
      pin: trackingPin,
      pin_code: trackingPin,
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
      customer_name: fullCustomerName,
      customer_phone: customerPhone.trim(),
      status: 'pending',
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      requested_modality: selectedModality,
    };

    setActiveRes(newReservation);
    setActiveReservation(newReservation);

    // 1. Guardar la solicitud en Supabase para que llegue a Mostrador y Dashboard
    try {
      const { data: dbRes, error: insertError } = await supabase
        .from('reservations')
        .insert([{
          pin_code: trackingPin,
          store_id: effectiveStoreId,
          product_id: effectiveProductId,
          customer_name: fullCustomerName,
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
          pin: dbRes.pin_code || trackingPin,
          pin_code: dbRes.pin_code || trackingPin,
          status: dbRes.status || 'pending',
          requested_modality: selectedModality,
        };
        setActiveRes(finalReservation);
        setActiveReservation(finalReservation);
      }
    } catch (err) {
      console.warn('Registro local de reserva activo:', err);
    } finally {
      setIsSubmitting(false);
    }

    // Sonido suave de sonar de radar mientras el comercio revisa el estante
    playRadarPing();
  };

  // Verificación / Simulación inmediata de estante para pruebas en vivo
  const handleConfirmStockSimulated = async (type: 'green' | 'yellow' = 'green') => {
    playUnlockSuccess();
    setStockConfirmationType(type);
    setStep('STOCK_CONFIRMED');

    if (activeRes) {
      const updated: Reservation = {
        ...activeRes,
        status: type === 'yellow' ? 'ultimo_par' : 'confirmed',
      };
      setActiveRes(updated);
      setActiveReservation(updated);

      try {
        const isValidUUID = Boolean(activeRes.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeRes.id));
        const query = supabase
          .from('reservations')
          .update({ status: type === 'yellow' ? 'ultimo_par' : 'confirmed' });
        if (isValidUUID) {
          await query.eq('id', activeRes.id);
        } else if (activeRes.pin_code || activeRes.pin) {
          await query.eq('pin_code', activeRes.pin_code || activeRes.pin);
        }
      } catch {}
    }
  };

  // ==============================================================================
  // PASO 3: ESCUCHA EN TIEMPO REAL DEL SEMÁFORO Y VALIDACIÓN EN CAJA
  // ==============================================================================
  useEffect(() => {
    if (!activeRes) return;
    if (
      step !== 'WAITING_VERIFICATION' &&
      step !== 'OPTION_A_TICKET' &&
      step !== 'OPTION_B_LAYAWAY' &&
      step !== 'OPTION_B_CONFIRMED'
    ) {
      return;
    }

    const resId = activeRes.id;
    const targetPin = activeRes.pin_code || activeRes.pin;
    const isValidUUID = Boolean(resId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resId));

    const handleStateUpdate = (status: string, dbData?: any) => {
      // 1. SI LA CAJA O MOSTRADOR COBRÓ Y ENTREGÓ EL PRODUCTO
      if (status === 'completed' || status === 'COMPLETED_IN_STORE' || status === 'completada') {
        playUnlockSuccess();
        const completedRes = dbData ? { ...activeRes, ...dbData } : activeRes;
        
        // Guardar en historial de compras completadas (con deduplicación estricta por PIN)
        try {
          recordCompletedPurchase({
            ...completedRes,
            status: 'COMPLETED_IN_STORE',
            completed_at: new Date().toISOString(),
          });

          // Aumentar +10 Puntos de Confianza
          const currentScore = Number(localStorage.getItem('aura_trust_score')) || 100;
          const newScore = Math.min(200, currentScore + 10);
          localStorage.setItem('aura_trust_score', String(newScore));

          window.dispatchEvent(new CustomEvent('aura_trust_score_updated', { detail: { score: newScore } }));
          window.dispatchEvent(new CustomEvent('aura_ticket_completed', { detail: { reservation: completedRes } }));
        } catch {}

        clearActiveReservation(resId || targetPin);
        handleClose();
        return;
      }

      // 2. SI ESTÁBAMOS ESPERANDO EL SEMÁFORO DE DISPONIBILIDAD
      else if (step === 'WAITING_VERIFICATION') {
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
    };

    // A. Suscripción Postgres Changes
    const channel = supabase
      .channel(`res_sheet_${targetPin || resId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'reservations', 
          filter: isValidUUID ? `id=eq.${resId}` : undefined 
        },
        (payload: { new?: Partial<Reservation> & Record<string, any> }) => {
          if (payload.new) {
            if (payload.new.pin_code === targetPin || payload.new.id === resId) {
              handleStateUpdate(payload.new.status || '', payload.new);
            }
          }
        }
      )
      .subscribe();

    // B. Sondeo de respaldo cada 2.5s
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
        if (data && data.status) {
          handleStateUpdate(data.status, data);
        }
      } catch {}
    }, 2500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [step, activeRes?.id, activeRes?.pin, activeRes?.pin_code, playUnlockSuccess, setActiveReservation, clearActiveReservation]);

  // ==============================================================================
  // SPIDI: INICIAR SESIÓN Y ESCUCHAR CONFIRMACIÓN EN TIEMPO REAL
  // ==============================================================================
  const handleCreateSpidiPayment = async () => {
    if (spidiLoading || spidiPaid || !product) return;
    setSpidiLoading(true);
    playTap();

    try {
      const pinToUse = generatedPin || activeRes?.pin_code || activeRes?.pin || '';
      const res = await fetch('/api/spidi/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: activeRes?.id,
          pin: pinToUse,
          amountUsd: auraUnlockFeeUSD,
          productName: product.name,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo iniciar la pasarela de pago SPIDI.');
      }

      setSpidiSession({
        sessionId: data.sessionId,
        paymentUrl: data.paymentUrl,
        paymentQr: data.paymentQr,
        amountUsd: data.amountUsd,
      });
    } catch (err: any) {
      alert(err.message || 'Error al conectar con la pasarela de pagos SPIDI.');
    } finally {
      setSpidiLoading(false);
    }
  };

  // Comprobación manual o simulación para Paso 1 (5% Desbloqueo Aura)
  const handleCheckSpidiStatusManual = async (simulate = false) => {
    if (!spidiSession?.sessionId || spidiPaid) return;
    setSpidiLoading(true);
    try {
      const url = `/api/spidi/status?sessionId=${encodeURIComponent(spidiSession.sessionId)}${simulate ? '&simulate=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.isPaid) {
          setSpidiPaid(true);
          const ref = data.bankReferenceId || `SPIDI-${spidiSession.sessionId.slice(-6).toUpperCase()}`;
          setSpidiBankRef(ref);
          setPagoMovilAuraRef(ref);
          playUnlockSuccess();
        } else if (!simulate) {
          alert('Aún no detectamos la transferencia en la red bancaria. Si acabas de pagar, espera unos segundos y vuelve a presionar comprobar.');
        }
      }
    } catch {
      if (!simulate) alert('Error temporal al consultar estado bancario.');
    } finally {
      setSpidiLoading(false);
    }
  };

  useEffect(() => {
    if (!spidiSession?.sessionId || spidiPaid) return;

    const checkSpidiStatus = async () => {
      try {
        const res = await fetch(`/api/spidi/status?sessionId=${encodeURIComponent(spidiSession.sessionId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isPaid) {
            setSpidiPaid(true);
            const ref = data.bankReferenceId || `SPIDI-${spidiSession.sessionId.slice(-6).toUpperCase()}`;
            setSpidiBankRef(ref);
            setPagoMovilAuraRef(ref);
            playUnlockSuccess();
          }
        }
      } catch {}
    };

    // Escuchar retorno de pestaña o aplicación de banco
    const handleFocus = () => { checkSpidiStatus(); };
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkSpidiStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    const pollInterval = setInterval(checkSpidiStatus, 2500);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [spidiSession?.sessionId, spidiPaid, playUnlockSuccess]);

  // Auto-avanzar al Paso 2 cuando el Paso 1 es aprobado con éxito
  useEffect(() => {
    if (spidiPaid && layawaySubStep === 1) {
      const timer = setTimeout(() => {
        setLayawaySubStep(2);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [spidiPaid, layawaySubStep]);

  // ==============================================================================
  // SPIDI: INICIAR SESIÓN Y ESCUCHAR CONFIRMACIÓN PARA ABONO TIENDA (PASO 2)
  // ==============================================================================
  const handleCreateSpidiStorePayment = async () => {
    if (spidiStoreLoading || spidiStorePaid || !product) return;
    setSpidiStoreLoading(true);
    playTap();

    try {
      const pinToUse = generatedPin || activeRes?.pin_code || activeRes?.pin || '';
      const res = await fetch('/api/spidi/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: activeRes?.id,
          pin: pinToUse,
          amountUsd: deposit30USD,
          productName: product.name,
          feeType: 'store_deposit',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo iniciar la pasarela de pago para la tienda.');
      }

      setSpidiStoreSession({
        sessionId: data.sessionId,
        paymentUrl: data.paymentUrl,
        paymentQr: data.paymentQr,
        amountUsd: data.amountUsd,
      });
    } catch (err: any) {
      alert(err.message || 'Error al conectar con la pasarela de pagos.');
    } finally {
      setSpidiStoreLoading(false);
    }
  };

  // Comprobación manual o simulación para Paso 2 (Abono 30% Tienda)
  const handleCheckSpidiStoreStatusManual = async (simulate = false) => {
    if (!spidiStoreSession?.sessionId || spidiStorePaid) return;
    setSpidiStoreLoading(true);
    try {
      const url = `/api/spidi/status?sessionId=${encodeURIComponent(spidiStoreSession.sessionId)}${simulate ? '&simulate=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.isPaid) {
          setSpidiStorePaid(true);
          const ref = data.bankReferenceId || `SPIDI-${spidiStoreSession.sessionId.slice(-6).toUpperCase()}`;
          setSpidiStoreBankRef(ref);
          setPagoMovilRef(ref);
          playUnlockSuccess();
        } else if (!simulate) {
          alert('Aún no detectamos la transferencia del abono a la tienda. Si acabas de pagar, espera unos segundos y vuelve a comprobar.');
        }
      }
    } catch {
      if (!simulate) alert('Error temporal al consultar abono a la tienda.');
    } finally {
      setSpidiStoreLoading(false);
    }
  };

  useEffect(() => {
    if (!spidiStoreSession?.sessionId || spidiStorePaid) return;

    const checkStoreStatus = async () => {
      try {
        const res = await fetch(`/api/spidi/status?sessionId=${encodeURIComponent(spidiStoreSession.sessionId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isPaid) {
            setSpidiStorePaid(true);
            const ref = data.bankReferenceId || `SPIDI-${spidiStoreSession.sessionId.slice(-6).toUpperCase()}`;
            setSpidiStoreBankRef(ref);
            setPagoMovilRef(ref);
            playUnlockSuccess();
          }
        }
      } catch {}
    };

    const handleFocus = () => { checkStoreStatus(); };
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkStoreStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    const pollInterval = setInterval(checkStoreStatus, 2500);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [spidiStoreSession?.sessionId, spidiStorePaid, playUnlockSuccess]);

  // ==============================================================================
  // PASO 4A: ELECCIÓN CLIENTE -> OPCIÓN A (IR HOY MISMO - TICKET QR GRATIS 3 HORAS)
  // ==============================================================================
  const handleSelectOptionA = async () => {
    playTap();
    if (!activeRes) return;

    // Generar PIN oficial de retiro en este momento (no antes)
    const officialPin = activeRes.pin_code && activeRes.pin_code.length === 4
      ? activeRes.pin_code
      : Math.floor(1000 + Math.random() * 9000).toString();

    setGeneratedPin(officialPin);

    const updatedRes: Reservation = {
      ...activeRes,
      pin: officialPin,
      pin_code: officialPin,
      status: 'confirmed',
      payment_method: 'en_tienda',
      payment_type: 'reserva_3h',
      unlock_fee_usd: 0,
      store_pay_balance_usd: auraPrice,
      current_step: 'OPTION_A_TICKET',
    };

    setActiveRes(updatedRes);
    setActiveReservation(updatedRes);
    setStep('OPTION_A_TICKET');
    playUnlockSuccess();
    onSuccessUnlock();

    // Actualizar en Supabase de forma segura con columnas nativas garantizadas
    const resId = activeRes.id;
    const isValidUUID = Boolean(resId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resId));

    try {
      const guaranteedUpdate = {
        status: 'confirmed',
        pin_code: officialPin,
        unlock_fee_usd: 0,
        store_pay_balance_usd: auraPrice,
      };

      const query = isValidUUID
        ? supabase.from('reservations').update(guaranteedUpdate).eq('id', resId)
        : supabase.from('reservations').update(guaranteedUpdate).eq('pin_code', officialPin);

      const { error: gErr } = await query;

      if (gErr) {
        console.warn('Fallback a actualizacion core de status confirmed:', gErr.message);
        const coreUpdate = {
          status: 'confirmed',
          pin_code: officialPin,
        };
        if (isValidUUID) {
          await supabase.from('reservations').update(coreUpdate).eq('id', resId);
        }
      }
    } catch (err) {
      console.error('Error actualizando Supabase en handleSelectOptionA:', err);
      try {
        const coreUpdate = { status: 'confirmed', pin_code: officialPin };
        if (isValidUUID) await supabase.from('reservations').update(coreUpdate).eq('id', resId);
      } catch {}
    }
  };

  // Cancelar orden o apartado en cualquier punto del flujo
  const handleCancelOrder = async () => {
    if (!activeRes) {
      handleClose();
      return;
    }

    const isStep1Paid =
      spidiPaid ||
      activeRes.aura_fee_status === 'paid' ||
      activeRes.spidi_status === 'paid' ||
      Boolean(activeRes.aura_fee_reference && activeRes.aura_fee_reference !== 'Pendiente');

    const promptMessage = isStep1Paid
      ? `¿Deseas cancelar este apartado? La tarifa del 5% pagada ($${auraUnlockFeeUSD.toFixed(2)} USD) se acreditará de inmediato a tu Billetera Aura.`
      : '¿Deseas cancelar esta solicitud? El producto será liberado para la tienda.';

    if (!confirm(promptMessage)) return;

    setIsSubmitting(true);
    playTap();

    try {
      const resId = activeRes.id;
      const targetPin = activeRes.pin_code || activeRes.pin;
      const isValidUUID = Boolean(resId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resId));

      if (isStep1Paid) {
        const feeToRefund = activeRes.unlock_fee_usd || auraUnlockFeeUSD || Number((auraPrice * 0.05).toFixed(2));
        let userId = currentUserId || activeRes.user_id;
        if (!userId) {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id;
        }

        if (userId) {
          const { data: prof } = await supabase.from('profiles').select('wallet_credit_usd').eq('id', userId).maybeSingle();
          const currentCredit = Number(prof?.wallet_credit_usd || 0);
          const newCredit = Number((currentCredit + feeToRefund).toFixed(2));

          await supabase.from('profiles').update({ wallet_credit_usd: newCredit }).eq('id', userId);
          setUserWalletCredit(newCredit);
        }

        const fullUpdate = {
          status: 'cancelled',
          aura_fee_status: 'refunded_to_wallet',
          notes: `Cancelado por el cliente en Paso 2. Se acreditaron $${feeToRefund.toFixed(2)} USD a su Billetera Aura.`
        };

        const query = isValidUUID
          ? supabase.from('reservations').update(fullUpdate).eq('id', resId)
          : supabase.from('reservations').update(fullUpdate).eq('pin_code', targetPin);

        const { error: cancelErr } = await query;
        if (cancelErr) {
          const coreUpdate = {
            status: 'cancelled',
          };
          if (isValidUUID) await supabase.from('reservations').update(coreUpdate).eq('id', resId);
          if (targetPin) await supabase.from('reservations').update(coreUpdate).eq('pin_code', targetPin);
        } else if (isValidUUID && targetPin) {
          await supabase.from('reservations').update({ status: 'cancelled' }).eq('pin_code', targetPin);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('aura_wallet_updated'));
          window.dispatchEvent(new CustomEvent('aura_trust_score_updated'));
        }

        alert(`✓ Apartado cancelado. Se han acreditado $${feeToRefund.toFixed(2)} USD a tu Billetera Aura.`);
      } else {
        const fullUpdate = {
          status: 'cancelled',
          notes: 'Cancelado por el cliente antes de concretar la reserva'
        };

        const query = isValidUUID
          ? supabase.from('reservations').update(fullUpdate).eq('id', resId)
          : supabase.from('reservations').update(fullUpdate).eq('pin_code', targetPin);

        const { error: cancelErr } = await query;
        if (cancelErr) {
          const coreUpdate = { status: 'cancelled' };
          if (isValidUUID) await supabase.from('reservations').update(coreUpdate).eq('id', resId);
          if (targetPin) await supabase.from('reservations').update(coreUpdate).eq('pin_code', targetPin);
        } else if (isValidUUID && targetPin) {
          await supabase.from('reservations').update(fullUpdate).eq('pin_code', targetPin);
        }

        alert('Has cancelado la solicitud. El producto ha sido liberado.');
      }
    } catch (err: any) {
      console.warn('Error cancelando reserva:', err);
    } finally {
      setIsSubmitting(false);
      clearActiveReservation(activeRes.id || activeRes.pin_code || activeRes.pin);
      handleClose();
    }
  };

  // ==============================================================================
  // PASO 4B: ELECCIÓN CLIENTE -> OPCIÓN B (APARTADO DIGITAL 7 DÍAS - PASO 1 Y 2)
  // ==============================================================================
  const handleSelectOptionB = async () => {
    playTap();
    if (activeRes) {
      const updatedRes: Reservation = {
        ...activeRes,
        payment_type: 'apartado_7d',
        current_step: 'OPTION_B_LAYAWAY',
      };
      setActiveRes(updatedRes);
      setActiveReservation(updatedRes);
    }
    setLayawaySubStep(1);
    setStep('OPTION_B_LAYAWAY');
  };

  const handleConfirmApartadoPagoMovil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !activeRes) return;
    if (!pagoMovilRef.trim() && !spidiStorePaid) {
      alert('Por favor realiza el pago del abono a la tienda con SPIDI o ingresa el número de referencia.');
      return;
    }
    if (!spidiPaid && !payAuraWithWallet && !pagoMovilAuraRef.trim()) {
      alert('Por favor completa el arancel de desbloqueo a Aura (5%).');
      return;
    }

    playTap();

    const finalStoreRef = pagoMovilRef.trim() || spidiStoreBankRef || 'SPIDI-CONFIRMADO';

    // Generar PIN oficial de retiro en este momento (no antes)
    const officialPin = activeRes.pin_code && activeRes.pin_code.length === 4
      ? activeRes.pin_code
      : Math.floor(1000 + Math.random() * 9000).toString();

    setGeneratedPin(officialPin);

    const updatedRes: Reservation = {
      ...activeRes,
      pin: officialPin,
      pin_code: officialPin,
      status: 'confirmed',
      payment_method: 'pago_movil',
      payment_type: 'apartado_7d',
      payment_reference: finalStoreRef,
      unlock_fee_usd: auraUnlockFeeUSD,
      aura_fee_reference: pagoMovilAuraRef.trim() || (payAuraWithWallet ? 'BILLETERA' : ''),
      aura_fee_status: spidiPaid || payAuraWithWallet ? 'paid' : 'pending',
      spidi_session_id: spidiSession?.sessionId || undefined,
      spidi_status: spidiPaid ? 'paid' : undefined,
      spidi_bank_reference: spidiBankRef || undefined,
      initial_deposit: deposit30USD,
      store_pay_balance_usd: remaining70USD,
      current_step: 'OPTION_B_CONFIRMED',
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

    // Actualizar en Supabase de forma segura con columnas nativas garantizadas
    try {
      const resId = activeRes.id;
      const targetPin = activeRes.pin_code || activeRes.pin || officialPin;
      const isValidUUID = Boolean(resId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resId));

      const guaranteedUpdate: Record<string, any> = {
        status: 'confirmed',
        pin_code: officialPin,
        customer_phone: `${customerPhone.trim()} [REF: #${finalStoreRef}]`,
        unlock_fee_usd: auraUnlockFeeUSD,
        store_pay_balance_usd: remaining70USD,
      };

      if (isValidUUID) {
        const { error: gErr } = await supabase.from('reservations').update(guaranteedUpdate).eq('id', resId);
        if (gErr) {
          console.warn('Fallback a actualizacion minima por id en handleConfirmApartadoPagoMovil:', gErr.message);
          await supabase.from('reservations').update({ status: 'confirmed', pin_code: officialPin }).eq('id', resId);
        }
      }

      const pinsToTry = Array.from(new Set([targetPin, officialPin, activeRes.pin_code, activeRes.pin].filter(Boolean).map(String)));
      for (const p of pinsToTry) {
        try {
          const { error: pErr } = await supabase.from('reservations').update(guaranteedUpdate).eq('pin_code', p);
          if (pErr) {
            await supabase.from('reservations').update({ status: 'confirmed', pin_code: officialPin }).eq('pin_code', p);
          }
        } catch {}
      }
    } catch (err) {
      console.warn('Error actualizando reserva en Supabase:', err);
    }

    // Enviar mensaje directo por WhatsApp a la tienda (Solo información de la tienda, privacidad estricta Aura)
    try {
      const waText = encodeURIComponent(
        `Hola ${storeName}, acabo de realizar el apartado digital para "${product.name}" (${selectedVariant}).\n` +
        `Código de Boleto: #${officialPin}\n` +
        `Referencia Pago Móvil Inicial (30%): ${finalStoreRef} (Bs. ${deposit30VES.toLocaleString('es-VE')} / $${deposit30USD} USD).\n` +
        `Saldo restante a pagar al retirar en depósito: $${remaining70USD} USD (Válido por 7 días).`
      );
      window.open(`https://wa.me/${storePhoneRaw.startsWith('58') ? storePhoneRaw : `58${storePhoneRaw}`}?text=${waText}`, '_blank');
    } catch {}
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
            className="relative w-full max-w-lg bg-[#040913]/95 border-t border-slate-800 rounded-t-3xl sm:rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.85)] p-5 sm:p-6 max-h-[90vh] overflow-y-auto no-scrollbar z-10"
          >
            {/* Reflejo especular superior fino */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-600/30 to-transparent" />

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
                              ? 'bg-slate-800 text-white border-slate-600 scale-105'
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

              {/* Precios: Regular o Descuento si aplica */}
              <div className="bg-[#050b16] border border-slate-800/80 rounded-2xl p-3.5 space-y-2 shadow-inner">
                {regularPrice > auraPrice && (product.has_discount || (product.discount_percent && product.discount_percent > 0)) ? (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Precio Regular en Tienda:</span>
                      <span className="line-through text-slate-500 font-bold">${regularPrice.toFixed(2)} USD</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">Precio Oferta Relámpago:</span>
                        <span className="text-[10px] text-emerald-400">Descuento aplicado</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-[#00ffb2]">${auraPrice.toFixed(2)} USD</span>
                        <span className="block text-[10px] text-slate-400 font-mono">≈ Bs. {totalVES.toLocaleString('es-VE')}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Precio del Producto:</span>
                      <span className="text-[10px] text-emerald-400">Precio de vitrina en tienda</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-[#00ffb2]">${auraPrice.toFixed(2)} USD</span>
                      <span className="block text-[10px] text-slate-400 font-mono">≈ Bs. {totalVES.toLocaleString('es-VE')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Formulario de Contacto para el Mostrador */}
              <div className="space-y-2.5 pt-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Tus Datos para el Mostrador (Sin Registro Obligatorio):
                </span>
                
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Tu Nombre y Apellido"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="p-3 bg-[#030712] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-slate-600"
                    />

                    <input
                      type="text"
                      required
                      placeholder="Cédula (ej. V-12345678)"
                      value={customerCedula}
                      onChange={(e) => setCustomerCedula(e.target.value)}
                      className="p-3 bg-[#030712] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-slate-600"
                    />
                  </div>

                  <input
                    type="tel"
                    required
                    placeholder="Teléfono / WhatsApp de Retiro (0414...)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full p-3 bg-[#030712] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-slate-600"
                  />
                </div>
              </div>

              {/* Alerta de Usuario Bloqueado por Impago */}
              {isUserBlocked && (
                <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-left space-y-1 animate-pulse">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                    <AlertTriangle size={15} />
                    <span>Cuenta Suspendida por Aura Central</span>
                  </div>
                  <p className="text-[11px] text-red-200/90 leading-relaxed">
                    {userBlockReason || 'Tienes una sanción activa por impago o retraso en apartados anteriores. Contacta a soporte para regularizar tu estatus.'}
                  </p>
                </div>
              )}

              {/* Botón Principal: Verificar disponibilidad en tienda */}
              <button
                type="button"
                disabled={isSubmitting || isUserBlocked}
                onClick={handleRequestAvailability}
                className={`game-sweep w-full cursor-pointer bg-gradient-to-r ${
                  isUserBlocked
                    ? 'from-slate-700 to-slate-800 text-slate-400 opacity-60 cursor-not-allowed'
                    : 'from-emerald-500 via-[#00ffb2] to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-95'
                } font-black py-4 px-6 rounded-2xl text-sm transition flex flex-col items-center justify-center gap-0.5 mt-2`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} />
                  <span>Verificar disponibilidad en tienda</span>
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
                <span className="absolute w-full h-full rounded-full border border-slate-700/30 animate-ping" />
                <span className="absolute w-20 h-20 rounded-full border border-slate-700/50 animate-pulse" />
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center shadow-lg">
                  <Clock size={28} className="animate-spin text-slate-300" />
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
                <span>Esperando respuesta del comercio...</span>
              </div>

              <div className="flex flex-col items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="flex items-center justify-center gap-1.5 text-xs text-rose-400/90 hover:text-rose-300 transition py-2 px-4 rounded-xl border border-rose-950/60 bg-rose-950/20 hover:bg-rose-950/40 cursor-pointer"
                >
                  <X size={14} />
                  <span>Cancelar solicitud</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep('SELECTION')}
                  className="text-[11px] text-slate-500 hover:text-slate-300 underline cursor-pointer transition font-light"
                >
                  Volver a la selección de variante
                </button>
              </div>
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
                <div className="p-4 bg-[#050c18] border border-slate-800 rounded-2xl flex items-center gap-3 text-slate-200">
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
                  className={`cursor-pointer group relative overflow-hidden bg-[#050c18] hover:bg-[#071326] border rounded-2xl p-4 transition active:scale-98 shadow-md ${
                    selectedModality === 'option_a'
                      ? 'border-slate-600 ring-1 ring-slate-600'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-emerald-400 border border-slate-800">
                          Opción A • Gratis
                        </span>
                        <span className="text-xs font-bold text-white">Ir hoy mismo a la tienda</span>
                      </div>
                      <p className="text-xs text-slate-300 font-light leading-relaxed">
                        Recibe un <strong>Ticket QR válido por 3 horas</strong> para ir al local, revisar el producto con calma y pagarlo completo en caja.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-white block">$0.00 Ahora</span>
                      <span className="text-[10px] text-slate-400 block">${auraPrice.toFixed(2)} en caja</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-3 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-800 cursor-pointer"
                  >
                    <span>Generar Ticket QR de 3 Horas (Gratis)</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* OPCIÓN B: APARTADO DIGITAL (CASHEA INVERSO 7 DÍAS) */}
                <div
                  onClick={handleSelectOptionB}
                  className={`cursor-pointer group relative overflow-hidden bg-[#070b18] hover:bg-[#0c1228] border rounded-2xl p-4 transition active:scale-98 shadow-md ${
                    selectedModality === 'option_b'
                      ? 'border-indigo-500/60 ring-1 ring-indigo-500/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Opción B • 7 Días
                        </span>
                        <span className="text-xs font-bold text-white">Apartado Digital (Cashea Inverso)</span>
                      </div>
                      <p className="text-xs text-slate-300 font-light leading-relaxed">
                        Asegúralo con el <strong>5% de desbloqueo Aura (${auraUnlockFeeUSD})</strong> y el <strong>30% inicial (${deposit30USD})</strong> al comercio. La tienda lo resguarda en depósito por <strong>7 días</strong> hasta que retires y pagues el 70% restante.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-indigo-300 block">30% Inicial</span>
                      <span className="text-[10px] text-slate-400 block">${deposit30USD} USD</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-3 w-full bg-indigo-500/20 group-hover:bg-indigo-600 text-indigo-200 group-hover:text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-indigo-500/40 cursor-pointer"
                  >
                    <span>Iniciar Apartado Digital por 7 Días (Paso 1 de 2)</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* BOTÓN CANCELAR SOLICITUD ANTES DE ELEGIR */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleCancelOrder}
                    className="text-xs text-slate-500 hover:text-rose-400 underline transition cursor-pointer font-light inline-flex items-center gap-1"
                  >
                    <X size={13} />
                    <span>Cancelar solicitud y liberar este producto</span>
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-slate-800">
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
              <div className="bg-[#030812] border border-slate-800 rounded-3xl p-5 max-w-xs mx-auto space-y-3 shadow-inner">
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
                    Apartado Digital • 7 Días
                  </span>
                  <h3 className="text-base font-black text-white">
                    Asegura tu producto en depósito
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (layawaySubStep === 2) {
                      setLayawaySubStep(1);
                    } else {
                      setStep('STOCK_CONFIRMED');
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  {layawaySubStep === 2 ? '← Volver al Paso 1' : 'Volver a opciones'}
                </button>
              </div>

              {/* Indicador de progreso paso por paso */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <button
                  type="button"
                  onClick={() => setLayawaySubStep(1)}
                  className={`p-2 rounded-xl border transition cursor-pointer text-left ${
                    layawaySubStep === 1
                      ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                      : 'bg-[#030812] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold text-emerald-400 block">Paso 1</span>
                  <span className="text-xs font-bold block truncate">1. Desbloqueo Aura (5%)</span>
                  <span className="text-[10px] font-mono text-emerald-300">${auraUnlockFeeUSD.toFixed(2)} USD</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (payAuraWithWallet || pagoMovilAuraRef.trim()) {
                      setLayawaySubStep(2);
                    }
                  }}
                  className={`p-2 rounded-xl border transition cursor-pointer text-left ${
                    layawaySubStep === 2
                      ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                      : 'bg-[#030812] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold text-indigo-400 block">Paso 2</span>
                  <span className="text-xs font-bold block truncate">2. Inicial Tienda (30%)</span>
                  <span className="text-[10px] font-mono text-indigo-300">${deposit30USD.toFixed(2)} USD</span>
                </button>
              </div>

              {/* SUB-PASO 1: PAGO DEL 5% DESBLOQUEO AURA */}
              {layawaySubStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-[#030812] border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5 text-xs sm:text-sm">
                        <Sparkles size={15} className="text-emerald-400" />
                        Paso 1: Desbloqueo y Custodia Aura (5%)
                      </span>
                      <span className="font-black text-white text-sm sm:text-base">${auraUnlockFeeUSD.toFixed(2)} USD</span>
                    </div>

                    <p className="text-[11px] text-slate-300 font-light leading-relaxed">
                      Este pequeño arancel congela el precio en sistema y custodia tu turno durante los 7 días de apartado.
                    </p>

                    {/* ESTADO: YA PAGADO VIA SPIDI (COMPROBANTE OFICIAL) */}
                    {spidiPaid ? (
                      <div className="p-4 bg-[#020508] border border-emerald-500/40 rounded-2xl space-y-3 animate-in zoom-in-95">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-[#00ffb2] flex items-center justify-center">
                              <CheckCircle2 size={18} />
                            </div>
                            <div>
                              <span className="text-xs font-black text-white block">Comprobante de Pago Bancario</span>
                              <span className="text-[10px] text-emerald-400 font-medium">Aprobado en Red Bancaria SPIDI</span>
                            </div>
                          </div>
                          <span className="text-sm font-black text-[#00ffb2]">${auraUnlockFeeUSD.toFixed(2)} USD</span>
                        </div>

                        <div className="space-y-1.5 text-[11px] bg-slate-900/70 p-3 rounded-xl border border-slate-800 font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Referencia Bancaria:</span>
                            <span className="text-white font-bold">#{spidiBankRef}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Concepto:</span>
                            <span className="text-slate-200">Desbloqueo y Custodia Aura (5%)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Monto en Bolívares:</span>
                            <span className="text-emerald-400 font-bold">Bs. {auraUnlockFeeVES.toLocaleString('es-VE')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Estado:</span>
                            <span className="text-[#00ffb2] font-bold">Liquidado • Turno Protegido</span>
                          </div>
                        </div>
                      </div>
                    ) : spidiSession ? (
                      /* ESTADO: SESIÓN SPIDI ACTIVA (QR + ENLACE) */
                      <div className="p-3 bg-[#020508] border border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <QrCode size={15} className="text-[#00ffb2]" />
                            Escanea o paga en línea
                          </span>
                          <span className="text-xs font-black text-[#00ffb2]">${auraUnlockFeeUSD.toFixed(2)} USD</span>
                        </div>

                        {spidiSession.paymentQr && (
                          <div className="flex flex-col items-center py-1">
                            <img
                              src={spidiSession.paymentQr}
                              alt="QR de Pago SPIDI"
                              className="w-40 h-40 rounded-xl bg-white p-2 border border-slate-700 shadow-md"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 font-light">
                              Escanea con tu banco o app móvil
                            </span>
                          </div>
                        )}

                        <a
                          href={spidiSession.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                        >
                          <ExternalLink size={14} />
                          <span>Pagar en este teléfono (Pago Móvil / Débito)</span>
                        </a>

                        <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-300 bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-2.5">
                          <Loader2 size={13} className="animate-spin text-[#00ffb2]" />
                          <span>Esperando confirmación bancaria en tiempo real...</span>
                        </div>

                        {/* Botones de Comprobación y Simulación de Pruebas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCheckSpidiStatusManual(false)}
                            disabled={spidiLoading}
                            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw size={12} className={spidiLoading ? 'animate-spin text-[#00ffb2]' : ''} />
                            <span>Comprobar estado</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCheckSpidiStatusManual(true)}
                            className="w-full py-2 px-3 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 text-[11px] font-bold rounded-xl border border-emerald-700/50 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 size={12} className="text-[#00ffb2]" />
                            <span>Simular Aprobado (Pruebas)</span>
                          </button>
                        </div>

                        <div className="text-center pt-0.5">
                          <p className="text-[10px] text-slate-500 font-mono">
                            Desarrollado por SPIDI • Pagos Inmediatos
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* ESTADO: BOTÓN PRINCIPAL SPIDI */
                      <div className="space-y-3 pt-1">
                        <button
                          type="button"
                          onClick={handleCreateSpidiPayment}
                          disabled={spidiLoading}
                          className="w-full bg-gradient-to-r from-emerald-500 via-[#00ffb2] to-teal-400 hover:brightness-110 text-slate-950 font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm transition shadow-lg shadow-emerald-500/25 flex flex-col items-center justify-center gap-0.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            {spidiLoading ? (
                              <Loader2 size={16} className="animate-spin text-slate-950" />
                            ) : (
                              <Smartphone size={16} className="text-slate-950" />
                            )}
                            <span className="font-black text-sm">
                              {spidiLoading ? 'Generando pago seguro...' : 'Pagar con Pago Móvil o Débito'}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-900/80">
                            Desarrollado por SPIDI • Confirmación automática
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Billetera Aura si tiene saldo */}
                    {!spidiPaid && userWalletCredit >= auraUnlockFeeUSD && (
                      <label className="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={payAuraWithWallet}
                          onChange={(e) => setPayAuraWithWallet(e.target.checked)}
                          className="accent-emerald-400 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs text-emerald-200 font-bold">
                          Usar saldo de mi Billetera Aura (${userWalletCredit.toFixed(2)} USD disponible)
                        </span>
                      </label>
                    )}

                    {/* Alternativa de pago manual desplegable */}
                    {!spidiPaid && !payAuraWithWallet && (
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => setShowManualAuraPay(!showManualAuraPay)}
                          className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                        >
                          {showManualAuraPay ? 'Ocultar pago manual' : '¿Prefieres transferir manualmente por Pago Móvil?'}
                        </button>

                        {showManualAuraPay && (
                          <div className="space-y-3 pt-3 text-left animate-in fade-in">
                            <div className="p-3 bg-[#020508] border border-slate-850 rounded-xl space-y-1.5 text-[11px]">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Banco / Teléfono Aura:</span>
                                <span className="text-white font-mono font-bold">0102 BDV • 04140857379</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">RIF / Monto en Bs:</span>
                                <span className="text-[#00ffb2] font-mono font-black text-xs">J-50348291-0 • Bs. {auraUnlockFeeVES.toLocaleString('es-VE')}</span>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                type="button"
                                onClick={handleCopyAuraBankData}
                                className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer border border-slate-700"
                              >
                                <Copy size={13} />
                                <span>{copiedAuraBankData ? '¡Datos Copiados!' : 'Copiar Pago Móvil Aura'}</span>
                              </button>
                              <input
                                type="text"
                                placeholder="Nº Referencia Aura (últimos 4-6 dígitos)"
                                value={pagoMovilAuraRef}
                                onChange={(e) => setPagoMovilAuraRef(e.target.value)}
                                className="flex-1 p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-slate-600"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botón avanzar al paso 2 (solo visible cuando ya pagó o está ingresando datos manuales/billetera) */}
                  {(spidiPaid || payAuraWithWallet || Boolean(pagoMovilAuraRef.trim()) || showManualAuraPay || !spidiSession) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!spidiPaid && !payAuraWithWallet && !pagoMovilAuraRef.trim()) {
                          alert('Completa el pago del arancel con SPIDI, tu Billetera o ingresa la referencia de transferencia.');
                          return;
                        }
                        playTap();
                        setLayawaySubStep(2);
                      }}
                      disabled={!spidiPaid && !payAuraWithWallet && !pagoMovilAuraRef.trim()}
                      className="cursor-pointer w-full bg-gradient-to-r from-emerald-500 via-[#00ffb2] to-teal-400 hover:brightness-110 text-slate-950 font-black py-3.5 rounded-2xl text-xs transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40"
                    >
                      <span>Continuar al Paso 2: Abono 30% a la Tienda</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* SUB-PASO 2: ABONO 30% INICIAL AL COMERCIO */}
              {layawaySubStep === 2 && (
                <form onSubmit={handleConfirmApartadoPagoMovil} className="space-y-4 animate-in fade-in duration-150">
                  {/* Comprobante de Respaldo Paso 1 */}
                  {(spidiPaid || pagoMovilAuraRef.trim() || payAuraWithWallet) && (
                    <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 size={14} className="text-[#00ffb2]" />
                        Paso 1: Desbloqueo Aura Pagado
                      </span>
                      <span className="font-mono text-[11px] text-slate-300">
                        {spidiBankRef ? `Ref #${spidiBankRef}` : payAuraWithWallet ? 'Billetera' : `Ref #${pagoMovilAuraRef}`}
                      </span>
                    </div>
                  )}

                  <div className="bg-[#030812] border border-indigo-500/40 rounded-2xl p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs sm:text-sm">
                        <StoreIcon size={15} />
                        Paso 2: Abono 30% Inicial para {storeName}
                      </span>
                      <span className="font-black text-white text-sm sm:text-base">${deposit30USD.toFixed(2)} USD</span>
                    </div>

                    <p className="text-[11px] text-slate-300 font-light leading-relaxed">
                      Transfiere el 30% directo al comercio para apartar tu producto en su depósito. El 70% restante (${remaining70USD.toFixed(2)} USD) se liquida en caja al retirar dentro de los 7 días.
                    </p>

                    {/* ESTADO SPIDI TIENDA: YA PAGADO */}
                    {spidiStorePaid ? (
                      <div className="p-4 bg-indigo-950/40 border border-indigo-500/40 rounded-2xl space-y-2 text-center animate-in zoom-in-95">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center mx-auto">
                          <CheckCircle2 size={20} />
                        </div>
                        <p className="text-xs font-bold text-indigo-200">¡Abono a la Tienda Confirmado en Red Bancaria!</p>
                        <p className="text-[11px] text-slate-300 font-mono">Ref. Bancaria: #{spidiStoreBankRef}</p>
                      </div>
                    ) : spidiStoreSession ? (
                      /* ESTADO: SESIÓN SPIDI TIENDA ACTIVA (QR + ENLACE) */
                      <div className="p-3 bg-[#020508] border border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <QrCode size={15} className="text-indigo-400" />
                            Escanea o paga en línea
                          </span>
                          <span className="text-xs font-black text-indigo-300">${deposit30USD.toFixed(2)} USD</span>
                        </div>

                        {spidiStoreSession.paymentQr && (
                          <div className="flex flex-col items-center py-1">
                            <img
                              src={spidiStoreSession.paymentQr}
                              alt="QR de Pago SPIDI Tienda"
                              className="w-40 h-40 rounded-xl bg-white p-2 border border-slate-700 shadow-md"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 font-light">
                              Escanea con tu banco o app móvil
                            </span>
                          </div>
                        )}

                        <a
                          href={spidiStoreSession.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                        >
                          <ExternalLink size={14} />
                          <span>Pagar abono en este teléfono</span>
                        </a>

                        <div className="flex items-center justify-center gap-2 text-[11px] text-indigo-300 bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-2.5">
                          <Loader2 size={13} className="animate-spin text-indigo-400" />
                          <span>Esperando confirmación bancaria en tiempo real...</span>
                        </div>

                        {/* Botones de Comprobación y Simulación de Pruebas Tienda */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCheckSpidiStoreStatusManual(false)}
                            disabled={spidiStoreLoading}
                            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw size={12} className={spidiStoreLoading ? 'animate-spin text-indigo-400' : ''} />
                            <span>Comprobar abono</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCheckSpidiStoreStatusManual(true)}
                            className="w-full py-2 px-3 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 text-[11px] font-bold rounded-xl border border-indigo-700/50 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 size={12} className="text-indigo-400" />
                            <span>Simular Abono Aprobado (Pruebas)</span>
                          </button>
                        </div>

                        <div className="text-center pt-0.5">
                          <p className="text-[10px] text-slate-500 font-mono">
                            Desarrollado por SPIDI • Pagos Inmediatos
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* ESTADO: BOTÓN PRINCIPAL SPIDI TIENDA */
                      <div className="space-y-3 pt-1">
                        <button
                          type="button"
                          onClick={handleCreateSpidiStorePayment}
                          disabled={spidiStoreLoading}
                          className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:brightness-110 text-white font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm transition shadow-lg shadow-indigo-600/25 flex flex-col items-center justify-center gap-0.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            {spidiStoreLoading ? (
                              <Loader2 size={16} className="animate-spin text-white" />
                            ) : (
                              <Smartphone size={16} className="text-white" />
                            )}
                            <span className="font-black text-sm">
                              {spidiStoreLoading ? 'Generando pago seguro...' : 'Pagar Abono 30% con Pago Móvil o Débito'}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-indigo-200">
                            Desarrollado por SPIDI • Confirmación automática
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Alternativa de pago manual desplegable */}
                    {!spidiStorePaid && (
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => setShowManualStorePay(!showManualStorePay)}
                          className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                        >
                          {showManualStorePay ? 'Ocultar pago manual' : '¿Prefieres transferir manualmente por Pago Móvil a la tienda?'}
                        </button>

                        {showManualStorePay && (
                          <div className="space-y-3 pt-3 text-left animate-in fade-in">
                            <div className="p-3 bg-[#020508] border border-slate-850 rounded-xl space-y-1.5 text-[11px]">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Banco / Teléfono Comercio:</span>
                                <span className="text-white font-mono font-bold">0102 BDV • {storePhoneClean}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">RIF / Monto Inicial en Bs:</span>
                                <span className="text-[#00ffb2] font-mono font-black text-xs">J-40812345-0 • Bs. {deposit30VES.toLocaleString('es-VE')}</span>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                type="button"
                                onClick={handleCopyBankData}
                                className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer border border-slate-700"
                              >
                                <Copy size={13} />
                                <span>{copiedBankData ? '¡Datos Copiados!' : 'Copiar Pago Móvil Tienda'}</span>
                              </button>
                              <input
                                type="text"
                                placeholder="Nº Referencia Tienda (últimos 4-6 dígitos)"
                                value={pagoMovilRef}
                                onChange={(e) => setPagoMovilRef(e.target.value)}
                                className="flex-1 p-2.5 bg-[#020508] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-indigo-400"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 font-light leading-relaxed text-center">
                    Al confirmar, tu boleto quedará guardado en tu teléfono y en el mostrador de {storeName}.
                  </p>

                  <div className="space-y-2">
                    <button
                      type="submit"
                      disabled={(!pagoMovilRef.trim() && !spidiStorePaid) || isSubmitting}
                      className="game-sweep w-full cursor-pointer bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:brightness-110 text-white font-black py-3.5 rounded-2xl text-xs transition shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-40"
                    >
                      {isSubmitting ? 'Generando Boleto...' : 'Confirmar Apartado y Guardar Boleto ✓'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setLayawaySubStep(1)}
                      className="w-full text-center text-xs text-slate-400 hover:text-white py-1 transition cursor-pointer"
                    >
                      ← Volver a revisar Paso 1 (Desbloqueo Aura)
                    </button>
                  </div>
                </form>
              )}

              {/* BOTÓN CANCELAR APARTADO CON REEMBOLSO A BILLETERA */}
              <div className="pt-2 text-center border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="text-xs text-slate-500 hover:text-rose-400 underline transition cursor-pointer font-light inline-flex items-center gap-1"
                >
                  <X size={13} />
                  <span>
                    {spidiPaid || activeRes?.aura_fee_status === 'paid'
                      ? `Cancelar apartado (Reembolsar $${auraUnlockFeeUSD.toFixed(2)} USD a Billetera)`
                      : 'Cancelar este apartado'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* =====================================================================
              4D. PANTALLA: COMPRA Y RETIRO COMPLETADO EN CAJA (CONGRATULACIONES)
              ===================================================================== */}
          {step === 'PURCHASE_COMPLETED' && (
            <div className="space-y-4 py-4 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-400 via-[#00ffb2] to-teal-400 flex items-center justify-center text-slate-950 shadow-2xl shadow-emerald-500/40 animate-pulse">
                <CheckCircle2 size={38} />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full inline-block">
                  ✓ Transacción Finalizada en Caja
                </span>
                <h3 className="text-xl font-black text-white">
                  ¡Producto Entregado con Éxito!
                </h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto font-light leading-relaxed">
                  El encargado de <strong>{storeName}</strong> confirmó tu retiro en mostrador. ¡Se han sumado <strong>+10 puntos</strong> a tu Nivel de Confianza en Aura!
                </p>
              </div>

              <div className="p-3 bg-[#030812] border border-slate-800 rounded-2xl max-w-xs mx-auto text-xs text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Producto:</span>
                  <span className="text-white font-bold truncate max-w-[150px]">{product.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Boleto Canjeado:</span>
                  <span className="text-[#00ffb2] font-mono font-bold">#{generatedPin || activeRes?.pin || 'OK'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-3.5 rounded-2xl text-xs transition shadow-lg active:scale-95"
              >
                Cerrar y Continuar en Aura
              </button>
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
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full inline-block mb-1.5">
                  📦 Apartado en Depósito Activo (7 Días)
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
                      `Saldo restante al retirar: $${remaining70USD} USD (Válido por 7 días).`
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
