// src/app/pago-exitoso/page.tsx
// Retorno desde SPIDI. Esta página NO confirma pagos: solo verifica contra el servidor
// (webhook firmado / API oficial de SPIDI) el estado de la fase que se acaba de pagar.
'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, ShieldCheck, Loader2, RefreshCw, Clock } from 'lucide-react';

type Phase = 'aura_fee' | 'store_payment';
type VerifyState = 'checking' | 'paid' | 'pending';

const MAX_AUTO_ATTEMPTS = 10;
const ATTEMPT_DELAY_MS = 2000;

function PagoExitosoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pin = searchParams.get('pin') || '';
  const sessionIdParam = searchParams.get('sessionId') || searchParams.get('session_id') || '';
  const phase: Phase = searchParams.get('phase') === 'store_payment' ? 'store_payment' : 'aura_fee';

  const [verifyState, setVerifyState] = useState<VerifyState>('checking');
  const [sessionId, setSessionId] = useState<string>(sessionIdParam);
  const [bankRef, setBankRef] = useState<string>('');
  const cancelledRef = useRef(false);

  const announceCompletion = useCallback(
    (confirmedSessionId: string, confirmedRef: string) => {
      const payload = {
        type: 'PAYMENT_COMPLETED',
        phase,
        pin,
        sessionId: confirmedSessionId,
        bankReferenceId: confirmedRef,
        status: 'COMPLETED',
        timestamp: Date.now(),
      };

      try {
        localStorage.setItem('aura_last_paid_session', JSON.stringify(payload));
      } catch {}

      try {
        const channel = new BroadcastChannel('aura_payment_channel');
        channel.postMessage(payload);
        setTimeout(() => {
          try {
            channel.close();
          } catch {}
        }, 1200);
      } catch {}
    },
    [phase, pin]
  );

  const verify = useCallback(async (): Promise<boolean> => {
    if (!sessionIdParam && !pin) return false;
    try {
      const query = sessionIdParam
        ? `sessionId=${encodeURIComponent(sessionIdParam)}`
        : `pin=${encodeURIComponent(pin)}&phase=${phase}`;
      const res = await fetch(`/api/spidi/status?${query}`, { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.isPaid && data.sessionId) {
        setSessionId(data.sessionId);
        setBankRef(data.bankReferenceId || '');
        announceCompletion(data.sessionId, data.bankReferenceId || '');
        return true;
      }
    } catch (err) {
      console.warn('[PagoExitoso] Error al verificar estado de pago:', err);
    }
    return false;
  }, [sessionIdParam, pin, phase, announceCompletion]);

  const runVerification = useCallback(async () => {
    cancelledRef.current = false;
    setVerifyState('checking');

    for (let attempt = 0; attempt < MAX_AUTO_ATTEMPTS; attempt++) {
      const paid = await verify();
      if (cancelledRef.current) return;
      if (paid) {
        setVerifyState('paid');
        return;
      }
      await new Promise((r) => setTimeout(r, ATTEMPT_DELAY_MS));
      if (cancelledRef.current) return;
    }
    setVerifyState('pending');
  }, [verify]);

  useEffect(() => {
    runVerification();
    return () => {
      cancelledRef.current = true;
    };
  }, [runVerification]);

  const handleReturnToApp = () => {
    // Si el simulador se abrió desde la app en otra pestaña, volver a esa pestaña
    if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
      try {
        window.opener.focus();
        window.close();
        return;
      } catch (openerErr) {
        console.warn('[PagoExitoso] No se pudo enfocar/cerrar window.opener:', openerErr);
      }
    }

    // Misma pestaña o el navegador no permitió cerrar: la app restaura el estado desde el servidor
    const params = new URLSearchParams({ payment_status: 'success', phase, pin });
    if (sessionId) params.set('session_id', sessionId);
    router.push(`/?${params.toString()}`);
  };

  const isStore = phase === 'store_payment';

  return (
    <div className="min-h-screen bg-[#020508] text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#030812] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {verifyState === 'paid' && (
          <>
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-[#00ffb2]">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">¡Pago Confirmado!</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                {isStore
                  ? 'El pago a la tienda fue acreditado exitosamente.'
                  : 'Tu desbloqueo y custodia ha sido procesado exitosamente por la red bancaria.'}
              </p>
            </div>

            {(bankRef || pin) && (
              <div className="p-3 bg-[#020508] border border-slate-800 rounded-2xl flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">{bankRef ? 'Referencia:' : 'PIN:'}</span>
                <span className="text-[#00ffb2] font-bold">{bankRef || pin}</span>
              </div>
            )}

            <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-left text-xs text-emerald-200">
              <ShieldCheck size={20} className="text-[#00ffb2] shrink-0" />
              <span className="leading-tight">
                {isStore
                  ? 'Tu producto está apartado y tu boleto QR ya está disponible en la app.'
                  : 'Tu turno y precio están custodiados. Continúa con el pago a la tienda.'}
              </span>
            </div>

            <button
              onClick={handleReturnToApp}
              className="w-full bg-gradient-to-r from-emerald-500 via-[#00ffb2] to-teal-400 hover:brightness-110 text-slate-950 font-black py-3.5 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95"
            >
              <span>Regresar a la aplicación</span>
              <ArrowRight size={16} />
            </button>
          </>
        )}

        {verifyState === 'checking' && (
          <>
            <div className="w-16 h-16 bg-slate-800/60 border border-slate-700 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black tracking-tight text-slate-100">Verificando tu pago…</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Estamos confirmando la transacción con la red bancaria. No cierres esta pestaña.
              </p>
            </div>
          </>
        )}

        {verifyState === 'pending' && (
          <>
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-300">
              <Clock size={32} />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black tracking-tight text-slate-100">Aún no vemos el pago</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                La red bancaria todavía no confirmó la transacción. Si ya pagaste, espera unos segundos y vuelve a verificar.
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={runVerification}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RefreshCw size={14} />
                <span>Verificar de nuevo</span>
              </button>
              <button
                onClick={handleReturnToApp}
                className="w-full text-xs text-slate-400 hover:text-white py-1 transition cursor-pointer"
              >
                Volver a la aplicación
              </button>
            </div>
          </>
        )}

        <p className="text-[10px] text-slate-500 font-mono">Procesado y certificado vía SPIDI • Pagos Inmediatos</p>
      </div>
    </div>
  );
}

export default function PagoExitosoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020508] text-white flex items-center justify-center">
          Cargando confirmación...
        </div>
      }
    >
      <PagoExitosoContent />
    </Suspense>
  );
}
