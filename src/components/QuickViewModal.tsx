"use client";

import { Star, X, Truck, ShieldCheck, ArrowRight, Store as StoreIcon } from "lucide-react";
import Link from "next/link";
import { Product, Store } from "@/types";

export interface QuickViewModalProps {
  product: Product | null;
  tasa?: number;
  isOpen: boolean;
  onClose: () => void;
  store?: Store;
  onSelectProduct?: (product: Product) => void;
}

export function QuickViewModal({
  product,
  tasa = 500,
  isOpen,
  onClose,
  store,
  onSelectProduct,
}: QuickViewModalProps) {
  if (!isOpen || !product) return null;

  // Lógica de Stock
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
  const isLowStock = typeof product.stock === 'number' && product.stock > 0 && product.stock < 5;

  // Lógica de Precios
  const hasDbDiscountPercent =
    typeof (product.discount_percent ?? product.discount_percentage) === 'number' &&
    (product.discount_percent ?? product.discount_percentage)! > 0;
  const hasDbSalePrice =
    typeof product.sale_price === 'number' && product.sale_price < product.price;

  const hasDiscount = hasDbDiscountPercent || hasDbSalePrice || Boolean(product.is_clearance);

  let currentUSD = product.aura_price_usd || product.price;
  if (hasDbDiscountPercent) {
    currentUSD = product.price * (1 - (product.discount_percent ?? product.discount_percentage!) / 100);
  } else if (hasDbSalePrice) {
    currentUSD = product.sale_price!;
  }

  const originalPriceUSD = product.regular_price_usd || product.price;

  const displayDiscount = hasDbDiscountPercent
    ? (product.discount_percent ?? product.discount_percentage!)
    : hasDiscount && originalPriceUSD > currentUSD
    ? Math.round(((originalPriceUSD - currentUSD) / originalPriceUSD) * 100)
    : 0;

  const priceVES = (currentUSD * tasa).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const ratingFormatted = (product.rating || store?.rating || 5.0).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {/* Contenedor del Modal con estética oscura Aura */}
      <div
        className="relative bg-[#040914] border border-slate-800/80 w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col md:flex-row animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Línea de brillo specular superior */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffb2]/50 to-transparent z-20 pointer-events-none" />

        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
          className="cursor-pointer absolute top-3.5 right-3.5 z-20 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-white/5 active:scale-90 shadow-md"
        >
          <X size={18} />
        </button>

        {/* Mitad Izquierda: Escenario de Imagen */}
        <div
          className={`relative w-full md:w-1/2 bg-gradient-to-b from-slate-950 via-[#050c18] to-slate-950 p-6 sm:p-8 flex items-center justify-center min-h-[260px] sm:min-h-[360px] border-b md:border-b-0 md:border-r border-slate-800/60 overflow-hidden ${
            isOutOfStock ? 'opacity-70 grayscale-[0.4]' : ''
          }`}
        >
          {/* Resplandor ambiental de fondo */}
          <div className="absolute inset-0 bg-radial from-[#00ffb2]/10 via-transparent to-transparent pointer-events-none" />

          {/* Badges de Oferta o Stock */}
          {hasDiscount && displayDiscount > 0 && (
            <div className="absolute top-3.5 left-3.5 z-10 bg-[#020508]/85 border border-[#00ffb2]/40 text-[#00ffb2] text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide backdrop-blur-md shadow-md">
              -{displayDiscount}% OFF
            </div>
          )}

          {isOutOfStock ? (
            <div className="absolute bottom-3.5 left-3.5 z-10 bg-rose-950/80 border border-rose-500/30 text-rose-300 text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md">
              Agotado en tienda
            </div>
          ) : isLowStock ? (
            <div className="absolute bottom-3.5 left-3.5 z-10 bg-amber-950/85 border border-amber-500/30 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md animate-pulse">
              ¡Últimas unidades!
            </div>
          ) : null}

          <img
            src={product.imageUrl || product.image_url || '/placeholder.png'}
            alt={product.name}
            className="w-full h-auto max-h-[300px] sm:max-h-[360px] object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:scale-105"
          />
        </div>

        {/* Mitad Derecha: Detalles del Producto */}
        <div className="w-full md:w-1/2 p-5 sm:p-7 flex flex-col justify-between overflow-y-auto max-h-[60vh] md:max-h-[85vh]">
          <div>
            {/* Meta de Tienda y Rating */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              {store ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium bg-slate-900/80 border border-slate-800/80 px-2.5 py-1 rounded-lg">
                  <StoreIcon size={13} className="text-[#00ffb2] shrink-0" />
                  <span className="font-semibold text-white truncate max-w-[150px]">
                    {store.name}
                  </span>
                  {store.zone && <span className="text-slate-400">• {store.zone}</span>}
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-amber-300 text-xs font-bold shrink-0">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span>{ratingFormatted}</span>
              </div>
            </div>

            {/* Título del Producto */}
            <h2 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight mb-2">
              {product.name}
            </h2>

            {/* Categoría / Marca */}
            {(product.category || product.brand) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                {product.category && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#00ffb2] bg-[#00ffb2]/10 border border-[#00ffb2]/20 px-2 py-0.5 rounded-md">
                    {product.category}
                  </span>
                )}
                {product.brand && (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                    {product.brand}
                  </span>
                )}
              </div>
            )}

            {/* Caja de Precios y Tasa BCV */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 sm:p-4 mb-4 shadow-inner">
              {hasDiscount && originalPriceUSD > currentUSD && (
                <span className="text-xs text-slate-500 line-through block mb-0.5">
                  US$ {originalPriceUSD.toFixed(2)}
                </span>
              )}

              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  US$ {currentUSD.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase">USD</span>
              </div>

              <div className="text-sm sm:text-base font-bold text-[#00ffb2] mt-0.5 flex items-center gap-1.5">
                <span>Bs. {priceVES}</span>
                <span className="text-[10px] font-normal text-slate-400">• Tasa BCV ({tasa} Bs/$)</span>
              </div>

              {/* Indicador de Disponibilidad / Envío */}
              <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs">
                {isOutOfStock ? (
                  <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    Agotado temporalmente
                  </span>
                ) : isLowStock ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    ¡Solo quedan {product.stock} disponibles!
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Disponible en vitrina física
                  </span>
                )}

                {product.free_shipping && (
                  <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                    <Truck size={12} /> Envío gratis
                  </span>
                )}
              </div>
            </div>

            {/* Tallas disponibles si existen */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Tallas disponibles:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.map((size, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Descripción del Producto */}
            <div className="mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Descripción:
              </span>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-h-28 overflow-y-auto pr-1">
                {product.description ||
                  "Producto original verificado disponible para apartado con retiro físico en tienda o delivery local en Cumaná."}
              </p>
            </div>
          </div>

          {/* Botones de acción inferiores */}
          <div className="space-y-2.5 pt-3 border-t border-slate-800/80 mt-auto">
            {isOutOfStock ? (
              <button
                disabled
                className="w-full py-3.5 rounded-2xl font-bold bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed text-sm text-center"
              >
                Agotado en Tienda
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSelectProduct) onSelectProduct(product);
                }}
                className="cursor-pointer w-full py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base text-slate-950 bg-gradient-to-r from-emerald-500 via-[#00ffb2] to-teal-400 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(0,255,178,0.25)] flex items-center justify-center gap-2"
              >
                <span>Ir por este producto</span>
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
              <div className="flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck size={13} />
                <span>Aparta 7 días con 10%</span>
              </div>

              <Link
                href={`/producto/${product.id}${product.store_id ? `?store=${product.store_id}` : ''}`}
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors underline underline-offset-2"
              >
                Ver página completa →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
