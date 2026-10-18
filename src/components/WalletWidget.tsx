'use client';

import { useState } from 'react';
import { Wallet, ShieldCheck, Crown, Sparkles, ArrowUpRight, HelpCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  walletCreditUSD?: number;
  trustScore?: number;
  isVip?: boolean;
  vipExpiresAt?: string | null;
  onRefresh?: () => void;
}

export default function WalletWidget({
  walletCreditUSD = 0.00,
  trustScore = 100,
  isVip = false,
  vipExpiresAt
}: Props) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5">
      
      {/* Cabecera del Widget */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold shadow-inner">
            <Wallet size={22} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base">Billetera de Protección Aura</h3>
            <span className="text-xs text-slate-500 font-medium">Saldo a favor acumulado y garantía de compra</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="text-slate-400 hover:text-slate-600 p-2 cursor-pointer transition"
          title="¿Cómo funciona la billetera?"
        >
          <HelpCircle size={18} />
        </button>
      </div>

      {showInfo && (
        <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl text-xs text-teal-950 space-y-1.5 animate-in fade-in duration-150">
          <div className="font-bold flex items-center gap-1.5 text-teal-900">
            <ShieldCheck size={16} className="text-teal-600" />
            ¿Qué es el Candado de Confianza Aura?
          </div>
          <p className="text-[11px] text-teal-800 leading-relaxed">
            Si pagas el anticipo de desbloqueo de una oferta y al llegar a la tienda física el producto no te queda o no cumple tus expectativas, el vendedor presiona <em>Liberar Stock</em> y tu dinero se abona automáticamente a esta billetera para usarlo en cualquier otra compra de Aura en 1 clic.
          </p>
        </div>
      )}

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Tarjeta 1: Saldo Disponible */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Saldo a Favor Disponible
          </span>
          <div className="text-2xl font-black text-slate-900">
            ${walletCreditUSD.toFixed(2)} <span className="text-xs text-slate-500">USD</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 block">
            {walletCreditUSD > 0 ? '✓ Listo para aplicar en 1 clic' : 'Sin saldo pendiente'}
          </span>
        </div>

        {/* Tarjeta 2: Nivel de Confianza (Trust Score) */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Reputación de Asistencia
          </span>
          <div className="text-2xl font-black text-indigo-950 flex items-center gap-1.5">
            <ShieldCheck size={20} className="text-indigo-600" />
            <span>{trustScore} / 100</span>
          </div>
          <span className="text-[11px] font-semibold text-indigo-600 block">
            {trustScore >= 90 ? '🌟 Cliente Confiable' : 'Puntaje en desarrollo'}
          </span>
        </div>

        {/* Tarjeta 3: Membresía Aura VIP */}
        <div className={`p-4 rounded-2xl border space-y-1 ${
          isVip 
            ? 'bg-amber-500/10 border-amber-300 text-amber-950' 
            : 'bg-slate-50 border-slate-200/80 text-slate-900'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Membresía Comprador
          </span>
          <div className="text-2xl font-black flex items-center gap-1.5">
            <Crown size={20} className={isVip ? 'text-amber-500' : 'text-slate-400'} />
            <span>{isVip ? 'Aura VIP' : 'Estándar'}</span>
          </div>
          <span className={`text-[11px] font-semibold block ${isVip ? 'text-amber-700' : 'text-slate-500'}`}>
            {isVip 
              ? '✓ Acceso anticipado de 30 min activo' 
              : 'Pase prioritario a Remates ($2/mes)'}
          </span>
        </div>

      </div>

    </div>
  );
}

