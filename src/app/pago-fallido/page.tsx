// src/app/pago-fallido/page.tsx
'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

function PagoFallidoContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#020508] text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#030812] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-400">
          <XCircle size={36} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">
            No se pudo completar el pago
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            La sesión de pago venció o fue cancelada por la entidad bancaria. No se realizó ningún cargo.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
          >
            <ArrowLeft size={16} />
            <span>Regresar a la Tienda</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-500 font-mono">
          Soporte Aura • Pagos protegidos vía SPIDI
        </p>
      </div>
    </div>
  );
}

export default function PagoFallidoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020508] text-white flex items-center justify-center">Cargando...</div>}>
      <PagoFallidoContent />
    </Suspense>
  );
}

