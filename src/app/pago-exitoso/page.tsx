// src/app/pago-exitoso/page.tsx
'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

function PagoExitosoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get('ref') || searchParams.get('identifier') || '';

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
            Tu arancel de desbloqueo y custodia ha sido procesado exitosamente por la red bancaria.
          </p>
        </div>

        {ref && (
          <div className="p-3 bg-[#020508] border border-slate-800 rounded-2xl flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Identificador:</span>
            <span className="text-[#00ffb2] font-bold">{ref}</span>
          </div>
        )}

        <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-left text-xs text-emerald-200">
          <ShieldCheck size={20} className="text-[#00ffb2] shrink-0" />
          <span className="leading-tight">
            Tu turno y precio están ahora custodiados y congelados en el sistema de Aura.
          </span>
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full bg-gradient-to-r from-emerald-500 via-[#00ffb2] to-teal-400 hover:brightness-110 text-slate-950 font-black py-3.5 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
        >
          <span>Volver a la Aplicación</span>
          <ArrowRight size={16} />
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
