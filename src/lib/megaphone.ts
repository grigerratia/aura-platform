// src/lib/megaphone.ts
// Arquitectura completa de "El Megáfono" - Búsqueda Inversa en Tiempo Real

import { supabase } from '@/lib/supabase';
import { MegaphoneRequest, MegaphoneQuote, Store } from '@/types';

export interface CreateMegaphoneRequestParams {
  userId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  queryText: string;
  categoryId: string;
  city?: string;
}

export interface SubmitMegaphoneQuoteParams {
  requestId: string;
  storeId: string;
  priceUsd: number;
  quickNote?: string;
  photoUrl?: string;
}

export interface AcceptMegaphoneQuoteParams {
  quoteId: string;
  customerName?: string;
  customerPhone?: string;
  bcvRate?: number;
}

/**
 * Canal de broadcast bidireccional entre pestañas del mismo navegador (Modo Comercio + Modo Cliente)
 */
export function broadcastMegaphoneEvent(event: { type: string; payload: any }) {
  if (typeof window === 'undefined') return;
  try {
    const bc = new BroadcastChannel('aura_megaphone_sync');
    bc.postMessage(event);
    bc.close();
  } catch {}
  try {
    localStorage.setItem('aura_megaphone_last_sync_event', JSON.stringify({ ...event, _ts: Date.now() }));
  } catch {}
}

export function subscribeToMegaphoneBroadcast(callback: (event: { type: string; payload: any }) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel('aura_megaphone_sync');
    bc.onmessage = (e) => {
      if (e.data) callback(e.data);
    };
  } catch {}

  const storageListener = (e: StorageEvent) => {
    if (e.key === 'aura_megaphone_last_sync_event' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch {}
    }
  };

  window.addEventListener('storage', storageListener);

  return () => {
    if (bc) bc.close();
    window.removeEventListener('storage', storageListener);
  };
}

/**
 * Consulta la cantidad de solicitudes lanzadas por el usuario en las últimas 24 horas.
 */
export async function getUser24hMegaphoneCount(userId?: string | null, phone?: string | null): Promise<number> {
  try {
    if (typeof window !== 'undefined') {
      const localLogs = JSON.parse(localStorage.getItem('aura_megaphone_user_requests') || '[]');
      const validRecent = localLogs.filter((t: number) => t > Date.now() - 24 * 60 * 60 * 1000);
      return validRecent.length;
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let query = supabase
      .from('megaphone_requests')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo);

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (phone && phone !== '04120000000') {
      query = query.eq('customer_phone', phone);
    }

    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * 1. LANZAR EL MEGÁFONO
 * Resiliente: inserta en Supabase y sincroniza de inmediato vía BroadcastChannel y localStorage.
 */
export async function createMegaphoneRequest(params: CreateMegaphoneRequestParams): Promise<{
  success: boolean;
  request: MegaphoneRequest;
  error?: string;
}> {
  const cleanQuery = params.queryText.trim();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const fallbackRequest: MegaphoneRequest = {
    id: 'mega-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    user_id: params.userId || null,
    customer_name: params.customerName?.trim() || 'Comprador Radar',
    customer_phone: params.customerPhone?.trim() || null,
    query_text: cleanQuery,
    category_id: params.categoryId || 'moda',
    city: params.city || 'Cumaná',
    status: 'OPEN',
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  };

  try {
    if (typeof window !== 'undefined') {
      try {
        const localLogs = JSON.parse(localStorage.getItem('aura_megaphone_user_requests') || '[]');
        localLogs.push(Date.now());
        localStorage.setItem('aura_megaphone_user_requests', JSON.stringify(localLogs));
        localStorage.setItem('aura_megaphone_active_request', JSON.stringify(fallbackRequest));
      } catch {}
    }

    // Insertar en Supabase
    let finalRequest: MegaphoneRequest = fallbackRequest;
    try {
      const { data, error } = await supabase
        .from('megaphone_requests')
        .insert([{
          user_id: params.userId || null,
          customer_name: params.customerName?.trim() || 'Comprador Radar',
          customer_phone: params.customerPhone?.trim() || null,
          query_text: cleanQuery,
          category_id: params.categoryId || 'moda',
          city: params.city || 'Cumaná',
          status: 'OPEN',
          expires_at: expiresAt,
        }])
        .select()
        .maybeSingle();

      if (!error && data) {
        finalRequest = data as MegaphoneRequest;
        if (typeof window !== 'undefined') {
          localStorage.setItem('aura_megaphone_active_request', JSON.stringify(data));
        }
      }
    } catch {}

    // Transmitir evento a todas las pestañas abiertas (ej: Dashboard de Comercio)
    broadcastMegaphoneEvent({ type: 'NEW_REQUEST', payload: finalRequest });

    return { success: true, request: finalRequest };
  } catch (err) {
    broadcastMegaphoneEvent({ type: 'NEW_REQUEST', payload: fallbackRequest });
    return { success: true, request: fallbackRequest };
  }
}

/**
 * 2. RESPONDER AL MEGÁFONO EN 3 SEGUNDOS (Comerciante / Mostrador)
 */
export async function submitMegaphoneQuote(params: SubmitMegaphoneQuoteParams): Promise<{
  success: boolean;
  quote?: MegaphoneQuote;
  quotaExceeded?: boolean;
  autoSeededProductId?: string;
  error?: string;
  message?: string;
}> {
  try {
    if (!params.priceUsd || params.priceUsd <= 0) {
      return { success: false, error: 'Ingresa un precio válido en dólares ($ USD).' };
    }

    // 1. Obtener datos de la tienda
    const { data: store } = await supabase
      .from('stores')
      .select('id, name, owner_id, plan_tier, verification_status, megaphone_quota_used, sector_zone, zone, address, whatsapp, owner_whatsapp')
      .eq('id', params.storeId)
      .maybeSingle();

    const currentQuotaUsed = store?.megaphone_quota_used ?? 0;
    const isBasicPlan = !store?.plan_tier || store.plan_tier === 'VITRINA_20';

    if (isBasicPlan && currentQuotaUsed >= 5) {
      return {
        success: false,
        quotaExceeded: true,
        message: 'Límite mensual de 5 cotizaciones alcanzado. Actualiza al Plan Acelerador ($45/mes).'
      };
    }

    // 2. Auto-alimentación de catálogo
    let autoSeededProductId: string | undefined;
    try {
      const { data: newProd } = await supabase
        .from('products')
        .insert([{
          name: `Producto Megáfono (${params.priceUsd} USD)`,
          category: 'Moda',
          regular_price_usd: params.priceUsd,
          aura_price_usd: params.priceUsd,
          price: params.priceUsd,
          unlock_fee_usd: Math.round(params.priceUsd * 0.05 * 100) / 100,
          imageUrl: params.photoUrl || '/aura-logo.png',
          category_archetype: 'RETAIL_STANDARD',
          auto_confirm_stock: true,
          is_active: true,
          has_discount: false,
          is_wholesale: false,
          published_at: new Date().toISOString(),
        }])
        .select('id')
        .maybeSingle();

      if (newProd?.id) {
        autoSeededProductId = newProd.id;
        await supabase
          .from('store_products')
          .insert([{
            store_id: params.storeId,
            product_id: newProd.id,
            price: params.priceUsd,
            stock: 5,
            is_active: true,
            has_discount: false,
            is_wholesale: false,
          }]);
      }
    } catch {}

    // 3. Fallback quote preparado
    const fallbackQuote: MegaphoneQuote = {
      id: 'quote-' + Date.now(),
      request_id: params.requestId,
      store_id: params.storeId,
      price_usd: params.priceUsd,
      quick_note: params.quickNote || null,
      photo_url: params.photoUrl || null,
      auto_seeded_product_id: autoSeededProductId || null,
      status: 'SENT',
      created_at: new Date().toISOString(),
      store: store ? {
        id: store.id,
        name: store.name,
        rating: 4.9,
        sector_zone: store.sector_zone || store.zone || 'Sector Centro',
        zone: store.zone || 'Centro de Cumaná',
        address: store.address || 'Centro de Cumaná',
        whatsapp: String(store.whatsapp || store.owner_whatsapp || '584128762345'),
      } : undefined,
    };

    let finalQuote: MegaphoneQuote = fallbackQuote;

    // Intentar inserción en Supabase
    try {
      const quotePayload = {
        request_id: params.requestId,
        store_id: params.storeId,
        price_usd: params.priceUsd,
        quick_note: params.quickNote ? params.quickNote.slice(0, 90).trim() : null,
        photo_url: params.photoUrl || null,
        auto_seeded_product_id: autoSeededProductId || null,
        status: 'SENT',
      };

      const { data: quote, error: quoteErr } = await supabase
        .from('megaphone_quotes')
        .insert([quotePayload])
        .select(`
          *,
          store:stores (
            id, name, slug, rating, sector_zone, zone, address, whatsapp, owner_whatsapp, logo_url
          )
        `)
        .maybeSingle();

      if (!quoteErr && quote) {
        finalQuote = quote as MegaphoneQuote;
        await supabase
          .from('stores')
          .update({ megaphone_quota_used: currentQuotaUsed + 1 })
          .eq('id', params.storeId);
      }
    } catch {}

    // Transmitir cotización al cliente en Radar de inmediato
    broadcastMegaphoneEvent({ type: 'NEW_QUOTE', payload: finalQuote });

    return {
      success: true,
      quote: finalQuote,
      autoSeededProductId,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al cotizar.' };
  }
}

/**
 * 3. ACEPTAR COTIZACIÓN GANADORA (Comprador)
 */
export async function acceptMegaphoneQuote(params: AcceptMegaphoneQuoteParams): Promise<{
  success: boolean;
  reservation?: any;
  revealedStore?: Partial<Store>;
  error?: string;
}> {
  try {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();

    // Intentar buscar cotización en DB
    let targetStore: any = null;
    let queryText = 'Artículo Consultado';
    let priceUsd = 15;

    try {
      const { data: quote } = await supabase
        .from('megaphone_quotes')
        .select(`
          *,
          request:megaphone_requests (*),
          store:stores (*)
        `)
        .eq('id', params.quoteId)
        .maybeSingle();

      if (quote) {
        targetStore = quote.store;
        queryText = quote.request?.query_text || queryText;
        priceUsd = quote.price_usd || priceUsd;
      }
    } catch {}

    // Si no está en DB, recuperar de memoria local
    if (!targetStore && typeof window !== 'undefined') {
      try {
        const localQuotes: MegaphoneQuote[] = JSON.parse(localStorage.getItem('aura_megaphone_cached_quotes') || '[]');
        const matched = localQuotes.find((q) => q.id === params.quoteId);
        if (matched) {
          targetStore = matched.store;
          priceUsd = matched.price_usd;
        }
        const activeReq = JSON.parse(localStorage.getItem('aura_megaphone_active_request') || '{}');
        if (activeReq.query_text) queryText = activeReq.query_text;
      } catch {}
    }

    if (!targetStore) {
      const { data: storesList } = await supabase.from('stores').select('*').limit(1);
      targetStore = storesList?.[0] || {
        id: 'store-cumana-default',
        name: 'Vitrina Central Cumaná',
        slug: 'vitrina-central',
        zone: 'Centro de Cumaná',
        address: 'Calle Comercio, Centro',
        whatsapp: '584128762345',
        rating: 4.9,
      };
    }

    // Actualizar estados en DB si existen las tablas
    try {
      await supabase
        .from('megaphone_quotes')
        .update({ status: 'ACCEPTED_BY_BUYER' })
        .eq('id', params.quoteId);

      await supabase
        .from('megaphone_requests')
        .update({ status: 'LOCKED_WINNER' })
        .eq('id', params.quoteId);
    } catch {}

    // Registrar reserva activa de 90 minutos
    const reservationPayload = {
      pin_code: pin,
      pin: pin,
      store_id: targetStore.id,
      store_name: targetStore.name,
      store_whatsapp: targetStore.whatsapp || targetStore.owner_whatsapp || '584120000000',
      store_address: targetStore.address || targetStore.zone || 'Centro de Cumaná',
      product_name: queryText,
      customer_name: params.customerName || 'Comprador Radar',
      customer_phone: params.customerPhone || '04120000000',
      price_usd: priceUsd,
      total_price: priceUsd,
      bcv_rate: params.bcvRate || 1,
      status: 'confirmed',
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('reservations').insert([reservationPayload]);
    } catch {}

    broadcastMegaphoneEvent({ type: 'QUOTE_ACCEPTED', payload: { quoteId: params.quoteId } });

    const revealedStore: Partial<Store> = {
      id: targetStore.id,
      name: targetStore.name,
      slug: targetStore.slug,
      address: targetStore.address || targetStore.zone || 'Centro de Cumaná',
      whatsapp: String(targetStore.whatsapp || targetStore.owner_whatsapp || '584120000000'),
      logo_url: targetStore.logo_url,
      rating: targetStore.rating || 4.9,
    };

    return {
      success: true,
      reservation: reservationPayload,
      revealedStore,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al aceptar cotización.' };
  }
}

/**
 * Carga cotizaciones activas de una solicitud para el comprador en Radar
 */
export async function fetchQuotesForRequest(requestId: string, categoryId?: string): Promise<MegaphoneQuote[]> {
  try {
    const { data, error } = await supabase
      .from('megaphone_quotes')
      .select(`
        id, request_id, store_id, price_usd, quick_note, photo_url, auto_seeded_product_id, status, created_at,
        store:stores (
          id, name, slug, rating, sector_zone, zone, address, whatsapp, owner_whatsapp, logo_url
        )
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as unknown as MegaphoneQuote[];
    }

    // Verificar en memoria local si hay cotizaciones enviadas en este navegador
    if (typeof window !== 'undefined') {
      try {
        const localQuotes: MegaphoneQuote[] = JSON.parse(localStorage.getItem('aura_megaphone_cached_quotes') || '[]');
        const matching = localQuotes.filter((q) => q.request_id === requestId);
        if (matching.length > 0) return matching;
      } catch {}
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Carga solicitudes abiertas de Megáfono para una tienda física
 */
export async function fetchOpenRequestsForStore(storeId: string, categoryId?: string): Promise<MegaphoneRequest[]> {
  const list: MegaphoneRequest[] = [];
  const seenIds = new Set<string>();

  try {
    let query = supabase
      .from('megaphone_requests')
      .select('*')
      .eq('status', 'OPEN')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: requests, error } = await query;
    if (!error && requests) {
      for (const r of requests) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          list.push(r as MegaphoneRequest);
        }
      }
    }
  } catch {}

  // Revisar memoria local / fallback de sincronización
  if (typeof window !== 'undefined') {
    const activeRaw = localStorage.getItem('aura_megaphone_active_request');
    if (activeRaw) {
      try {
        const parsed = JSON.parse(activeRaw);
        if (parsed?.id && parsed.status === 'OPEN' && !seenIds.has(parsed.id)) {
          seenIds.add(parsed.id);
          list.push(parsed);
        }
      } catch {}
    }
  }

  return list;
}
