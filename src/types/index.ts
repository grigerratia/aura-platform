// src/types/index.ts

// ==============================================================================
// 1. ARQUETIPOS DE CATEGORÍA MULTI-RUBRO (Universalidad)
// ==============================================================================
export type CategoryArchetype =
  | 'RETAIL_STANDARD'      // Ropa, Zapatería, Juguetería, Librería, Joyería (Tallas, Colores, Edad)
  | 'HIGH_TICKET'          // Electrodomésticos, Muebles, Tecnología (Layaway/Apartado, Tope de Fee)
  | 'GASTRO_FLASH'         // Restaurantes, Cafés, Comida Rápida (Cupos diarios, Canje hoy, Mesa/Llevar)
  | 'URGENT_SEARCH'        // Ferretería, Farmacia, Repuestos (Búsqueda inmediata, Cercanía)
  | 'VEHICLES_CLASSIFIED'; // Carros, Motos, Lanchas (Cita Verificada, Bono Trámites)

// Grupo de Variante Dinámica en JSONB
export interface ProductVariantGroup {
  label: string; // ej: "Talla", "Color", "Modalidad", "Acabado"
  options: string[]; // ej: ["38", "39", "40"], ["En Mesa", "Para Llevar"]
}

// ==============================================================================
// 2. PRODUCTO AURA (Multi-Rubro & Split-Payment)
// ==============================================================================
export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  imageUrl?: string;
  image_url?: string;
  storeId?: string;
  store_id?: string;
  store_product_id?: string;
  is_active?: boolean;

  // Precios & Split Payment (Pase de Desbloqueo 10%-90%)
  price: number; // Precio base o precio activo
  regular_price_usd?: number | null; // Precio normal en tienda (ej: $45.00)
  aura_price_usd?: number | null; // Precio con descuento Aura (ej: $30.00)
  unlock_fee_usd?: number | null; // Pago por adelantado a Aura (10%, ej: $3.00)
  store_pay_balance_usd?: number | null; // Saldo a pagar en caja física (ej: $27.00)

  sale_price?: number | null;
  discount_percent?: number | null;
  discount_percentage?: number | null;
  isOffer?: boolean;
  is_clearance?: boolean; // Flash Outlet / Remate de liquidación
  clearance_badge?: string; // ej: "Últimas Tallas", "50% OFF", "Combo Flash"

  // Polimorfismo Multi-Rubro
  category_archetype?: CategoryArchetype;
  variants?: ProductVariantGroup[]; // Variantes dinámicas JSONB
  specs?: Record<string, any>; // Ficha técnica JSONB (año, km, garantía, etc.)
  sizes?: string[]; // Compatibilidad con calzado/ropa clásico

  // Control de Stock & Autoconfirmación
  stock?: number;
  stock_status?: 'available' | 'last_units' | 'sold_out';
  auto_confirm_stock?: boolean; // Ideal para restaurantes (confirmación instantánea)
  stock_quota?: number; // Cupos disponibles hoy

  // Aura Ads & Visibilidad
  is_sponsored?: boolean;
  sponsored_until?: string | null;

  // Aura VIP (Acceso Anticipado 30 min)
  published_at?: string;

  rating?: number;
  reviews_count?: number;
  free_shipping?: boolean;
}

// ==============================================================================
// 3. TIENDA / COMERCIO LOCAL (Motor 1: Planes B2B & Ads)
// ==============================================================================
export type StorePlanTier = 'VITRINA_20' | 'ACELERADOR_45' | 'DOMINIO_80';
export type StoreSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE';
export type StoreVerificationStatus = 'DRAFT_UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'SUSPENDED';

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
  address?: string; // Dirección física exacta para retiro
  reference_point?: string;
  rif?: string;
  rif_or_id_number?: string;
  schedule?: string;
  badges?: string[]; // ["Acepta Cashea", "Punto de Venta", "Delivery Cumaná"]
  is_verified?: boolean;

  // Verificación Rápida B2B
  verification_status?: StoreVerificationStatus;
  storefront_photo_url?: string;
  instagram_handle?: string;

  // Modo Empleado / Mostrador
  cashier_access_pin?: string;

  // Geolocalización y Reputación (Cercanía & Mejor Atención)
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviews_count?: number;
  category?: string;

  // Motor 1: Suscripciones B2B
  plan_tier?: StorePlanTier;
  subscription_status?: StoreSubscriptionStatus;
  ad_credits_usd?: number; // Saldo para Aura Ads
  aura_plan_id?: string;
  special_plan?: number | null;
  created_at?: string;
}

// ==============================================================================
// 4. FLUJO DE ESTADOS DE RESERVA ACTUALIZADO (Parte 3)
// ==============================================================================
export type ReservationStatus =
  | 'PENDING_STOCK_CHECK'     // 1. Cliente solicitó reservar (esperando chequeo)
  | 'STOCK_VERIFIED'          // 2. Comerciante verificó stock (o autoconfirmado)
  | 'AWAITING_UNLOCK_PAYMENT' // 3. Esperando pago de unlock_fee_usd ($3) o wallet
  | 'QR_ACTIVE'               // 4. Ticket QR oficial activo con cuenta regresiva
  | 'COMPLETED_IN_STORE'      // 5. Validado y cobrado en mostrador de la tienda
  | 'ATTENDED_NO_SALE'        // 6. Cliente asistió pero no llevó -> dinero va a Billetera
  | 'EXPIRED_NO_SHOW'         // 7. Reloj a cero, no asistió -> penaliza trust_score
  | 'REJECTED_OUT_OF_STOCK'   // 8. Botón rojo -> agotado, suma a demanda perdida
  // Alias de compatibilidad previa
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'pendiente'
  | 'confirmada'
  | 'ultimo_par'
  | 'cancelada'
  | 'completada'
  | 'expirada';

export type PaymentOption = 'reserva_3h' | 'reserva_48h' | 'delivery' | 'apartado_15d';

// Ticket de Reserva Digital
export interface Reservation {
  id: string;
  user_id?: string;
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
  selected_variant?: Record<string, string>; // Opciones elegidas { "Talla": "41", "Color": "Negro" }
  category_archetype?: CategoryArchetype;

  // Split Payment 10%-90%
  price_usd: number;
  total_price?: number;
  unlock_fee_usd?: number; // Lo pagado a Aura ($3)
  store_pay_balance_usd?: number; // Lo a pagar en caja ($27)
  paid_with_wallet?: boolean; // Pagó el fee con saldo a favor

  price_ves: number;
  tasa: number;
  bcv_rate?: number;
  customer_name: string;
  customer_phone: string;
  status: ReservationStatus;
  expires_at: string;
  created_at: string;
  confirmed_at?: string;
  completed_at?: string;

  // Doble Cierre & Pagos Directos
  payment_method?: 'en_tienda' | 'pago_movil';
  payment_type?: PaymentOption;
  payment_reference?: string;
  bank_origin?: string;
  delivery_address?: string;
  initial_deposit?: number;

  // Fila de Espera
  is_waitlist?: boolean;
  waitlist_position?: number;
}

// ==============================================================================
// 5. BILLETERA DE SALDO A FAVOR & PERFILES (Candado de Confianza)
// ==============================================================================
export interface WalletTransaction {
  id: string;
  user_id?: string;
  reservation_id?: string;
  amount_usd: number;
  type: 'CREDIT_FROM_FIT_ISSUE' | 'APPLIED_TO_UNLOCK' | 'MANUAL_ADJUSTMENT';
  description?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  phone?: string;
  role: 'admin' | 'owner' | 'customer' | string;
  store_id?: string | null;

  // Identidad y Logística Local
  id_doc?: string;
  zone?: string;
  delivery_address?: string;
  phone_alt?: string;
  preferred_categories?: string[];
  shoe_size?: string;
  clothing_size?: string;

  // Candado de Confianza
  wallet_credit_usd?: number; // Saldo a favor reutilizable en Aura
  trust_score?: number; // 0 - 100 de reputación de asistencia

  // Membresía VIP
  is_vip?: boolean;
  vip_expires_at?: string | null;

  completed_reservations?: number;
  created_at?: string;
  stores?: {
    name: string;
  };
}

// Log de Demanda Perdida (Búsquedas Agotadas)
export interface LostDemandLog {
  id: string;
  store_id: string;
  product_id?: string;
  product_name: string;
  category?: string;
  selected_variant?: string;
  customer_phone?: string;
  reason: 'OUT_OF_STOCK' | 'VARIANT_UNAVAILABLE' | string;
  created_at: string;
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
  is_vip?: boolean;
  created_at: string;
  position: number;
}

// Datos de Pago Móvil de una Tienda Física o de Aura
export interface StorePaymentInfo {
  bank_name: string;
  phone: string;
  id_doc: string;
  account_holder: string;
}

export interface AuraPlan {
  id: string;
  name: string;
  price: number;
  description?: string;
  is_active?: boolean;
}