import { supabase } from '@/lib/supabase';
import { CategoryArchetype, Product, WalletTransaction } from '@/types';

// ==============================================================================
// 1. CONFIGURACIÓN DE ARQUETIPOS DE CATEGORÍA MULTI-RUBRO
// ==============================================================================
export interface ArchetypeConfig {
  id: CategoryArchetype;
  name: string;
  badge: string;
  iconName: string;
  defaultVariants: { label: string; options: string[] }[];
  specFields: { key: string; label: string; placeholder: string; type: 'text' | 'number' }[];
  supportsAutoConfirm: boolean;
  supportsLayaway: boolean;
  maxUnlockFeeCap: number; // Tope máximo de fee
  reservationHours: number;
}

export const ARCHETYPE_CONFIGS: Record<CategoryArchetype, ArchetypeConfig> = {
  RETAIL_STANDARD: {
    id: 'RETAIL_STANDARD',
    name: 'Moda, Juguetería y Retail',
    badge: 'Verificación en Estante',
    iconName: 'ShoppingBag',
    defaultVariants: [
      { label: 'Talla', options: ['S', 'M', 'L', 'XL'] },
      { label: 'Color', options: ['Negro', 'Blanco', 'Azul'] }
    ],
    specFields: [
      { key: 'material', label: 'Material / Tejido', placeholder: 'Ej: Algodón 100%', type: 'text' },
      { key: 'edad_recomendada', label: 'Edad Recomendada', placeholder: 'Ej: 3+ años', type: 'text' }
    ],
    supportsAutoConfirm: false,
    supportsLayaway: true,
    maxUnlockFeeCap: 10,
    reservationHours: 3
  },
  HIGH_TICKET: {
    id: 'HIGH_TICKET',
    name: 'Electrodomésticos, Muebles y Tecnología',
    badge: 'Plan de Apartado Disponible',
    iconName: 'Tv',
    defaultVariants: [
      { label: 'Color / Acabado', options: ['Plateado', 'Negro', 'Madera Natural'] }
    ],
    specFields: [
      { key: 'garantia', label: 'Meses de Garantía', placeholder: 'Ej: 12 meses', type: 'text' },
      { key: 'marca', label: 'Marca / Modelo', placeholder: 'Ej: Samsung / Daewoo', type: 'text' },
      { key: 'voltaje', label: 'Voltaje', placeholder: 'Ej: 110V', type: 'text' }
    ],
    supportsAutoConfirm: false,
    supportsLayaway: true,
    maxUnlockFeeCap: 20, // Tope estricto de $20 para no frenar la venta
    reservationHours: 24
  },
  GASTRO_FLASH: {
    id: 'GASTRO_FLASH',
    name: 'Restaurantes, Cafés y Panaderías',
    badge: 'Cupos del Día • Autoconfirmable',
    iconName: 'Utensils',
    defaultVariants: [
      { label: 'Modalidad de Consumo', options: ['En Mesa / Local', 'Pick-up / Para Llevar'] }
    ],
    specFields: [
      { key: 'horario_canje', label: 'Válido Hoy Hasta', placeholder: 'Ej: 21:00 hrs', type: 'text' },
      { key: 'incluye_bebida', label: 'Bebida Incluida', placeholder: 'Ej: Sí, Nestea o Papelón', type: 'text' }
    ],
    supportsAutoConfirm: true, // Salta directo a STOCK_VERIFIED
    supportsLayaway: false,
    maxUnlockFeeCap: 3,
    reservationHours: 4
  },
  URGENT_SEARCH: {
    id: 'URGENT_SEARCH',
    name: 'Ferretería, Farmacia y Repuestos',
    badge: 'Disponibilidad Inmediata',
    iconName: 'Wrench',
    defaultVariants: [],
    specFields: [
      { key: 'codigo_parte', label: 'Código de Parte / Serial', placeholder: 'Ej: OEM-849102', type: 'text' },
      { key: 'presentacion', label: 'Presentación / Medida', placeholder: 'Ej: Caja 20 tabletas / 1/2 pulgada', type: 'text' }
    ],
    supportsAutoConfirm: false,
    supportsLayaway: false,
    maxUnlockFeeCap: 5,
    reservationHours: 2
  },
  VEHICLES_CLASSIFIED: {
    id: 'VEHICLES_CLASSIFIED',
    name: 'Vehículos, Motos y Embarcaciones',
    badge: 'Cita Verificada en Concesionario',
    iconName: 'Car',
    defaultVariants: [
      { label: 'Trasmisión', options: ['Automática', 'Sincrónica'] }
    ],
    specFields: [
      { key: 'año', label: 'Año de Fabricación', placeholder: 'Ej: 2022', type: 'number' },
      { key: 'kilometraje', label: 'Kilometraje (km)', placeholder: 'Ej: 45000', type: 'number' },
      { key: 'placa', label: 'Último dígito de placa', placeholder: 'Ej: 7', type: 'text' }
    ],
    supportsAutoConfirm: false,
    supportsLayaway: false,
    maxUnlockFeeCap: 25,
    reservationHours: 48
  }
};

export function getArchetypeConfig(archetype?: CategoryArchetype): ArchetypeConfig {
  return ARCHETYPE_CONFIGS[archetype || 'RETAIL_STANDARD'] || ARCHETYPE_CONFIGS.RETAIL_STANDARD;
}

// ==============================================================================
// 2. MOTOR DE MONETIZACIÓN: SPLIT-PAYMENT (Pase de Desbloqueo 10%-90%)
// ==============================================================================
export interface SplitPaymentBreakdown {
  regularPriceUSD: number;
  auraPriceUSD: number;
  unlockFeeUSD: number; // Lo pagado por adelantado a Aura
  storePayBalanceUSD: number; // Lo que se paga en la caja física de la tienda
  savingsUSD: number;
  discountPercentage: number;
  hasSplitPayment: boolean;
}

export function calculateSplitPayment(product: Product): SplitPaymentBreakdown {
  const archetype = product.category_archetype || 'RETAIL_STANDARD';
  const config = getArchetypeConfig(archetype);

  // Precios
  const auraPrice = Number(product.aura_price_usd || product.sale_price || product.price || 0);
  const regularPrice = Number(product.regular_price_usd || product.price || auraPrice);

  const savingsUSD = Math.max(0, regularPrice - auraPrice);
  const discountPercentage = regularPrice > 0 ? Math.round((savingsUSD / regularPrice) * 100) : 0;

  // Si el producto tiene un fee explícito en base de datos, lo usamos
  let fee = 0;
  if (typeof product.unlock_fee_usd === 'number' && product.unlock_fee_usd > 0) {
    fee = product.unlock_fee_usd;
  } else if (product.is_clearance || discountPercentage >= 15 || archetype === 'GASTRO_FLASH') {
    // 10% del precio de oferta Aura
    const rawFee = auraPrice * 0.10;
    // Aplicamos el tope del arquetipo
    fee = Math.min(rawFee, config.maxUnlockFeeCap);
    // Redondear a 2 decimales
    fee = Number(fee.toFixed(2));
  }

  // En categorías urgentes o si no hay descuento, fee = $0 (reserva gratis)
  if (archetype === 'URGENT_SEARCH' && discountPercentage < 10) {
    fee = 0;
  }

  const storeBalance = Math.max(0, Number((auraPrice - fee).toFixed(2)));

  return {
    regularPriceUSD: regularPrice,
    auraPriceUSD: auraPrice,
    unlockFeeUSD: fee,
    storePayBalanceUSD: storeBalance,
    savingsUSD,
    discountPercentage,
    hasSplitPayment: fee > 0
  };
}

// ==============================================================================
// 3. CANDADO DE CONFIANZA: BILLETERA DE SALDO A FAVOR
// ==============================================================================
export async function getProfileWalletCredit(userId: string): Promise<{ credit: number; trustScore: number; isVip: boolean }> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('wallet_credit_usd, trust_score, is_vip, vip_expires_at')
      .eq('id', userId)
      .single();

    return {
      credit: Number(data?.wallet_credit_usd || 0),
      trustScore: Number(data?.trust_score ?? 100),
      isVip: Boolean(data?.is_vip)
    };
  } catch {
    return { credit: 0, trustScore: 100, isVip: false };
  }
}

// Aplicar saldo de billetera a un unlock_fee
export async function applyWalletToUnlockFee(params: {
  userId: string;
  reservationId: string;
  amountUsd: number;
}): Promise<boolean> {
  const { userId, reservationId, amountUsd } = params;

  try {
    // 1. Obtener crédito actual
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_credit_usd')
      .eq('id', userId)
      .single();

    const currentCredit = Number(profile?.wallet_credit_usd || 0);
    if (currentCredit < amountUsd) return false;

    // 2. Descontar de profiles
    const newCredit = Number((currentCredit - amountUsd).toFixed(2));
    await supabase
      .from('profiles')
      .update({ wallet_credit_usd: newCredit })
      .eq('id', userId);

    // 3. Registrar transacción
    await supabase.from('wallet_transactions').insert([{
      user_id: userId,
      reservation_id: reservationId,
      amount_usd: -amountUsd,
      type: 'APPLIED_TO_UNLOCK',
      description: `Pase de desbloqueo para reserva #${reservationId.slice(0, 8)}`
    }]);

    return true;
  } catch (err) {
    console.warn('Error applying wallet credit:', err);
    return false;
  }
}

// Acreditar saldo en caso de ATTENDED_NO_SALE (El cliente asistió pero no le sirvió el producto)
export async function refundFeeToWallet(params: {
  userId?: string;
  reservationId: string;
  amountUsd: number;
}): Promise<boolean> {
  const { userId, reservationId, amountUsd } = params;
  if (!amountUsd || amountUsd <= 0) return true;

  try {
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_credit_usd')
        .eq('id', userId)
        .single();

      const currentCredit = Number(profile?.wallet_credit_usd || 0);
      const newCredit = Number((currentCredit + amountUsd).toFixed(2));

      await supabase
        .from('profiles')
        .update({ wallet_credit_usd: newCredit })
        .eq('id', userId);

      await supabase.from('wallet_transactions').insert([{
        user_id: userId,
        reservation_id: reservationId,
        amount_usd: amountUsd,
        type: 'CREDIT_FROM_FIT_ISSUE',
        description: 'Saldo a favor por producto no adaptado (Garantía de Asistencia Aura)'
      }]);
    }
    return true;
  } catch (err) {
    console.warn('Error refunding fee to wallet:', err);
    return false;
  }
}

// ==============================================================================
// 4. MOTOR DE ACCESO ANTICIPADO AURA VIP (30 Minutos de Exclusividad)
// ==============================================================================
export function checkVipEarlyAccess(product: Product, userIsVip: boolean): {
  isLocked: boolean;
  minutesRemaining: number;
} {
  // Solo aplica a ofertas / remates de liquidación
  if (!product.is_clearance && (!product.discount_percent || product.discount_percent < 20)) {
    return { isLocked: false, minutesRemaining: 0 };
  }

  const publishedAt = product.published_at ? new Date(product.published_at).getTime() : Date.now();
  const timeSincePublishedMs = Date.now() - publishedAt;
  const earlyAccessDurationMs = 30 * 60 * 1000; // 30 minutos

  if (timeSincePublishedMs < earlyAccessDurationMs) {
    const minutesRemaining = Math.max(1, Math.ceil((earlyAccessDurationMs - timeSincePublishedMs) / (60 * 1000)));
    return {
      isLocked: !userIsVip,
      minutesRemaining
    };
  }

  return { isLocked: false, minutesRemaining: 0 };
}

// ==============================================================================
// 5. REGISTRO DE DEMANDA PERDIDA (Lost Demand Logger para Botón Rojo)
// ==============================================================================
export async function logLostDemand(params: {
  storeId: string;
  productId?: string;
  productName: string;
  category?: string;
  selectedVariant?: string;
  customerPhone?: string;
  reason?: string;
}) {
  try {
    await supabase.from('lost_demand_logs').insert([{
      store_id: params.storeId,
      product_id: params.productId || null,
      product_name: params.productName,
      category: params.category || 'General',
      selected_variant: params.selectedVariant || 'N/A',
      customer_phone: params.customerPhone || 'Anónimo',
      reason: params.reason || 'OUT_OF_STOCK'
    }]);
  } catch {
    // No romper si la tabla aún no fue creada
  }
}
