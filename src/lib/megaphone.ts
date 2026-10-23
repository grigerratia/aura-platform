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
 * Consulta la cantidad de solicitudes lanzadas por el usuario en las últimas 24 horas.
 */
export async function getUser24hMegaphoneCount(userId?: string | null, phone?: string | null): Promise<number> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let query = supabase
      .from('megaphone_requests')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo);

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (phone && phone !== '04120000000') {
      query = query.eq('customer_phone', phone);
    } else {
      return 0;
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
 * Inserta directamente en la tabla megaphone_requests de Supabase.
 */
export async function createMegaphoneRequest(params: CreateMegaphoneRequestParams): Promise<{
  success: boolean;
  request?: MegaphoneRequest;
  error?: string;
}> {
  const cleanQuery = params.queryText.trim();
  if (!cleanQuery) {
    return { success: false, error: 'Ingresa qué artículo estás buscando.' };
  }

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  try {
    const insertPayload = {
      user_id: params.userId || null,
      customer_name: params.customerName?.trim() || 'Comprador Radar',
      customer_phone: params.customerPhone?.trim() || null,
      query_text: cleanQuery,
      category_id: params.categoryId || 'moda',
      city: params.city || 'Cumaná',
      status: 'OPEN',
      expires_at: expiresAt,
    };

    const { data, error } = await supabase
      .from('megaphone_requests')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('Error insertando megaphone_request en Supabase:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      request: data as MegaphoneRequest,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al conectar con la base de datos.' };
  }
}

/**
 * 2. RESPONDER AL MEGÁFONO EN 3 SEGUNDOS (Comerciante / Mostrador)
 * Candado B2B y auto-alimentación directa en el catálogo de Supabase.
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

    // 1. Obtener datos de la tienda desde Supabase
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('id, name, owner_id, plan_tier, verification_status, megaphone_quota_used, sector_zone, zone, address, whatsapp, owner_whatsapp')
      .eq('id', params.storeId)
      .single();

    if (storeErr || !store) {
      return { success: false, error: 'Vitrina comercial no encontrada en la base de datos.' };
    }

    const currentQuotaUsed = store?.megaphone_quota_used ?? 0;
    const isBasicPlan = !store?.plan_tier || store.plan_tier === 'VITRINA_20';

    if (isBasicPlan && currentQuotaUsed >= 5) {
      return {
        success: false,
        quotaExceeded: true,
        message: 'Límite mensual de 5 cotizaciones alcanzado. Actualiza al Plan Acelerador ($45/mes).'
      };
    }

    // 2. Auto-alimentación de catálogo en Supabase
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
    } catch (prodErr) {
      console.warn('Auto-seeding de producto omitido:', prodErr);
    }

    // 3. Insertar cotización en la tabla megaphone_quotes
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
      .single();

    if (quoteErr) {
      console.error('Error insertando cotización en Supabase:', quoteErr);
      return { success: false, error: quoteErr.message };
    }

    // Incrementar cuota usada
    await supabase
      .from('stores')
      .update({ megaphone_quota_used: currentQuotaUsed + 1 })
      .eq('id', params.storeId);

    return {
      success: true,
      quote: quote as MegaphoneQuote,
      autoSeededProductId,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al cotizar.' };
  }
}

/**
 * 3. ACEPTAR COTIZACIÓN GANADORA (Comprador)
 * Actualiza estados en Supabase y crea la reserva en la tabla reservations.
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

    // Obtener cotización con relaciones desde Supabase
    const { data: quote, error: qErr } = await supabase
      .from('megaphone_quotes')
      .select(`
        *,
        request:megaphone_requests (*),
        store:stores (*)
      `)
      .eq('id', params.quoteId)
      .single();

    if (qErr || !quote) {
      return { success: false, error: 'No se encontró la cotización seleccionada.' };
    }

    const targetStore = quote.store;
    const queryText = quote.request?.query_text || 'Artículo Consultado';
    const priceUsd = quote.price_usd || 15;

    // Actualizar estados en Supabase
    await supabase
      .from('megaphone_quotes')
      .update({ status: 'ACCEPTED_BY_BUYER' })
      .eq('id', params.quoteId);

    if (quote.request_id) {
      await supabase
        .from('megaphone_requests')
        .update({ status: 'LOCKED_WINNER' })
        .eq('id', quote.request_id);

      // Descartar resto de cotizaciones
      await supabase
        .from('megaphone_quotes')
        .update({ status: 'REJECTED' })
        .eq('request_id', quote.request_id)
        .neq('id', params.quoteId);
    }

    // Registrar reserva activa de 90 minutos en la tabla reservations
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

    const { data: resData } = await supabase
      .from('reservations')
      .insert([reservationPayload])
      .select()
      .maybeSingle();

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
      reservation: resData || reservationPayload,
      revealedStore,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al aceptar cotización.' };
  }
}

/**
 * Carga cotizaciones activas de una solicitud para el comprador en Radar
 */
export async function fetchQuotesForRequest(requestId: string): Promise<MegaphoneQuote[]> {
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

    if (error) {
      console.warn('Error fetching quotes from Supabase:', error);
      return [];
    }

    return (data || []) as unknown as MegaphoneQuote[];
  } catch {
    return [];
  }
}

/**
 * Carga solicitudes abiertas de Megáfono para una tienda física
 */
export async function fetchOpenRequestsForStore(storeId: string, categoryId?: string): Promise<MegaphoneRequest[]> {
  try {
    const now = new Date().toISOString();
    let query = supabase
      .from('megaphone_requests')
      .select('*')
      .eq('status', 'OPEN')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching open megaphone requests:', error);
      return [];
    }

    return (data || []) as MegaphoneRequest[];
  } catch {
    return [];
  }
}
