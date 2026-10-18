'use client';

import { Product } from '@/types';
import { calculateSplitPayment } from '@/lib/monetization';
import { ShieldCheck, Sparkles, CheckCircle2, ArrowRight, Lock } from 'lucide-react';

interface Props {
  product: Product;
  tasa: number;
}

export default function SplitPaymentBreakdownCard({ product, tasa }: Props) {
  const split = calculateSplitPayment(product);

  if (!split.hasSplitPayment) {
    // Si no requiere split payment (reserva simple sin fee)
    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
            Modalidad de Pago
          </span>
          <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
            Reserva 100% Gratuita
          </span>
        </div>
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-slate-600 text-xs">Total a pagar en caja física:</span>
          <div className="text-right">
            <span className="text-lg font-black text-slate-900">${split.auraPriceUSD.toFixed(2)} USD</span>
            <span className="block text-[11px] font-bold text-emerald-600">
              ≈ Bs. {(split.auraPriceUSD * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const feeVES = (split.unlockFeeUSD * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 });
  const balanceVES = (split.storePayBalanceUSD * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 });

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 border border-indigo-800 shadow-xl relative overflow-hidden space-y-4">
      {/* Glow de fondo */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Cabecera de la Ecuación */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 block mb-0.5">
            Ecuación de Ahorro Aura
          </span>
          <div className="flex items-center gap-2">
            {split.regularPriceUSD > split.auraPriceUSD && (
              <span className="text-xs text-slate-400 line-through">
                ${split.regularPriceUSD.toFixed(2)}
              </span>
            )}
            <span className="text-2xl font-black text-white">
              ${split.auraPriceUSD.toFixed(2)} USD
            </span>
            {split.discountPercentage > 0 && (
              <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                {split.discountPercentage}% OFF
              </span>
            )}
          </div>
        </div>

        <span className="text-[11px] font-bold text-teal-300 bg-teal-500/20 px-2.5 py-1 rounded-xl border border-teal-500/30 flex items-center gap-1">
          <Sparkles size={12} /> Split 10% - 90%
        </span>
      </div>

      {/* LOS DOS PASOS TRANSPARENTES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        
        {/* PASO 1: DESBLOQUEO HOY EN AURA */}
        <div className="bg-white/10 p-3.5 rounded-2xl border border-white/15 space-y-1">
          <div className="flex items-center justify-between text-teal-300 font-black text-[11px] uppercase tracking-wider">
            <span>Paso 1: Desbloqueo Hoy</span>
            <Lock size={12} />
          </div>
          <div className="text-xl font-black text-white">
            ${split.unlockFeeUSD.toFixed(2)} USD
          </div>
          <span className="text-[10px] text-teal-200 block">
            Bs. {feeVES} (Pago Móvil / Saldo)
          </span>
          <p className="text-[10px] text-slate-300 pt-1 leading-snug">
            Protegido con <strong>Garantía de Billetera Aura</strong>: si vas a la tienda y no te sirve, se reembolsa a tu saldo.
          </p>
        </div>

        {/* PASO 2: A PAGAR EN LA TIENDA FÍSICA */}
        <div className="bg-white/10 p-3.5 rounded-2xl border border-white/15 space-y-1">
          <div className="flex items-center justify-between text-amber-300 font-black text-[11px] uppercase tracking-wider">
            <span>Paso 2: Al Retirar en Tienda</span>
            <ArrowRight size={12} />
          </div>
          <div className="text-xl font-black text-white">
            ${split.storePayBalanceUSD.toFixed(2)} USD
          </div>
          <span className="text-[10px] text-amber-200 block">
            Bs. {balanceVES} (En caja física)
          </span>
          <p className="text-[10px] text-slate-300 pt-1 leading-snug">
            Pagas directo en el local con Punto de Venta, Efectivo, Pago Móvil o Cashea.
          </p>
        </div>

      </div>

      {/* PIE CON GARANTÍA DE BILLETERA */}
      <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-300">
        <ShieldCheck size={16} className="text-teal-400 shrink-0" />
        <span>Sin riesgo: Tu anticipo está respaldado al 100% por Aura Cumaná.</span>
      </div>
    </div>
  );
}
