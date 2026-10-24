'use client';

import { Product } from '@/types';
import { useGameSound } from '@/hooks/useGameSound';
import { Unlock, Zap, Flame, Users, Sparkles, MapPin, Star, Heart, ArrowRight } from 'lucide-react';

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
  // Favorito individual del producto
  isFavoriteProduct?: boolean;
  onToggleFavoriteProduct?: () => void;
  // Seguir a la tienda
  isFollowingStore?: boolean;
  onToggleFollowStore?: () => void;
  onSelectStore?: (storeId: string) => void;

  // Compatibilidad hacia atrás opcional
  isFavoriteStore?: boolean;
  onToggleFavoriteStore?: () => void;
  // Ocultar descuentos (para Radar, que es exclusivamente buscador a precio normal)
  hideDiscounts?: boolean;
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
  isFavoriteProduct,
  onToggleFavoriteProduct,
  isFollowingStore,
  onToggleFollowStore,
  onSelectStore,
  isFavoriteStore,
  onToggleFavoriteStore,
  hideDiscounts = false,
}: Props) {
  const { playTap } = useGameSound();

  const regularPrice = product.regular_price_usd || product.price;
  const auraPrice = product.aura_price_usd || product.price;
  const unlockFee =
    product.unlock_fee_usd !== undefined && product.unlock_fee_usd !== null
      ? product.unlock_fee_usd
      : Number((auraPrice * 0.05).toFixed(2));

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

    if (!hideDiscounts && product.discount_percent && product.discount_percent > 0) {
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

        {/* Botón de favorito exclusivo del producto individual (Wishlist) */}
        {(onToggleFavoriteProduct || onToggleFavoriteStore) && (
          <button
            type="button"
            title={
              (isFavoriteProduct ?? isFavoriteStore)
                ? 'Quitar de mis favoritos'
                : 'Guardar en mis favoritos'
            }
            onClick={(e) => {
              e.stopPropagation();
              playTap();
              if (onToggleFavoriteProduct) onToggleFavoriteProduct();
              else if (onToggleFavoriteStore) onToggleFavoriteStore();
            }}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-[#020508]/80 backdrop-blur-md text-rose-400 hover:scale-115 transition-transform active:scale-90 shadow-md cursor-pointer"
          >
            <Heart
              size={13}
              className={
                (isFavoriteProduct ?? isFavoriteStore)
                  ? 'fill-rose-500 text-rose-500'
                  : 'text-slate-400 hover:text-rose-400'
              }
            />
          </button>
        )}

        {product.imageUrl || product.image_url ? (
          <img
            src={product.imageUrl || product.image_url || ''}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-emerald-950/20 text-emerald-500 font-bold text-xs">
            Aura
          </div>
        )}
      </div>

      {/* 2. CONTENIDO MINIMALISTA (METADATOS DE TIENDA + SEGUIMIENTO + TÍTULO + PRECIO) */}
      <div className="space-y-1 mb-2 px-0.5">
        {/* Metadatos de Tienda: Nombre, Seguir Tienda, Distancia y Estrellas */}
        {(storeName || distanceFormatted || storeRating) && (
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            {storeName && (
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  onClick={
                    onSelectStore && product.store_id
                      ? (e) => {
                          e.stopPropagation();
                          playTap();
                          onSelectStore(product.store_id!);
                        }
                      : undefined
                  }
                  title={onSelectStore ? `Ver vitrina de ${storeName}` : storeName}
                  className={`truncate max-w-[75px] sm:max-w-[85px] font-medium text-slate-400 group-hover:text-slate-300 ${
                    onSelectStore ? 'hover:text-[#00ffb2] hover:underline cursor-pointer' : ''
                  }`}
                >
                  {storeName}
                </span>

                {/* Botón sutil para Seguir / Siguiendo a la Tienda */}
                {onToggleFollowStore && (
                  <button
                    type="button"
                    title={isFollowingStore ? `Dejar de seguir a ${storeName}` : `Seguir vitrina de ${storeName}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTap();
                      onToggleFollowStore();
                    }}
                    className={`px-1.5 py-0.5 rounded text-[8.5px] font-semibold transition-all flex items-center gap-0.5 cursor-pointer shrink-0 ${
                      isFollowingStore
                        ? 'bg-emerald-500/20 text-[#00ffb2] border border-emerald-500/30'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    <span>{isFollowingStore ? 'Siguiendo' : '+ Seguir'}</span>
                  </button>
                )}
              </div>
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

        {/* PRECIO REGULAR EN RADAR O PRECIO TACHADO + OFERTA EN RELÁMPAGO */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          {!hideDiscounts && regularPrice > auraPrice && (
            <span className="text-[10px] text-slate-500 line-through font-light">
              ${regularPrice.toFixed(2)}
            </span>
          )}
          <span className="text-sm sm:text-base font-black text-slate-100 tracking-tight">
            ${(hideDiscounts ? regularPrice : auraPrice).toFixed(2)}
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
        className="game-sweep w-full cursor-pointer bg-gradient-to-r from-emerald-900/90 via-emerald-700/80 to-teal-800 text-slate-100 font-bold py-1.5 sm:py-2 px-2 rounded-xl text-[11px] sm:text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
      >
        <ArrowRight size={13} className="text-[#00ffb2]" />
        <span className="truncate">
          {hideDiscounts
            ? 'Ir por este producto'
            : product.discount_percent && product.discount_percent > 0
            ? `Desbloquear (-${product.discount_percent}%)`
            : unlockFee > 0
            ? `Desbloquear $${unlockFee.toFixed(2)}`
            : 'Desbloquear'}
        </span>
      </button>
    </div>
  );
}
