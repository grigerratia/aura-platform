'use client';

import { Product } from '@/types';
import { useGameSound } from '@/hooks/useGameSound';
import { Unlock, Zap, Flame, Users, Sparkles, MapPin, Star, Heart } from 'lucide-react';
import Image from 'next/image';

interface Props {
  product: Product;
  onSelect: (product: Product) => void;
  badgeType?: 'clearance' | 'last_units' | 'group' | 'discount';
  customBadge?: string;
  groupJoinedCount?: number;
  groupTargetCount?: number;
  storeName?: string;
  storeRating?: number;
  distanceFormatted?: string;
  isFavoriteStore?: boolean;
  onToggleFavoriteStore?: () => void;
}

export default function GameProductCard({
  product,
  onSelect,
  badgeType,
  customBadge,
  groupJoinedCount,
  groupTargetCount,
  storeName,
  storeRating,
  distanceFormatted,
  isFavoriteStore,
  onToggleFavoriteStore,
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
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-[#020508]/85 backdrop-blur-md text-[#00ffb2] px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-md">
          <Sparkles size={11} />
          <span>{customBadge}</span>
        </div>
      );
    }

    if (groupJoinedCount !== undefined && groupTargetCount !== undefined) {
      const remaining = groupTargetCount - groupJoinedCount;
      return (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-[#020508]/85 backdrop-blur-md text-violet-300 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-md">
          <Users size={11} className="text-violet-400" />
          <span>{remaining <= 1 ? 'Falta 1' : `Faltan ${remaining}`}</span>
        </div>
      );
    }

    if (product.stock && product.stock <= 2) {
      return (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-[#020508]/85 backdrop-blur-md text-rose-300 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-md">
          <Flame size={11} className="text-rose-400" />
          <span>Último Par</span>
        </div>
      );
    }

    if (product.discount_percent && product.discount_percent > 0) {
      return (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-[#020508]/85 backdrop-blur-md text-[#00ffb2] px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-md">
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
      className="cursor-pointer group relative flex flex-col justify-between bg-transparent p-0 transition-transform duration-300 hover:scale-[1.01] active:scale-[0.98] select-none"
    >
      {/* 1. IMAGEN DE PRODUCTO (LLENA TODO EL ANCHO DE LA COLUMNA, MÁS GRANDE EN MÓVILES) */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-950/80 mb-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
        {renderBadge()}

        {/* Botón de seguir / favorita para la tienda */}
        {onToggleFavoriteStore && (
          <button
            type="button"
            title={isFavoriteStore ? 'Siguiendo esta tienda' : 'Seguir tienda'}
            onClick={(e) => {
              e.stopPropagation();
              playTap();
              onToggleFavoriteStore();
            }}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-[#020508]/75 backdrop-blur-md text-rose-400 hover:scale-115 transition-transform active:scale-90"
          >
            <Heart
              size={13}
              className={isFavoriteStore ? 'fill-rose-500 text-rose-500' : 'text-slate-400 hover:text-rose-400'}
            />
          </button>
        )}

        {product.imageUrl || product.image_url ? (
          <Image
            src={product.imageUrl || product.image_url || ''}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-emerald-950/20 text-emerald-500 font-bold text-xs">
            Aura
          </div>
        )}
      </div>

      {/* 2. CONTENIDO MINIMALISTA (METADATOS DE TIENDA + TÍTULO + PRECIO) */}
      <div className="space-y-1 mb-2 px-0.5">
        {/* Metadatos de Tienda: Nombre, Distancia y Estrellas */}
        {(storeName || distanceFormatted || storeRating) && (
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            {storeName && (
              <span className="truncate max-w-[90px] font-medium text-slate-400 group-hover:text-slate-300">
                {storeName}
              </span>
            )}

            <div className="flex items-center gap-1.5 shrink-0 ml-auto font-light">
              {distanceFormatted && (
                <span className="flex items-center gap-0.5 text-slate-400">
                  <MapPin size={9} className="text-emerald-400 shrink-0" />
                  <span>{distanceFormatted}</span>
                </span>
              )}

              {storeRating !== undefined && storeRating > 0 && (
                <span className="flex items-center gap-0.5 text-amber-300 font-medium">
                  <Star size={9} className="fill-amber-400 text-amber-400 shrink-0" />
                  <span>{storeRating.toFixed(1)}</span>
                </span>
              )}
            </div>
          </div>
        )}

        <h3 className="text-xs sm:text-sm font-semibold text-slate-200 truncate group-hover:text-emerald-300 transition-colors">
          {product.name}
        </h3>

        {/* PRECIO TACHADO + PRECIO AURA GRANDE */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          {regularPrice > auraPrice && (
            <span className="text-[10px] text-slate-500 line-through font-light">
              ${regularPrice.toFixed(2)}
            </span>
          )}
          <span className="text-sm sm:text-base font-black text-slate-100 tracking-tight">
            ${auraPrice.toFixed(2)}
          </span>
          <span className="text-[9px] text-emerald-400/90 font-bold uppercase">USD</span>
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
        className="game-sweep w-full cursor-pointer bg-gradient-to-r from-emerald-900/90 via-emerald-700/80 to-teal-800 text-slate-100 font-bold py-1.5 sm:py-2 px-2 rounded-xl text-[11px] sm:text-xs transition flex items-center justify-center gap-1 shadow-sm active:scale-95"
      >
        <Unlock size={12} className="text-[#00ffb2]" />
        <span className="truncate">Desbloquea ${unlockFee.toFixed(2)}</span>
      </button>
    </div>
  );
}
