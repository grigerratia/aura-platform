"use client";

import { useCart } from "../store/useCart";
import { Plus, Star, Truck } from "lucide-react";

// He extendido temporalmente la interfaz aquí para mostrarte el potencial.
// Deberías agregar estos campos (como opcionales "?") a tu archivo /types.ts real.
export interface ExtendedProduct {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  originalPrice?: number; // Para mostrar precios tachados (Ofertas)
  rating?: number; // Ej: 4.8
  reviewsCount?: number; // Ej: 150
  shortDescription?: string; // Descripción de 2 líneas
  isFreeShipping?: boolean; // Etiqueta verde de envío
}

interface Props {
  product: ExtendedProduct;
  tasa: number;
}

export function ProductCard({ product, tasa }: Props) {
  const addItem = useCart((state) => state.addItem);

  // Formato VES
  const priceVES = (product.price * tasa).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Cálculo del porcentaje de descuento si existe un precio original mayor
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200">

      {/* --- Etiquetas flotantes (Oferta / Más vendido) --- */}
      {hasDiscount && (
        <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">
          -{discountPercent}% OFF
        </div>
      )}

      {/* --- Contenedor de Imagen (Estilo Alibaba) --- */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-50 mb-3 flex items-center justify-center">
        <img
          src={product.imageUrl || '/placeholder.png'}
          alt={product.name}
          className="w-full h-full object-contain p-2 mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* --- Información del producto (Estilo Amazon/ML) --- */}
      <div className="flex flex-col flex-1">
        {/* Título: Máximo 2 líneas con puntos suspensivos */}
        <h3 className="font-medium text-slate-900 text-sm leading-snug line-clamp-2 mb-1 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Reseñas (Opcional, estilo Amazon) */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex text-amber-400">
            <Star size={14} fill="currentColor" strokeWidth={0} />
            <span className="text-xs font-bold text-slate-700 ml-1">{product.rating || "4.5"}</span>
          </div>
          <span className="text-[11px] text-slate-500">
            ({product.reviewsCount || "0"})
          </span>
        </div>

        {/* Descripción corta (Opcional, máximo 2 líneas) */}
        {product.shortDescription && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3">
            {product.shortDescription}
          </p>
        )}

        {/* --- Sección de Precios y Envío (Alineada al fondo con mt-auto) --- */}
        <div className="mt-auto space-y-1">
          {/* Precio Original Tachado */}
          {hasDiscount && (
            <span className="block text-xs text-slate-400 line-through">
              US$ {product.originalPrice?.toFixed(2)}
            </span>
          )}

          {/* Precio Actual USD y VES */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-semibold text-slate-900">US$</span>
              <span className="text-2xl font-black text-slate-900 leading-none">
                {product.price.toFixed(2)}
              </span>
            </div>
            <span className="text-xs font-semibold text-emerald-600 mt-1">
              Bs. {priceVES}
            </span>
          </div>

          {/* Etiqueta de Envío Gratis (Estilo ML) */}
          {product.isFreeShipping !== false && ( // Asumimos true por defecto o lo validas
            <div className="flex items-center gap-1 text-emerald-600 mt-1">
              <Truck size={14} />
              <span className="text-xs font-bold">Envío gratis</span>
            </div>
          )}
        </div>
      </div>

      {/* --- Botón de añadir al carrito --- */}
      <button
        onClick={() => addItem(product as any)}
        className="mt-4 w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
      >
        <Plus size={18} strokeWidth={2.5} />
        <span className="font-bold text-sm">Agregar al carrito</span>
      </button>
    </div>
  );
}