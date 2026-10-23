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
      .select('*')
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
      .select('*')
      .eq('id', params.storeId)
      .maybeSingle();

    if (storeErr || !store) {
      console.error('Error buscando vitrina para cotizar:', storeErr);
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

    // Obtener información de la solicitud para auto-seeding
    const { data: reqData } = await supabase
      .from('megaphone_requests')
      .select('query_text, category_id')
      .eq('id', params.requestId)
      .maybeSingle();

    const productTitle = reqData?.query_text || 'Artículo Consultado';
    const productCategory = reqData?.category_id || 'Moda';

    // 2. AUTO-ALIMENTACIÓN COMPLETA DE CATÁLOGO (products + store_products)
    let autoSeededProductId: string | undefined;
    try {
      const uniqueSlug = `${productTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
      
      const { data: newProd, error: pError } = await supabase
        .from('products')
        .insert([{
          name: productTitle,
          slug: uniqueSlug,
          description: params.quickNote ? `Cotizado vía El Megáfono: ${params.quickNote}` : 'Disponible en vitrina física',
          category: productCategory,
          archetype: 'RETAIL_STANDARD',
          regular_price_usd: params.priceUsd,
          aura_price_usd: params.priceUsd,
          price: params.priceUsd,
          unlock_fee_usd: Math.round(params.priceUsd * 0.05 * 100) / 100,
          imageUrl: params.photoUrl || '/aura-logo.png',
          auto_confirm_stock: true,
          published_at: new Date().toISOString(),
        }])
        .select('*')
        .single();

      if (pError) {
        console.error('Error insertando producto auto-alimentado:', pError);
      }

      if (newProd?.id) {
        autoSeededProductId = newProd.id;
        const { error: spError } = await supabase
          .from('store_products')
          .insert([{
            store_id: params.storeId,
            product_id: newProd.id,
            price: params.priceUsd,
            stock: 5,
            is_active: true,
            discount_percent: 0,
            metadata: {
              is_wholesale: false,
              has_discount: false,
              source: 'megaphone_auto_seeded',
            },
          }]);

        if (spError) {
          console.error('Error asociando producto a tienda en store_products:', spError);
        }
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
      .select('*')
      .single();

    if (quoteErr) {
      console.error('Error insertando cotización en Supabase:', quoteErr);
      return { success: false, error: quoteErr.message };
    }

    // Incrementar cuota usada en la tienda
    await supabase
      .from('stores')
      .update({ megaphone_quota_used: currentQuotaUsed + 1 })
      .eq('id', params.storeId);

    const fullQuote: MegaphoneQuote = {
      ...quote,
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        rating: store.rating || 4.9,
        sector_zone: store.sector_zone || store.zone || 'Sector Centro',
        zone: store.zone,
        address: store.address,
        whatsapp: store.whatsapp,
        logo_url: store.logo_url,
      } as Store,
    };

    return {
      success: true,
      quote: fullQuote,
      autoSeededProductId,
    };
  } catch (err: any) {
    console.error('Error en submitMegaphoneQuote:', err);
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

    // Obtener cotización
    const { data: quote, error: qErr } = await supabase
      .from('megaphone_quotes')
      .select('*')
      .eq('id', params.quoteId)
      .single();

    if (qErr || !quote) {
      return { success: false, error: 'No se encontró la cotización seleccionada.' };
    }

    // Obtener tienda y solicitud en paralelo
    const [storeRes, reqRes] = await Promise.all([
      supabase.from('stores').select('*').eq('id', quote.store_id).maybeSingle(),
      quote.request_id
        ? supabase.from('megaphone_requests').select('*').eq('id', quote.request_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const targetStore = storeRes.data;
    if (!targetStore) {
      return { success: false, error: 'No se encontró el comercio asociado a la cotización.' };
    }

    const queryText = reqRes.data?.query_text || 'Artículo Consultado';
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

      // Descartar resto de cotizaciones de la misma solicitud
      await supabase
        .from('megaphone_quotes')
        .update({ status: 'REJECTED' })
        .eq('request_id', quote.request_id)
        .neq('id', params.quoteId);
    }

    // Registrar reserva activa de 90 minutos en la tabla reservations con estado 'pending'
    const reservationPayload = {
      pin_code: pin,
      pin: pin,
      store_id: targetStore.id,
      store_name: targetStore.name,
      store_whatsapp: targetStore.whatsapp || '584120000000',
      store_address: targetStore.address || targetStore.zone || 'Centro de Cumaná',
      product_id: quote.auto_seeded_product_id || null,
      product_name: queryText,
      product_image: quote.photo_url || null,
      customer_name: params.customerName || 'Comprador Radar (Megáfono)',
      customer_phone: params.customerPhone || '04120000000',
      price_usd: priceUsd,
      total_price: priceUsd,
      unlock_fee_usd: Math.round(priceUsd * 0.05 * 100) / 100,
      store_pay_balance_usd: priceUsd,
      bcv_rate: params.bcvRate || 1,
      status: 'pending',
      category_archetype: 'RETAIL_STANDARD',
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };

    const { data: resData, error: rInsertErr } = await supabase
      .from('reservations')
      .insert([reservationPayload])
      .select('*')
      .single();

    if (rInsertErr) {
      console.error('Error insertando reserva de megáfono en Supabase:', rInsertErr);
    }

    const revealedStore: Partial<Store> = {
      id: targetStore.id,
      name: targetStore.name,
      slug: targetStore.slug,
      address: targetStore.address || targetStore.zone || 'Centro de Cumaná',
      whatsapp: String(targetStore.whatsapp || '584120000000'),
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
    const { data: quotes, error: quotesErr } = await supabase
      .from('megaphone_quotes')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (quotesErr || !quotes || quotes.length === 0) {
      if (quotesErr) console.warn('Error fetching quotes from Supabase:', quotesErr);
      return [];
    }

    // Obtener los comercios vinculados de manera segura
    const storeIds = Array.from(new Set(quotes.map((q) => q.store_id).filter(Boolean)));
    let storeMap: Record<string, Partial<Store>> = {};

    if (storeIds.length > 0) {
      const { data: stores } = await supabase
        .from('stores')
        .select('*')
        .in('id', storeIds);

      if (stores) {
        storeMap = stores.reduce((acc, s) => {
          acc[s.id] = s;
          return acc;
        }, {} as Record<string, Partial<Store>>);
      }
    }

    return quotes.map((q) => ({
      ...q,
      store: storeMap[q.store_id] || {
        id: q.store_id,
        name: 'Vitrina Local',
        sector_zone: 'Sector Centro',
        rating: 4.9,
      },
    })) as unknown as MegaphoneQuote[];
  } catch (err) {
    console.warn('Error en fetchQuotesForRequest:', err);
    return [];
  }
}

/**
 * Carga solicitudes abiertas de Megáfono para una tienda física
 */
export async function fetchOpenRequestsForStore(
  storeId: string,
  categoryId?: string
): Promise<(MegaphoneRequest & { alreadyQuoted?: boolean })[]> {
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
    if (error || !data) {
      if (error) console.error('Error fetching open megaphone requests:', error);
      return [];
    }

    // Marcar cuáles ya fueron cotizadas por esta vitrina
    const reqIds = data.map((r) => r.id);
    let quotedSet = new Set<string>();

    if (reqIds.length > 0) {
      const { data: quotes } = await supabase
        .from('megaphone_quotes')
        .select('request_id')
        .eq('store_id', storeId)
        .in('request_id', reqIds);

      if (quotes) {
        quotes.forEach((q) => quotedSet.add(q.request_id));
      }
    }

    return data.map((r) => ({
      ...r,
      alreadyQuoted: quotedSet.has(r.id),
    })) as (MegaphoneRequest & { alreadyQuoted?: boolean })[];
  } catch {
    return [];
  }
}
