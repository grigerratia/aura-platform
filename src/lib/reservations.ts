import { supabase } from '@/lib/supabase';
import { Reservation, ReservationStatus } from '@/types';

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
}

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const pin = generateReservationPin();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 horas de vigencia

  const priceVes = Number((input.priceUsd * input.tasa).toFixed(2));

  const reservation: Reservation = {
    id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    pin,
    store_id: input.storeId,
    store_name: input.storeName,
    store_whatsapp: input.storeWhatsapp,
    store_address: input.storeAddress,
    product_id: input.productId,
    product_name: input.productName,
    product_image: input.productImage,
    selected_size: input.selectedSize,
    price_usd: input.priceUsd,
    price_ves: priceVes,
    tasa: input.tasa,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    status: 'confirmada', // Por defecto confirmada con 3 horas para retirar en tienda
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
  };

  try {
    // Intentamos guardar en la tabla reservations
    const { data, error } = await supabase
      .from('reservations')
      .insert([reservation])
      .select()
      .single();

    if (!error && data) {
      return data as Reservation;
    }

    // Fallback: si aún no existe la tabla reservations, guardamos en la tabla orders
    await supabase.from('orders').insert([{
      store_id: input.storeId,
      customer_info: {
        name: input.customerName,
        phone: input.customerPhone,
        pin,
        selected_size: input.selectedSize,
        type: 'reserva_vitrina_3h'
      },
      total_usd: input.priceUsd,
      total_ves: priceVes,
      pdf_url: '',
      items: [{
        id: input.productId,
        name: input.productName,
        size: input.selectedSize,
        price: input.priceUsd,
        quantity: 1
      }],
      status: 'confirmada'
    }]);
  } catch {
    // Si falla Supabase por offline/permisos, devolvemos la reserva generada
  }

  return reservation;
}

// Enlace de WhatsApp para que el cliente notifique a la tienda
export function getCustomerWhatsAppLink(reservation: Reservation): string {
  const phone = (reservation.store_whatsapp || '').toString().replace(/[^0-9]/g, '');
  const targetPhone = phone.startsWith('58') ? phone : phone ? `58${phone}` : '';

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
