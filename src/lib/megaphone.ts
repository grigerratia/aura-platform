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
 * Límite anti-spam gratuito: 3 solicitudes por día.
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
    } else if (phone) {
      query = query.eq('customer_phone', phone);
    } else {
      // Si es un visitante no identificado, chequear en localStorage del cliente
      if (typeof window !== 'undefined') {
        const localLogs = JSON.parse(localStorage.getItem('aura_megaphone_user_requests') || '[]');
        const validRecent = localLogs.filter((t: number) => t > Date.now() - 24 * 60 * 60 * 1000);
        return validRecent.length;
      }
      return 0;
    }

    const { count, error } = await query;
    if (error) {
      console.warn('Error consultando cuota 24h de Megáfono:', error);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.warn('Fallo al obtener cuota de Megáfono:', err);
    return 0;
  }
}

/**
 * 1. LANZAR EL MEGÁFONO (100% Gratis para el Comprador)
 * Emite la señal al comercio local y activa la sala de cotizaciones en tiempo real.
 */
export async function createMegaphoneRequest(params: CreateMegaphoneRequestParams): Promise<{
  success: boolean;
  request?: MegaphoneRequest;
  error?: string;
}> {
  try {
    const cleanQuery = params.queryText.trim();
    if (!cleanQuery) {
      return { success: false, error: 'Debes indicar qué producto o repuesto estás buscando.' };
    }

    // 1. Verificación de límite anti-spam (máximo 3 solicitudes por día)
    const count = await getUser24hMegaphoneCount(params.userId, params.customerPhone);
    if (count >= 3) {
      return {
        success: false,
        error: 'Has alcanzado el límite de 3 solicitudes gratuitas por hoy. Tu cuota se renovará en 24 horas.'
      };
    }

    // Expiración a los 30 minutos exactos
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

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
      console.error('Error insertando megaphone_request:', error);
      return { success: false, error: error.message };
    }

    // Guardar timestamp en localStorage para clientes sin sesión
    if (typeof window !== 'undefined') {
      try {
        const localLogs = JSON.parse(localStorage.getItem('aura_megaphone_user_requests') || '[]');
        localLogs.push(Date.now());
        localStorage.setItem('aura_megaphone_user_requests', JSON.stringify(localLogs));
      } catch {}
    }

    return {
      success: true,
      request: data as MegaphoneRequest,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado al emitir el Megáfono.' };
  }
}

/**
 * 2. RESPONDER AL MEGÁFONO EN 3 SEGUNDOS (Comerciante / Mostrador)
 * Incluye Candado B2B y Auto-Alimentación Instantánea del Catálogo.
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

    // 1. Obtener solicitud para validar vigencia y dueño
    const { data: request, error: reqErr } = await supabase
      .from('megaphone_requests')
      .select('*')
      .eq('id', params.requestId)
      .single();

    if (reqErr || !request) {
      return { success: false, error: 'La solicitud no existe o ha expirado.' };
    }

    if (request.status !== 'OPEN') {
      return { success: false, error: 'Esta solicitud ya cerró o ya seleccionó una vitrina ganadora.' };
    }

    if (new Date(request.expires_at).getTime() < Date.now()) {
      return { success: false, error: 'El tiempo límite de 30 minutos de esta solicitud ya expiró.' };
    }

    // 2. Obtener datos de la tienda para control de cuotas y auto-alimentación
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('id, name, owner_id, plan_tier, verification_status, megaphone_quota_used, sector_zone')
      .eq('id', params.storeId)
      .single();

    if (storeErr || !store) {
      return { success: false, error: 'Vitrina comercial no encontrada.' };
    }

    // Regla: No auto-responderse a sí mismo si el comerciante fue quien lanzó la búsqueda
    if (request.user_id && store.owner_id && request.user_id === store.owner_id) {
      return { success: false, error: 'No puedes enviar cotizaciones a tu propia solicitud de búsqueda.' };
    }

    // 3. CANDADO DE MONETIZACIÓN B2B:
    // Si la tienda tiene el plan básico (VITRINA_20) y ya consumió >= 5 cotizaciones en el mes actual
    const currentQuotaUsed = store.megaphone_quota_used ?? 0;
    const isBasicPlan = !store.plan_tier || store.plan_tier === 'VITRINA_20';
    if (isBasicPlan && currentQuotaUsed >= 5) {
      return {
        success: false,
        quotaExceeded: true,
        message: 'Has alcanzado el límite de 5 cotizaciones gratuitas de tu Plan Vitrina este mes. Actualiza al Plan Acelerador ($45/mes) para desbloquear cotizaciones ilimitadas en El Megáfono.'
      };
    }

    // 4. AUTO-ALIMENTACIÓN DE CATÁLOGO (CRÍTICO)
    // Busca si la tienda ya tiene este producto en su catálogo o crea uno automáticamente
    let autoSeededProductId: string | undefined;

    try {
      // Buscar coincidencia en productos de la tienda
      const { data: existingSp } = await supabase
        .from('store_products')
        .select('product_id, products(id, name)')
        .eq('store_id', params.storeId)
        .limit(20);

      const queryNormalized = request.query_text.toLowerCase().trim();
      const match = existingSp?.find((item: any) => {
        const prod = Array.isArray(item.products) ? item.products[0] : item.products;
        const pName = prod?.name?.toLowerCase() || '';
        return pName.includes(queryNormalized) || queryNormalized.includes(pName);
      });

      const matchedProd = match ? (Array.isArray(match.products) ? match.products[0] : match.products) : null;
      if (matchedProd?.id) {
        autoSeededProductId = matchedProd.id;
      } else {
        // Auto-crear producto nuevo en la base de datos
        const { data: newProd, error: newProdErr } = await supabase
          .from('products')
          .insert([{
            name: request.query_text,
            description: `Producto añadido automáticamente al responder solicitud del Megáfono para ${request.query_text}.`,
            category: request.category_id || 'Moda',
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
          .single();

        if (!newProdErr && newProd) {
          autoSeededProductId = newProd.id;
          // Vincular con la tienda en store_products
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
              metadata: {
                auto_seeded_from_megaphone: true,
                megaphone_request_id: params.requestId,
              }
            }]);
        }
      }
    } catch (seedErr) {
      console.warn('Auto-seeding de catálogo no crítico omitido:', seedErr);
    }

    // 5. INSERTAR COTIZACIÓN RÁPIDA
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
          id, name, slug, rating, sector_zone, zone, address, whatsapp, owner_whatsapp, logo_url, verification_status
        )
      `)
      .single();

    if (quoteErr) {
      if (quoteErr.code === '23505') {
        return { success: false, error: 'Tu vitrina ya envió una cotización para esta solicitud.' };
      }
      return { success: false, error: quoteErr.message };
    }

    // 6. INCREMENTAR CUOTA UTILIZADA DE LA TIENDA
    await supabase
      .from('stores')
      .update({ megaphone_quota_used: currentQuotaUsed + 1 })
      .eq('id', params.storeId);

    return {
      success: true,
      quote: quote as MegaphoneQuote,
      autoSeededProductId,
      message: 'Cotización enviada exitosamente.'
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al enviar cotización.' };
  }
}

/**
 * 3. ACEPTAR COTIZACIÓN GANADORA (Comprador)
 * Marca la vitrina ganadora, genera el Ticket QR de 90 minutos y revela la tienda física.
 */
export async function acceptMegaphoneQuote(params: AcceptMegaphoneQuoteParams): Promise<{
  success: boolean;
  reservation?: any;
  revealedStore?: Partial<Store>;
  error?: string;
}> {
  try {
    // 1. Obtener la cotización con sus relaciones
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

    if (quote.request?.status === 'LOCKED_WINNER') {
      return { success: false, error: 'Esta solicitud ya tiene una vitrina ganadora asignada.' };
    }

    // 2. Transaccionar estados:
    // a) Marcar esta cotización como ACEPTADA
    await supabase
      .from('megaphone_quotes')
      .update({ status: 'ACCEPTED_BY_BUYER' })
      .eq('id', params.quoteId);

    // b) Cerrar la solicitud con candado ganador
    await supabase
      .from('megaphone_requests')
      .update({ status: 'LOCKED_WINNER' })
      .eq('id', quote.request_id);

    // c) Descartar el resto de cotizaciones de la solicitud
    await supabase
      .from('megaphone_quotes')
      .update({ status: 'REJECTED' })
      .eq('request_id', quote.request_id)
      .neq('id', params.quoteId);

    // 3. GENERAR RESERVA ACTIVA DE 90 MINUTOS EN CAJA
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 90 * 60 * 1000).toISOString(); // 90 minutos de validez
    const store = quote.store;
    const request = quote.request;

    const reservationPayload = {
      pin_code: pin,
      store_id: store.id,
      product_id: quote.auto_seeded_product_id || null,
      customer_name: params.customerName || request.customer_name || 'Comprador Radar',
      customer_phone: params.customerPhone || request.customer_phone || '04120000000',
      selected_size: 'Estándar',
      total_price: quote.price_usd,
      bcv_rate: params.bcvRate || 1,
      status: 'confirmed', // o 'QR_ACTIVE'
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };

    const { data: reservation, error: resErr } = await supabase
      .from('reservations')
      .insert([reservationPayload])
      .select()
      .single();

    if (resErr) {
      console.warn('Advertencia creando registro de reserva en caja:', resErr);
    }

    // 4. Devolver la reserva y los datos completos de la vitrina revelada
    const revealedStore: Partial<Store> = {
      id: store.id,
      name: store.name,
      slug: store.slug,
      address: store.address || `Sector ${store.sector_zone || 'Centro'}`,
      whatsapp: store.whatsapp || store.owner_whatsapp,
      logo_url: store.logo_url,
      rating: store.rating || 4.9,
    };

    return {
      success: true,
      reservation: reservation || {
        ...reservationPayload,
        id: 'mega-' + Date.now(),
        pin,
      },
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
          id, name, slug, rating, sector_zone, zone, address, whatsapp, owner_whatsapp, logo_url, verification_status
        )
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching quotes for request:', error);
      return [];
    }
    return (data || []) as unknown as MegaphoneQuote[];
  } catch {
    return [];
  }
}

/**
 * Carga solicitudes abiertas de Megáfono para una tienda física (según categoría o ciudad)
 */
export async function fetchOpenRequestsForStore(storeId: string, categoryId?: string): Promise<MegaphoneRequest[]> {
  try {
    let query = supabase
      .from('megaphone_requests')
      .select('*')
      .eq('status', 'OPEN')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    const { data: requests, error } = await query;
    if (error || !requests) return [];

    // Opcional: filtrar solicitudes donde esta tienda ya haya cotizado
    const { data: myQuotes } = await supabase
      .from('megaphone_quotes')
      .select('request_id')
      .eq('store_id', storeId);

    const quotedRequestIds = new Set(myQuotes?.map(q => q.request_id) || []);

    return requests.map((r: any) => ({
      ...r,
      alreadyQuoted: quotedRequestIds.has(r.id),
    })) as MegaphoneRequest[];
  } catch {
    return [];
  }
}
