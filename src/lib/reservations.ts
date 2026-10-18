import { supabase } from '@/lib/supabase';
import { Reservation, ReservationStatus, PaymentOption, WaitlistItem, CategoryArchetype } from '@/types';
import { calculateSplitPayment, refundFeeToWallet, logLostDemand } from './monetization';

// Generador de PIN seguro de 4 dígitos para retiro en caja
export function generateReservationPin(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${num}`;
}

export interface CreateReservationInput {
  storeId: string;
  storeName: string;
  storeWhatsapp?: string;
  storeAddress?: string;
  productId: string;
  productName: string;
  productImage?: string;
  selectedSize?: string;
  selectedVariant?: Record<string, string>;
  categoryArchetype?: CategoryArchetype;
  priceUsd: number;
  regularPriceUsd?: number;
  unlockFeeUsd?: number;
  storePayBalanceUsd?: number;
  paidWithWallet?: boolean;
  autoConfirmStock?: boolean;
  tasa: number;
  customerName: string;
  customerPhone: string;
  paymentMethod?: 'en_tienda' | 'pago_movil';
  paymentType?: PaymentOption;
  paymentReference?: string;
  deliveryAddress?: string;
}

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const pin = generateReservationPin();
  const now = new Date();

  // Vigencia según arquetipo y modalidad
  const isLayaway = input.paymentType === 'apartado_15d';
  const hoursValid = isLayaway ? 360 : input.paymentType === 'reserva_48h' ? 48 : input.categoryArchetype === 'HIGH_TICKET' ? 24 : 3;
  const expiresAt = new Date(now.getTime() + hoursValid * 60 * 60 * 1000);

  const priceVes = Number((input.priceUsd * input.tasa).toFixed(2));

  // Cálculo de Split-Payment
  let unlockFee = input.unlockFeeUsd ?? 0;
  let storeBalance = input.storePayBalanceUsd ?? input.priceUsd;

  if (unlockFee === 0 && input.priceUsd > 0) {
    const split = calculateSplitPayment({
      id: input.productId,
      name: input.productName,
      price: input.priceUsd,
      regular_price_usd: input.regularPriceUsd,
      aura_price_usd: input.priceUsd,
      category_archetype: input.categoryArchetype,
      is_clearance: true
    });
    unlockFee = split.unlockFeeUSD;
    storeBalance = split.storePayBalanceUSD;
  }

  // Estado inicial: Si autoConfirmStock = true, pasa a STOCK_VERIFIED (o confirmed)
  const initialStatus: ReservationStatus = input.autoConfirmStock ? 'confirmed' : 'pending';

  // Formatear notas en el teléfono por si la tabla no tiene columnas dedicadas de pago móvil aún
  let formattedPhone = input.customerPhone.trim();
  if (input.paymentReference) {
    formattedPhone += ` [PAGO_MOVIL: Ref #${input.paymentReference} - ${input.paymentType || '48h'}]`;
  }
  if (input.deliveryAddress) {
    formattedPhone += ` [DELIVERY: ${input.deliveryAddress}]`;
  }
  if (input.selectedVariant && Object.keys(input.selectedVariant).length > 0) {
    const variantDesc = Object.entries(input.selectedVariant).map(([k, v]) => `${k}:${v}`).join(';');
    formattedPhone += ` [VAR:${variantDesc}]`;
  }

  // Payload exacto compatible con la tabla PostgreSQL en Supabase
  const dbPayload = {
    pin_code: pin,
    store_id: input.storeId || null,
    product_id: input.productId || null,
    customer_name: input.customerName.trim(),
    customer_phone: formattedPhone,
    selected_size: input.selectedSize || Object.values(input.selectedVariant || {})[0] || 'Única',
    total_price: input.priceUsd,
    bcv_rate: input.tasa,
    status: initialStatus,
    expires_at: expiresAt.toISOString(),
  };

  const localReservation: Reservation = {
    id: `res_${Date.now()}`,
    pin,
    pin_code: pin,
    store_id: input.storeId,
    store_name: input.storeName,
    store_whatsapp: input.storeWhatsapp,
    store_address: input.storeAddress,
    product_id: input.productId,
    product_name: input.productName,
    product_image: input.productImage,
    selected_size: input.selectedSize || Object.values(input.selectedVariant || {})[0],
    selected_variant: input.selectedVariant,
    category_archetype: input.categoryArchetype || 'RETAIL_STANDARD',
    price_usd: input.priceUsd,
    total_price: input.priceUsd,
    unlock_fee_usd: unlockFee,
    store_pay_balance_usd: storeBalance,
    paid_with_wallet: input.paidWithWallet || false,
    price_ves: priceVes,
    tasa: input.tasa,
    bcv_rate: input.tasa,
    customer_name: input.customerName.trim(),
    customer_phone: input.customerPhone.trim(),
    status: initialStatus,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    payment_method: input.paymentMethod || 'en_tienda',
    payment_type: input.paymentType || 'reserva_3h',
    payment_reference: input.paymentReference,
    delivery_address: input.deliveryAddress,
  };

  try {
    const { data, error } = await supabase
      .from('reservations')
      .insert([dbPayload])
      .select()
      .single();

    if (!error && data) {
      return {
        ...localReservation,
        id: data.id,
        pin: data.pin_code || pin,
        pin_code: data.pin_code || pin,
        status: data.status,
      };
    } else if (error) {
      console.warn('Error inserting reservation in Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Supabase offline or reservation error:', err);
  }

  return localReservation;
}

// Actualizar reserva existente con comprobante de Pago Móvil o Wallet
export async function attachPagoMovilToReservation(params: {
  reservationId: string;
  pin: string;
  storeId: string;
  paymentType: PaymentOption;
  paymentReference: string;
  bankOrigin?: string;
  deliveryAddress?: string;
}): Promise<boolean> {
  const { reservationId, pin, paymentType, paymentReference, bankOrigin, deliveryAddress } = params;

  try {
    const query = reservationId && !reservationId.startsWith('res_')
      ? supabase.from('reservations').update({
          customer_phone: `${deliveryAddress ? `DIR: ${deliveryAddress} | ` : ''}REF: #${paymentReference} (${bankOrigin || 'Pago Móvil'}) - ${paymentType}`,
          status: 'confirmed'
        }).eq('id', reservationId)
      : supabase.from('reservations').update({
          customer_phone: `REF: #${paymentReference} (${bankOrigin || 'Pago Móvil'}) - ${paymentType}`,
          status: 'confirmed'
        }).eq('pin_code', pin);

    const { error } = await query;
    return !error;
  } catch {
    return false;
  }
}

// Enlace de WhatsApp para que el cliente notifique a la tienda
export function getCustomerWhatsAppLink(reservation: Reservation): string {
  const phone = (reservation.store_whatsapp || '').toString().replace(/[^0-9]/g, '');
  const targetPhone = phone.startsWith('58') ? phone : phone ? `58${phone}` : '';

  const archetypeLabel = reservation.category_archetype === 'GASTRO_FLASH'
    ? '🍽️ Combo / Pedido Flash'
    : reservation.category_archetype === 'VEHICLES_CLASSIFIED'
    ? '🚗 Agendamiento de Cita'
    : '📦 Producto Apartado';

  if (reservation.payment_reference) {
    const modeLabel = reservation.payment_type === 'reserva_48h'
      ? 'Extensión de Reserva a 48 Horas'
      : reservation.payment_type === 'delivery'
      ? 'Solicitud de Delivery Inmediato'
      : reservation.payment_type === 'apartado_15d'
      ? 'Plan de Apartado 15 Días (30% Inicial)'
      : 'Pago Directo Asegurado';

    const message = `💰 *COMPROBANTE DE RESERVA - AURA*
¡Hola, equipo de *${reservation.store_name}*!

Acabo de asegurar este producto desde la vitrina de Aura:
${archetypeLabel}: *${reservation.product_name}*
${reservation.selected_size ? `📏 *Variante / Detalle:* ${reservation.selected_size}\n` : ''}💰 *Monto de Operación:* $${reservation.price_usd.toFixed(2)} USD (Bs. ${reservation.price_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })})
📋 *Modalidad:* ${modeLabel}
🔢 *Nro. de Referencia:* #${reservation.payment_reference}
${reservation.bank_origin ? `🏦 *Banco:* ${reservation.bank_origin}\n` : ''}${reservation.delivery_address ? `🛵 *Dirección:* ${reservation.delivery_address}\n` : ''}👤 *Cliente:* ${reservation.customer_name} (${reservation.customer_phone})
🎟️ *Ticket PIN:* #${reservation.pin}

Por favor confírmenme cuando verifiquen la reserva. ¡Muchas gracias!`;

    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
  }

  // Mensaje de retiro en tienda con Split Payment
  const splitFee = reservation.unlock_fee_usd && reservation.unlock_fee_usd > 0
    ? `\n🔒 *Pase Aura Desbloqueado:* $${reservation.unlock_fee_usd.toFixed(2)} USD (Garantía Billetera activa)\n💵 *Saldo a pagar en caja del local:* $${(reservation.store_pay_balance_usd ?? reservation.price_usd).toFixed(2)} USD`
    : `\n💰 *Total a pagar en caja:* $${reservation.price_usd.toFixed(2)} USD / Bs. ${reservation.price_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

  const message = `🎟️ *TICKET DE RESERVA AURA #${reservation.pin}*
¡Hola, equipo de *${reservation.store_name}*!

Acabo de apartar este producto desde la vitrina de Aura:
${archetypeLabel}: *${reservation.product_name}*
${reservation.selected_size ? `📏 *Variante / Detalle:* ${reservation.selected_size}\n` : ''}${splitFee}
👤 *A nombre de:* ${reservation.customer_name} (${reservation.customer_phone})

⏱️ *Tiempo de vigencia:* 3 horas con precio congelado.
📍 Pasaré por su tienda física en Cumaná a verificar y pagar.

¡Muchas gracias!`;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
}

// FILA DE ESPERA (Waitlist con prioridad VIP)
export async function joinProductWaitlist(params: {
  productId: string;
  productName: string;
  storeId: string;
  storeName?: string;
  customerName: string;
  customerPhone: string;
  selectedSize?: string;
  isVip?: boolean;
}): Promise<WaitlistItem> {
  const now = new Date();
  const waitlistItem: WaitlistItem = {
    id: `wl_${Date.now()}`,
    product_id: params.productId,
    product_name: params.productName,
    store_id: params.storeId,
    store_name: params.storeName,
    customer_name: params.customerName.trim(),
    customer_phone: params.customerPhone.trim(),
    selected_size: params.selectedSize,
    is_vip: params.isVip || false,
    created_at: now.toISOString(),
    position: params.isVip ? 1 : 2, // Prioridad VIP
  };

  // Guardamos en localStorage del navegador
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('aura_waitlist_records');
      const list: WaitlistItem[] = stored ? JSON.parse(stored) : [];
      list.push(waitlistItem);
      localStorage.setItem('aura_waitlist_records', JSON.stringify(list));
    } catch {
      // Ignorar errores de storage
    }
  }

  // Registrar en reservations como demanda
  try {
    await supabase.from('reservations').insert([{
      pin_code: '0000',
      store_id: params.storeId || null,
      product_id: params.productId || null,
      customer_name: `[FILA DE ESPERA${params.isVip ? ' VIP' : ''}] ${params.customerName.trim()}`,
      customer_phone: params.customerPhone.trim(),
      selected_size: params.selectedSize || 'Única',
      total_price: 0,
      bcv_rate: 1,
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    }]);
  } catch {
    // Si la DB falla, el registro local persiste
  }

  return waitlistItem;
}
