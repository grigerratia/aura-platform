'use client';

import { Product } from '@/types';
import { useGameSound } from '@/hooks/useGameSound';
import { Lock, Unlock, Zap, Flame, Users, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface Props {
  product: Product;
  onSelect: (product: Product) => void;
  badgeType?: 'clearance' | 'last_units' | 'group' | 'discount';
  customBadge?: string;
  groupJoinedCount?: number;
  groupTargetCount?: number;
}

export default function GameProductCard({
  product,
  onSelect,
  badgeType,
  customBadge,
  groupJoinedCount,
  groupTargetCount,
}: Props) {
  const { playTap } = useGameSound();

  const regularPrice = product.regular_price_usd || product.price;
  const auraPrice = product.aura_price_usd || product.price;
  const unlockFee =
    product.unlock_fee_usd !== undefined && product.unlock_fee_usd !== null
      ? product.unlock_fee_usd
      : Number((auraPrice * 0.1).toFixed(2));

  // Determinar badge visual
  const renderBadge = () => {
    if (customBadge) {
      return (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-[#020508]/85 backdrop-blur-md border border-emerald-500/40 text-[#00ffb2] px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md">
          <Sparkles size={11} />
          <span>{customBadge}</span>
        </div>
      );
    }

    if (groupJoinedCount !== undefined && groupTargetCount !== undefined) {
      const remaining = groupTargetCount - groupJoinedCount;
      return (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-[#020508]/85 backdrop-blur-md border border-violet-500/50 text-violet-300 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md">
          <Users size={11} className="text-violet-400" />
          <span>{remaining <= 1 ? 'Falta 1' : `Faltan ${remaining}`}</span>
        </div>
      );
    }

    if (product.stock && product.stock <= 2) {
      return (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-[#020508]/85 backdrop-blur-md border border-rose-500/50 text-rose-300 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md">
          <Flame size={11} className="text-rose-400" />
          <span>Último Par</span>
        </div>
      );
    }

    if (product.discount_percent && product.discount_percent > 0) {
      return (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-[#020508]/85 backdrop-blur-md border border-emerald-500/50 text-[#00ffb2] px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md">
          <Zap size={11} className="text-[#00ffb2]" />
          <span>-{product.discount_percent}%</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      onClick={() => {
        playTap();
        onSelect(product);
      }}
      className="cursor-pointer group relative bg-[#030910] border border-emerald-950/70 hover:border-emerald-500/50 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_-4px_rgba(0,255,178,0.2)] active:scale-[0.98] select-none"
    >
      {/* 1. IMAGEN CON ESQUINAS REDONDEADAS Y BADGE FLOTANTE */}
      <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-slate-950/80 mb-2.5">
        {renderBadge()}

        {product.imageUrl || product.image_url ? (
          <Image
            src={product.imageUrl || product.image_url || ''}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-emerald-950/20 text-emerald-600 font-bold text-xs">
            Aura
          </div>
        )}
      </div>

      {/* 2. CONTENIDO MINIMALISTA (1 LÍNEA DE TÍTULO) */}
      <div className="space-y-1 mb-2 px-0.5">
        <h3 className="text-xs sm:text-sm font-bold text-slate-100 truncate group-hover:text-[#00ffb2] transition-colors">
          {product.name}
        </h3>

        {/* PRECIO TACHADO + PRECIO AURA GRANDE */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          {regularPrice > auraPrice && (
            <span className="text-[11px] text-slate-500 line-through font-semibold">
              ${regularPrice.toFixed(2)}
            </span>
          )}
          <span className="text-base sm:text-lg font-black text-white tracking-tight">
            ${auraPrice.toFixed(2)}
          </span>
          <span className="text-[10px] text-emerald-400 font-bold uppercase">USD</span>
        </div>
      </div>

      {/* 3. ÚNICO BOTÓN DE ACCIÓN LLAMATIVO CON GAME-SWEEP */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          playTap();
          onSelect(product);
        }}
        className="game-sweep w-full cursor-pointer bg-gradient-to-r from-emerald-900/90 via-emerald-700/80 to-teal-800 text-white font-black py-2 sm:py-2.5 px-2 rounded-xl text-xs transition border border-emerald-500/40 hover:border-emerald-400 flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
      >
        <Unlock size={13} className="text-[#00ffb2]" />
        <span className="truncate">Desbloquea con ${unlockFee.toFixed(2)}</span>
      </button>
    </div>
  );
}

