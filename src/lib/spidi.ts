import crypto from 'crypto';

export interface SpidiConfig {
  apiUrl: string;
  accountId: string;
  apiToken: string;
  webhookSecret: string;
  agreementId: string;
}

export function getSpidiConfig(): SpidiConfig {
  const apiUrl = (process.env.SPIDI_API_URL || '').replace(/\/+$/, '');
  const accountId = process.env.SPIDI_ACCOUNT_ID || '';
  const apiToken = process.env.SPIDI_API_TOKEN || '';
  const webhookSecret = process.env.SPIDI_WEBHOOK_SECRET || '';
  const agreementId = process.env.SPIDI_AGREEMENT_ID || '';

  const missing = Object.entries({
    SPIDI_API_URL: apiUrl,
    SPIDI_ACCOUNT_ID: accountId,
    SPIDI_API_TOKEN: apiToken,
    SPIDI_WEBHOOK_SECRET: webhookSecret,
    SPIDI_AGREEMENT_ID: agreementId,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`[SPIDI] Faltan variables de entorno: ${missing.join(', ')}`);
  }

  return { apiUrl, accountId, apiToken, webhookSecret, agreementId };
}

/**
 * Fases de pago independientes de una reserva:
 * - aura_fee: Pago 1, comisión de Aura (5%)
 * - store_payment: Pago 2, inicial (30%) o total (95%) para la tienda
 */
export type SpidiPhase = 'aura_fee' | 'store_payment';
export type StorePaymentMode = 'deposit_30' | 'full_95';

export const AURA_FEE_RATE = 0.05;
export const STORE_DEPOSIT_RATE = 0.3;
export const STORE_FULL_RATE = 0.95;

export function isSpidiPhase(value: unknown): value is SpidiPhase {
  return value === 'aura_fee' || value === 'store_payment';
}

/** Monto en USD que corresponde a cada fase, calculado siempre en servidor. */
export function computePhaseAmountUsd(
  priceUsd: number,
  phase: SpidiPhase,
  storeMode: StorePaymentMode = 'deposit_30'
): number {
  const rate =
    phase === 'aura_fee'
      ? AURA_FEE_RATE
      : storeMode === 'full_95'
      ? STORE_FULL_RATE
      : STORE_DEPOSIT_RATE;
  return Number((priceUsd * rate).toFixed(2));
}

/** Identificador único por sesión: PIN-1234-AURA-x1y2 / PIN-1234-TIENDA-x1y2 */
export function buildSpidiIdentifier(pin: string, phase: SpidiPhase): string {
  const nonce = crypto.randomBytes(2).toString('hex');
  const tag = phase === 'aura_fee' ? 'AURA' : 'TIENDA';
  return `PIN-${pin}-${tag}-${nonce}`;
}

export interface CreateButtonSessionParams {
  amountUsd: number;
  identifier: string; // e.g., "PIN-1234-AURA-ab12"
  description: string;
  phase: SpidiPhase;
  durationMinutes?: number; // 5 a 20 minutos según especificación SPIDI
  successUrl?: string;
  failureUrl?: string;
  webhookUrl?: string;
  agreementId?: string;
}

export interface SpidiButtonSessionResponse {
  success: boolean;
  message?: string;
  data: {
    session_id: string;
    session_origin: string;
    payment_url: string;
    currency_reference: string;
    amount_reference: number;
    identifier_label: string;
    identifier: string;
    description: string;
    success_url?: string;
    failure_url?: string;
    webhook_url?: string;
    created_at: string;
    payment_qr?: string; // Base64 data:image/png
    agreement_id?: string;
  };
}

/**
 * Crea una sesión de pago tipo Botón Web en SPIDI
 * Cumple con el contrato oficial: POST /api/v1/ext/payment-sessions/buttons
 */
export async function createSpidiButtonSession(
  params: CreateButtonSessionParams
): Promise<SpidiButtonSessionResponse> {
  const config = getSpidiConfig();
  const endpoint = `${config.apiUrl}/v1/ext/payment-sessions/buttons`;

  // Asegurar monto mínimo operativo en USD (evitar caer por debajo del mínimo de 14 VES)
  const safeAmountUsd = Math.max(0.5, Number(params.amountUsd.toFixed(2)));
  const duration = Math.min(20, Math.max(5, params.durationMinutes || 20));

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://aura-platform.vercel.app').replace(/\/+$/, '');
  const isAuraFee = params.phase === 'aura_fee';
  const payload = {
    amount_reference: safeAmountUsd,
    currency_reference: 'USD',
    identifier_label: isAuraFee ? 'Desbloqueo Aura' : 'Apartado Tienda',
    identifier: params.identifier,
    description:
      params.description || (isAuraFee ? 'Desbloqueo y custodia Aura' : 'Pago de apartado en tienda'),
    duration_minutes: duration,
    success_url: params.successUrl || `${baseUrl}/pago-exitoso`,
    failure_url: params.failureUrl || `${baseUrl}/pago-fallido`,
    webhook_url: params.webhookUrl || `${baseUrl}/api/spidi/webhook`,
    agreement_id: params.agreementId || config.agreementId,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    const errorMsg = data?.message || data?.error || res.statusText;
    throw new Error(`[SPIDI API Error ${res.status}] ${errorMsg}`);
  }

  return data as SpidiButtonSessionResponse;
}

/**
 * Consulta el estado oficial de una sesión en SPIDI
 * Cumple con: GET /api/v1/ext/payment-sessions/status/:session_id
 */
export async function getSpidiSessionStatus(sessionId: string) {
  const config = getSpidiConfig();
  const endpoint = `${config.apiUrl}/v1/ext/payment-sessions/status/${encodeURIComponent(sessionId)}`;

  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
    },
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    const errorMsg = data?.message || data?.error || res.statusText;
    throw new Error(`[SPIDI API Status Error ${res.status}] ${errorMsg}`);
  }

  return data.data;
}

/**
 * Verifica la firma HMAC-SHA256 del webhook de SPIDI
 * REGLA CRÍTICA DE CERTIFICACIÓN SPIDI:
 * 1. Lo que se firma es spidi-timestamp + "." + rawBody
 * 2. Si falta el header spidi-timestamp o spidi-signature, DEBE devolver false y rechazarse con 401.
 * 3. Comparación estrictamente timing-safe (crypto.timingSafeEqual) en hexadecimal.
 */
export function verifySpidiWebhookSignature(
  rawBody: string,
  timestamp: string | null | undefined,
  headerSignature: string | null | undefined,
  secretOverride?: string
): boolean {
  if (!timestamp || !headerSignature) {
    return false;
  }

  const secret = secretOverride || getSpidiConfig().webhookSecret;
  if (!secret) {
    console.error('[SPIDI] Falta webhookSecret para verificar firma');
    return false;
  }

  try {
    const firmable = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac('sha256', secret).update(firmable, 'utf8').digest('hex');

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const headerBuffer = Buffer.from(headerSignature, 'utf8');

    if (expectedBuffer.length !== headerBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, headerBuffer);
  } catch (err) {
    console.error('[SPIDI] Error al verificar firma HMAC:', err);
    return false;
  }
}

