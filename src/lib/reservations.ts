import { supabase } from '@/lib/supabase';
import { Reservation, ReservationStatus, PaymentOption, WaitlistItem } from '@/types';

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
  priceUsd: number;
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
  // 3 horas por defecto, o 48 horas si eligió extensión por pago móvil
  const hoursValid = input.paymentType === 'reserva_48h' ? 48 : input.paymentType === 'apartado_15d' ? 360 : 3;
  const expiresAt = new Date(now.getTime() + hoursValid * 60 * 60 * 1000);

  const priceVes = Number((input.priceUsd * input.tasa).toFixed(2));

  // Formatear notas en el teléfono por si la tabla no tiene columnas dedicadas de pago móvil aún
  let formattedPhone = input.customerPhone.trim();
  if (input.paymentReference) {
    formattedPhone += ` [PAGO_MOVIL: Ref #${input.paymentReference} - ${input.paymentType || '48h'}]`;
  }
  if (input.deliveryAddress) {
    formattedPhone += ` [DELIVERY: ${input.deliveryAddress}]`;
  }

  // Payload exacto compatible con la tabla PostgreSQL en Supabase
  const dbPayload = {
    pin_code: pin,
    store_id: input.storeId || null,
    product_id: input.productId || null,
    customer_name: input.customerName.trim(),
    customer_phone: formattedPhone,
    selected_size: input.selectedSize || 'Única',
    total_price: input.priceUsd,
    bcv_rate: input.tasa,
    status: 'pending' as const, // Cumple con CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'expired'))
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
    selected_size: input.selectedSize,
    price_usd: input.priceUsd,
    total_price: input.priceUsd,
    price_ves: priceVes,
    tasa: input.tasa,
    bcv_rate: input.tasa,
    customer_name: input.customerName.trim(),
    customer_phone: input.customerPhone.trim(),
    status: 'pending',
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

// Actualizar reserva existente con comprobante de Pago Móvil
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
    // Intentamos buscar por ID o por PIN_CODE
    const query = reservationId && !reservationId.startsWith('res_')
      ? supabase.from('reservations').update({
          customer_phone: `${deliveryAddress ? `DIR: ${deliveryAddress} | ` : ''}REF: #${paymentReference} (${bankOrigin || 'Pago Móvil'}) - ${paymentType}`,
        }).eq('id', reservationId)
      : supabase.from('reservations').update({
          customer_phone: `REF: #${paymentReference} (${bankOrigin || 'Pago Móvil'}) - ${paymentType}`,
        }).eq('pin_code', pin);

    const { error } = await query;
    return !error;
  } catch {
    return false;
  }
}

// Enlace de WhatsApp para que el cliente notifique a la tienda (Retiro Físico o Pago Móvil)
export function getCustomerWhatsAppLink(reservation: Reservation): string {
  const phone = (reservation.store_whatsapp || '').toString().replace(/[^0-9]/g, '');
  const targetPhone = phone.startsWith('58') ? phone : phone ? `58${phone}` : '';

  if (reservation.payment_reference) {
    const modeLabel = reservation.payment_type === 'reserva_48h'
      ? 'Extensión de Reserva a 48 Horas'
      : reservation.payment_type === 'delivery'
      ? 'Solicitud de Delivery Inmediato'
      : reservation.payment_type === 'apartado_15d'
      ? 'Plan de Apartado 15 Días (30% Inicial)'
      : 'Pago Móvil Directo';

    const message = `💰 *COMPROBANTE DE PAGO MÓVIL DIRECTO - AURA*
¡Hola, equipo de *${reservation.store_name}*!

Acabo de realizar el pago directo a su cuenta para asegurar mi compra:
📦 *Producto:* ${reservation.product_name}
${reservation.selected_size ? `📏 *Talla/Variante:* ${reservation.selected_size}\n` : ''}💰 *Monto Transferido:* $${reservation.price_usd.toFixed(2)} USD (Bs. ${reservation.price_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })})
📋 *Modalidad:* ${modeLabel}
🔢 *Nro. de Referencia:* #${reservation.payment_reference}
${reservation.bank_origin ? `🏦 *Banco Emisor:* ${reservation.bank_origin}\n` : ''}${reservation.delivery_address ? `🛵 *Dirección de Entrega:* ${reservation.delivery_address}\n` : ''}👤 *Cliente:* ${reservation.customer_name} (${reservation.customer_phone})
🎟️ *Ticket PIN:* #${reservation.pin}

Por favor confírmenme cuando verifiquen la transferencia. ¡Muchas gracias!`;

    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
  }

  // Mensaje habitual de Reserva de 3 Horas
  const message = `🎟️ *TICKET DE RESERVA AURA #${reservation.pin}*
¡Hola, equipo de *${reservation.store_name}*!

Acabo de apartar este producto desde la vitrina de Aura:
📦 *Producto:* ${reservation.product_name}
${reservation.selected_size ? `📏 *Talla/Medida:* ${reservation.selected_size}\n` : ''}💰 *Precio Congelado:* $${reservation.price_usd.toFixed(2)} USD / Bs. ${reservation.price_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
👤 *A nombre de:* ${reservation.customer_name} (${reservation.customer_phone})

⏱️ *Tiempo para retirar:* 3 horas con precio congelado.
📍 Pasaré por su tienda a pagar directamente en caja (Efectivo / Punto / Pago Móvil / Cashea).

¡Muchas gracias!`;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
}

// FILA DE ESPERA (Waitlist)
export async function joinProductWaitlist(params: {
  productId: string;
  productName: string;
  storeId: string;
  storeName?: string;
  customerName: string;
  customerPhone: string;
  selectedSize?: string;
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
    created_at: now.toISOString(),
    position: 1,
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

  // También registramos una entrada de demanda en reservations con status 'pending' y flag de waitlist
  try {
    await supabase.from('reservations').insert([{
      pin_code: '0000',
      store_id: params.storeId || null,
      product_id: params.productId || null,
      customer_name: `[FILA DE ESPERA] ${params.customerName.trim()}`,
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
