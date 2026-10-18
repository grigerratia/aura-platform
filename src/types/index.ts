// src/types/index.ts

// Definición de un producto para todo el sistema Aura (Enfoque 80/20)
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  sale_price?: number | null;
  discount_percent?: number | null;
  discount_percentage?: number | null;
  imageUrl?: string;
  image_url?: string;
  category?: string;
  storeId?: string;
  store_id?: string;
  store_product_id?: string;
  stock?: number;
  stock_status?: 'available' | 'last_units' | 'sold_out'; // Estados simples sin contar al milímetro
  sizes?: string[]; // Tallas o variantes disponibles (ej: ["37", "38", "39", "40"] o ["S", "M", "L"])
  rating?: number;
  reviews_count?: number;
  shortDescription?: string;
  brand?: string;
  free_shipping?: boolean;
  isOffer?: boolean;
  is_clearance?: boolean; // Producto Gancho / Remate de liquidación
  clearance_badge?: string; // Ej: "Últimas Tallas", "50% OFF", "Remate de Temporada"
  is_active?: boolean;
}

// Definición de la tienda o negocio (Vitrina Local)
export interface Store {
  id: string;
  name: string;
  slug: string;
  primaryColor?: string;
  primary_color?: string;
  whatsapp?: string;
  owner_whatsapp?: string | number;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  owner_id?: string;
  zone?: string; // Zona en Cumaná: "Centro", "Av. Bermúdez", "Gran Mariscal", etc.
  address?: string; // Dirección física exacta para ir a retirar
  badges?: string[]; // Insignias de confianza: ["Acepta Cashea", "Punto de Venta", "Delivery Cumaná", "Garantía"]
  is_verified?: boolean;
  aura_plan_id?: string;
  special_plan?: number | null;
  created_at?: string;
}

// Estados del Semáforo de Reservas de Aura
export type ReservationStatus = 
  | 'pending'     // Cliente solicitó reserva, esperando confirmación de la tienda
  | 'confirmed'   // Botón Verde / Amarillo: Tienda confirmó disponibilidad por 3 horas
  | 'completed'   // Validada en caja con PIN de 4 dígitos o comprobante
  | 'cancelled'   // Botón Rojo: Tienda reportó que se vendió en físico / agotado
  | 'expired'     // Pasaron las 3 horas sin retiro
  // Alias en español para compatibilidad
  | 'pendiente'
  | 'confirmada'
  | 'ultimo_par'
  | 'cancelada'
  | 'completada'
  | 'expirada';

// Modalidades de Doble Cierre con Pago Móvil
export type PaymentOption = 'reserva_3h' | 'reserva_48h' | 'delivery' | 'apartado_15d';

// Ticket de Reserva Digital
export interface Reservation {
  id: string;
  pin: string; // PIN de 4 dígitos para validar en caja (ej: "4821")
  pin_code?: string;
  store_id: string;
  store_name: string;
  store_whatsapp?: string;
  store_address?: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  selected_size?: string;
  price_usd: number;
  total_price?: number;
  price_ves: number;
  tasa: number;
  bcv_rate?: number;
  customer_name: string;
  customer_phone: string;
  status: ReservationStatus;
  expires_at: string; // ISO string (3 horas desde la confirmación)
  created_at: string;
  confirmed_at?: string;
  completed_at?: string;
  // Campos de Doble Cierre (Pago Móvil Directo)
  payment_method?: 'en_tienda' | 'pago_movil';
  payment_type?: PaymentOption;
  payment_reference?: string;
  bank_origin?: string;
  delivery_address?: string;
  initial_deposit?: number; // Para apartado de 15 días (30%)
  // Campos de Fila de Espera
  is_waitlist?: boolean;
  waitlist_position?: number;
}

// Datos de Pago Móvil de una Tienda Física
export interface StorePaymentInfo {
  bank_name: string;
  phone: string;
  id_doc: string; // C.I. o RIF (ej: "J-12345678-0" o "V-12345678")
  account_holder: string;
}

// Elemento de Fila de Espera
export interface WaitlistItem {
  id: string;
  product_id: string;
  product_name: string;
  store_id: string;
  store_name?: string;
  customer_name: string;
  customer_phone: string;
  selected_size?: string;
  created_at: string;
  position: number;
}

// Perfil de usuario (Aura Profiles)
export interface Profile {
  id: string;
  full_name?: string;
  phone?: string;
  role: 'admin' | 'owner' | 'customer' | string;
  store_id?: string | null;
  reputation_level?: 'Nivel 1' | 'Nivel 2' | 'Nivel Oro';
  completed_reservations?: number;
  created_at?: string;
  stores?: {
    name: string;
  };
}

// Plan de Aura SaaS
export interface AuraPlan {
  id: string;
  name: string;
  price: number;
  description?: string;
  is_active?: boolean;
}