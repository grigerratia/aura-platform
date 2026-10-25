// src/app/pago-exitoso/page.tsx
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

function PagoExitosoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId =
    searchParams.get('paid_session') ||
    searchParams.get('sessionId') ||
    searchParams.get('session_id') ||
    searchParams.get('ref') ||
    '';
  const targetId =
    searchParams.get('target_id') ||
    searchParams.get('pin') ||
    searchParams.get('identifier') ||
    '';
  const pin = searchParams.get('pin') || (targetId.startsWith('PIN-') ? targetId.replace('PIN-', '').replace('-TIENDA', '') : targetId);
  const feeType =
    searchParams.get('fee_type') ||
    (targetId.includes('TIENDA') || sessionId.includes('TIENDA') ? 'store_deposit' : 'unlock_fee');

  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    const notifyPaymentCompletion = async () => {
      try {
        // 1. Await persistencia en base de datos (status = 'paid' / 'COMPLETED')
        if (sessionId || pin) {
          await fetch('/api/spidi/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              pin,
              feeType,
              status: 'paid',
            }),
          });
        }
      } catch (err) {
        console.warn('[PagoExitoso] Advertencia al sincronizar estado en servidor:', err);
      } finally {
        setIsSyncing(false);
      }

      // 2. Guardar en localStorage señal inmediata
      try {
        const payload = {
          sessionId,
          targetId: pin || targetId,
          feeType,
          status: 'COMPLETED',
          timestamp: Date.now(),
        };
        localStorage.setItem('aura_last_paid_session', JSON.stringify(payload));
      } catch {}

      // 3. Disparar evento por BroadcastChannel
      try {
        const channel = new BroadcastChannel('aura_payment_channel');
        channel.postMessage({
          type: 'PAYMENT_COMPLETED',
          sessionId,
          targetId: pin || targetId,
          feeType,
          status: 'COMPLETED',
          timestamp: Date.now(),
        });
        setTimeout(() => {
          try {
            channel.close();
          } catch {}
        }, 1200);
      } catch {}
    };

    notifyPaymentCompletion();
  }, [sessionId, targetId, pin, feeType]);

  const handleReturnToApp = () => {
    // Sellar señal fresca en localStorage
    try {
      localStorage.setItem(
        'aura_last_paid_session',
        JSON.stringify({
          sessionId,
          targetId: pin || targetId,
          feeType,
          status: 'COMPLETED',
          timestamp: Date.now(),
        })
      );
    } catch {}

    // Si el simulador se abrió en una pestaña nueva (window.opener existe y no está cerrada)
    if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
      try {
        window.opener.focus();
        window.close();
        return;
      } catch (openerErr) {
        console.warn('[PagoExitoso] No se pudo enfocar/cerrar window.opener:', openerErr);
      }
    }

    // Si por restricción del navegador no se cierra o se abrió en la misma pestaña, redirigir con query params
    const returnUrl = `/?paid_session=${encodeURIComponent(sessionId)}&target_id=${encodeURIComponent(pin || targetId)}&fee_type=${encodeURIComponent(feeType)}&payment_status=success`;
    router.push(returnUrl);
  };

  const isStore = feeType === 'store_deposit';

  return (
    <div className="min-h-screen bg-[#020508] text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#030812] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-[#00ffb2]">
          <CheckCircle2 size={36} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">
            ¡Pago Confirmado!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {isStore
              ? 'El abono inicial del 30% a la tienda ha sido acreditado exitosamente.'
              : 'Tu arancel de desbloqueo y custodia ha sido procesado exitosamente por la red bancaria.'}
          </p>
        </div>

        {(sessionId || targetId) && (
          <div className="p-3 bg-[#020508] border border-slate-800 rounded-2xl flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Transacción / PIN:</span>
            <span className="text-[#00ffb2] font-bold">{targetId || sessionId}</span>
          </div>
        )}

        <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-left text-xs text-emerald-200">
          <ShieldCheck size={20} className="text-[#00ffb2] shrink-0" />
          <span className="leading-tight">
            {isStore
              ? 'Tu producto está ahora apartado por 7 días en el depósito del comercio.'
              : 'Tu turno y precio están ahora custodiados y congelados en el sistema de Aura.'}
          </span>
        </div>

        <button
          onClick={handleReturnToApp}
          className="w-full bg-gradient-to-r from-emerald-500 via-[#00ffb2] to-teal-400 hover:brightness-110 text-slate-950 font-black py-3.5 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95"
        >
          {isSyncing ? (
            <>
              <Loader2 size={16} className="animate-spin text-slate-950" />
              <span>Sincronizando con Aura...</span>
            </>
          ) : (
            <>
              <span>Regresar a la aplicación</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <p className="text-[10px] text-slate-500 font-mono">
          Procesado y certificado vía SPIDI • Pagos Inmediatos
        </p>
      </div>
    </div>
  );
}

export default function PagoExitosoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020508] text-white flex items-center justify-center">Cargando confirmación...</div>}>
      <PagoExitosoContent />
    </Suspense>
  );
}


