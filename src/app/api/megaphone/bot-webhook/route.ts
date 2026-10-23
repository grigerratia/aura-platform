// src/app/api/megaphone/bot-webhook/route.ts
// Webhook para integración de Bot de WhatsApp (Respuesta Rápida de Comercios al Megáfono)

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { submitMegaphoneQuote } from '@/lib/megaphone';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storePhone, requestId, priceUsd, note, photoUrl, apiSecret } = body;

    // Validación de Token Secreto si está configurado en variables de entorno
    const expectedSecret = process.env.MEGAPHONE_BOT_SECRET;
    if (expectedSecret && apiSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'No autorizado: apiSecret no coincide con el configurado.' },
        { status: 401 }
      );
    }

    if (!storePhone || !requestId || priceUsd === undefined) {
      return NextResponse.json(
        {
          error: 'Parámetros incompletos. Se requiere: storePhone, requestId y priceUsd.',
        },
        { status: 400 }
      );
    }

    // Normalizar número telefónico (últimos 10 dígitos venezolanos)
    const cleanPhone = String(storePhone).replace(/[^0-9]/g, '');
    const phoneSuffix = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;

    // Localizar tienda por whatsapp o owner_whatsapp
    const { data: stores, error: storeErr } = await supabase
      .from('stores')
      .select('id, name, whatsapp, owner_whatsapp, plan_tier, megaphone_quota_used')
      .or(`whatsapp.ilike.%${phoneSuffix}%,owner_whatsapp.ilike.%${phoneSuffix}%`)
      .limit(1);

    if (storeErr || !stores || stores.length === 0) {
      return NextResponse.json(
        {
          error: `No se encontró ninguna vitrina comercial registrada con el número ${storePhone}.`,
        },
        { status: 404 }
      );
    }

    const matchedStore = stores[0];

    // Enviar cotización rápida con auto-seeding
    const result = await submitMegaphoneQuote({
      requestId,
      storeId: matchedStore.id,
      priceUsd: Number(priceUsd),
      quickNote: note ? String(note).slice(0, 90) : undefined,
      photoUrl: photoUrl || undefined,
    });

    if (!result.success) {
      if (result.quotaExceeded) {
        return NextResponse.json(
          {
            error: 'CUOTA_EXCEDIDA',
            message: result.message,
            quotaExceeded: true,
            storeName: matchedStore.name,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: result.error || 'Error al registrar cotización.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      storeId: matchedStore.id,
      storeName: matchedStore.name,
      quoteId: result.quote?.id,
      autoSeededProductId: result.autoSeededProductId,
      message: `Cotización de $${priceUsd} enviada con éxito para la vitrina ${matchedStore.name}.`,
    });
  } catch (err: any) {
    console.error('Error en webhook de Megáfono:', err);
    return NextResponse.json(
      { error: err.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
