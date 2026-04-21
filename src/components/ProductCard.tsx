"use client";

import { useState } from "react";
import { useCart } from "../store/useCart";
import { Plus, Star, Truck, Eye } from "lucide-react";
import Link from "next/link";
import { QuickViewModal } from "./QuickViewModal";

export interface ExtendedProduct {
  id: string;
  name: string;
  price: number;
  sale_price?: number | null;
  discount_percentage?: number | null;
  imageUrl?: string;
  rating?: number;
  reviews_count?: number;
  shortDescription?: string;
  free_shipping?: boolean;
}

interface Props {
  product: ExtendedProduct;
  tasa: number;
}

export function ProductCard({ product, tasa }: Props) {
  const addItem = useCart((state) => state.addItem);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);


  // 1. Verificamos si hay un descuento porcentual válido de Supabase
  const hasDbDiscountPercent = typeof product.discount_percentage === 'number' && product.discount_percentage > 0;

  // 2. Verificamos si hay un precio de oferta específico de Supabase
  const hasDbSalePrice = typeof product.sale_price === 'number' && product.sale_price < product.price;

  // 3. Determinamos si el producto tiene descuento (por % o por precio directo)
  const hasDiscount = hasDbDiscountPercent || hasDbSalePrice;

  // 4. Calculamos el precio final en USD (currentUSD)
  let currentUSD = product.price;

  if (hasDbDiscountPercent) {
    // Si hay %, calculamos el precio reducido: Precio * (1 - % / 100)
    currentUSD = product.price * (1 - product.discount_percentage! / 100);
  } else if (hasDbSalePrice) {
    // Si no hay %, pero sí precio directo, usamos el precio directo
    currentUSD = product.sale_price!;
  }

  // 5. Calculamos el porcentaje a mostrar
  const displayDiscount = hasDbDiscountPercent
    ? product.discount_percentage!
    : (hasDiscount ? Math.round(((product.price - currentUSD) / product.price) * 100) : 0);

  // 6. Formato VES basado en el currentUSD calculado
  const priceVES = (currentUSD * tasa).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <>
      <div className="group relative flex flex-row sm:flex-col bg-white rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 gap-3 sm:gap-0">

        {/* Etiqueta de Oferta */}
        {hasDiscount && (
          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-10 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded sm:rounded-md uppercase tracking-wide shadow-sm">
            {displayDiscount}% OFF
          </div>
        )}

        {/* Contenedor de Imagen */}
        <div className="relative w-[40%] sm:w-full shrink-0 aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-slate-50 mb-0 sm:mb-3 flex items-center justify-center">
          <Link href={`/producto/${product.id}`} className="w-full h-full p-1 sm:p-2 cursor-pointer">
            <img
              src={product.imageUrl || '/placeholder.png'}
              alt={product.name}
              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
            />
          </Link>

          <button
            onClick={(e) => {
              e.preventDefault();
              setIsQuickViewOpen(true);
            }}
            className="cursor-pointer absolute bottom-1 right-1 sm:bottom-2 sm:left-1/2 sm:-translate-x-1/2 bg-white/90 backdrop-blur-sm text-slate-800 rounded-full shadow-lg hover:bg-black hover:text-white transition-all duration-300 border border-slate-200 sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center w-[32px] h-[32px] sm:w-[40px] sm:h-[40px]"
            title="Vista rápida"
          >
            <Eye size={16} sm-size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Contenedor de Información */}
        <div className="flex flex-col flex-1 min-w-0">
          <Link href={`/producto/${product.id}`} className="flex flex-col flex-1 cursor-pointer">
            <h3 className="font-medium text-slate-900 text-[12px] sm:text-sm leading-snug line-clamp-2 mb-1 min-h-[2.2rem] sm:min-h-[2.5rem] group-hover:text-brand-primary transition-colors">
              {product.name}
            </h3>

            <div className="flex items-center gap-1 mb-1 sm:mb-2">
              <div className="flex text-amber-400">
                <Star size={13} className="sm:w-[14px] sm:h-[14px]" fill="currentColor" strokeWidth={0} />
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 ml-1">{product.rating || "5.0"}</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500">({product.reviews_count || "0"})</span>
            </div>

            <div className="mt-auto space-y-0.5 sm:space-y-1">
              {hasDiscount && (
                <span className="block text-[10px] sm:text-xs text-slate-400 line-through decoration-slate-400/70">
                  US$ {product.price.toFixed(2)}
                </span>
              )}
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-900">US$</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{currentUSD.toFixed(2)}</span>
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 mt-0.5 sm:mt-1">Bs. {priceVES}</span>
              </div>
              {product.free_shipping && (
                <div className="flex items-center gap-1 text-emerald-600 mt-0.5 sm:mt-1">
                  <Truck size={13} className="sm:w-[14px] sm:h-[14px]" />
                  <span className="text-[10px] sm:text-xs font-bold truncate">Envío gratis</span>
                </div>
              )}
            </div>
          </Link>

          <button
            onClick={(e) => { e.preventDefault(); addItem(product as any); }}
            className="cursor-pointer mt-2 sm:mt-4 w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-2 sm:py-2.5 rounded-lg sm:rounded-xl flex items-center justify-center gap-1 sm:gap-2 transition-all active:scale-95 shadow-md"
          >
            <Plus size={15} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
            <span className="font-bold text-[11px] sm:text-sm">Agregar</span>
          </button>
        </div>
      </div>

      <QuickViewModal
        product={product}
        tasa={tasa}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  );
}