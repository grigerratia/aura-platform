'use client';

import { useState } from 'react';
import { Wallet, ShieldCheck, Crown, Sparkles, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useGameSound } from '@/hooks/useGameSound';

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
  const { playTap } = useGameSound();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="bg-[#030910] rounded-3xl p-5 sm:p-6 border border-emerald-950/80 shadow-2xl space-y-5 text-white">
      
      {/* Cabecera del Widget */}
      <div className="flex items-center justify-between border-b border-emerald-950/70 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-950/60 border border-emerald-800/50 text-[#00ffb2] flex items-center justify-center font-bold shadow-[0_0_15px_rgba(0,255,178,0.2)]">
            <Wallet size={20} />
          </div>
          <div>
            <h3 className="font-black text-white text-base tracking-tight">Billetera de Protección Aura</h3>
            <span className="text-xs text-slate-400 font-medium">Saldo a favor acumulado y garantía de compra</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playTap();
            setShowInfo(!showInfo);
          }}
          className="text-slate-400 hover:text-[#00ffb2] p-2 rounded-xl hover:bg-emerald-950/30 transition cursor-pointer"
          title="¿Cómo funciona la billetera?"
        >
          <HelpCircle size={18} />
        </button>
      </div>

      {showInfo && (
        <div className="p-4 bg-[#020508] border border-emerald-900/60 rounded-2xl text-xs text-slate-300 space-y-1.5 animate-in fade-in duration-150">
          <div className="font-bold flex items-center gap-1.5 text-[#00ffb2]">
            <ShieldCheck size={16} />
            ¿Qué es el Candado de Confianza Aura?
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Si pagas el anticipo de desbloqueo de una oferta y al llegar a la tienda física el producto no te queda o no cumple tus expectativas, el comercio presiona <em>Liberar Stock</em> y tu dinero se abona automáticamente a esta billetera para usarlo en cualquier otra compra de Aura en 1 clic.
          </p>
        </div>
      )}

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Tarjeta 1: Saldo Disponible */}
        <div className="p-4 rounded-2xl bg-[#020508] border border-emerald-950/70 hover:border-emerald-500/40 transition space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Saldo a Favor Disponible
          </span>
          <div className="text-2xl font-black text-white flex items-baseline gap-1">
            <span className="text-[#00ffb2] drop-shadow-[0_0_8px_rgba(0,255,178,0.4)]">
              ${walletCreditUSD.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 font-bold">USD</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400 block">
            {walletCreditUSD > 0 ? '✓ Listo para aplicar en 1 clic' : 'Sin saldo pendiente'}
          </span>
        </div>

        {/* Tarjeta 2: Nivel de Confianza (Trust Score) */}
        <div className="p-4 rounded-2xl bg-[#020508] border border-emerald-950/70 hover:border-emerald-500/40 transition space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Reputación de Asistencia
          </span>
          <div className="text-2xl font-black text-white flex items-center gap-1.5">
            <ShieldCheck size={20} className="text-emerald-400" />
            <span>{trustScore} / 100</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400 block">
            {trustScore >= 90 ? '🌟 Cliente Confiable' : 'Puntaje en desarrollo'}
          </span>
        </div>

        {/* Tarjeta 3: Membresía Aura VIP */}
        <div className={`p-4 rounded-2xl border transition space-y-1 ${
          isVip 
            ? 'bg-violet-950/20 border-violet-800/40 text-white' 
            : 'bg-[#020508] border-emerald-950/70 text-white'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Membresía Comprador
          </span>
          <div className="text-2xl font-black flex items-center gap-1.5">
            <Crown size={20} className={isVip ? 'text-violet-400' : 'text-slate-500'} />
            <span className={isVip ? 'text-violet-300' : 'text-slate-200'}>
              {isVip ? 'Aura VIP' : 'Estándar'}
            </span>
          </div>
          <span className={`text-[11px] font-semibold block ${isVip ? 'text-violet-400' : 'text-slate-400'}`}>
            {isVip 
              ? '✓ Acceso prioritario activo' 
              : 'Pase prioritario a Remates ($2/mes)'}
          </span>
        </div>

      </div>

    </div>
  );
}
