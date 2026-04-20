"use client";

import { useState } from "react";
import { useCart } from "../store/useCart";
import { Plus, Star, Truck, Eye, X, ChevronRight } from "lucide-react";
import Link from "next/link";

export interface ExtendedProduct {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  imageUrl?: string;
  rating?: number;
  reviewsCount?: number;
  shortDescription?: string;
  isFreeShipping?: boolean;
}

interface Props {
  product: ExtendedProduct;
  tasa: number;
}

export function ProductCard({ product, tasa }: Props) {
  const addItem = useCart((state) => state.addItem);

  // Estado para controlar el Popup de Vista Rápida
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const hasDiscount = product.salePrice !== undefined && product.salePrice < product.price;
  const currentUSD = hasDiscount ? product.salePrice! : product.price;

  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
    : 0;

  const priceVES = (currentUSD * tasa).toLocaleString("es-VE", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

  return (
    <>
      {/* TARJETA PRINCIPAL */}
      <div className="group relative flex flex-col bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200">

        {/* Etiqueta de Oferta */}
        {hasDiscount && (
          <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide shadow-sm">
            -{discountPercent}% OFF
          </div>
        )}

        {/* Contenedor de Imagen con botón flotante de Vista Rápida */}
        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-50 mb-3 flex items-center justify-center">
          <Link href={`/producto/${product.id}`} className="w-full h-full p-2">
            <img
              src={product.imageUrl || '/placeholder.png'}
              alt={product.name}
              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
            />
          </Link>

          {/* Botón de Vista Rápida (Aparece en hover) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsQuickViewOpen(true);
            }}
            className="absolute bottom-2 center left-1/2 -translate-x-1/2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm text-slate-800 p-2 rounded-full shadow-lg hover:bg-black hover:text-white transition-all duration-300 border border-slate-200"
            title="Vista rápida"
          >
            <Eye size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Información clickeable que lleva a la página dedicada */}
        <Link href={`/producto/${product.id}`} className="flex flex-col flex-1 cursor-pointer">
          <h3 className="font-medium text-slate-900 text-sm leading-snug line-clamp-2 mb-1 min-h-[2.5rem] group-hover:text-brand-primary transition-colors">
            {product.name}
          </h3>

          <div className="flex items-center gap-1 mb-2">
            <div className="flex text-amber-400">
              <Star size={14} fill="currentColor" strokeWidth={0} />
              <span className="text-xs font-bold text-slate-700 ml-1">{product.rating || "4.5"}</span>
            </div>
            <span className="text-[11px] text-slate-500">({product.reviewsCount || "0"})</span>
          </div>

          <div className="mt-auto space-y-1">
            {hasDiscount && (
              <span className="block text-xs text-slate-400 line-through decoration-slate-400/70">
                US$ {product.price.toFixed(2)}
              </span>
            )}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-semibold text-slate-900">US$</span>
                <span className="text-2xl font-black text-slate-900 leading-none">{currentUSD.toFixed(2)}</span>
              </div>
              <span className="text-xs font-semibold text-emerald-600 mt-1">Bs. {priceVES}</span>
            </div>
            {product.isFreeShipping !== false && (
              <div className="flex items-center gap-1 text-emerald-600 mt-1">
                <Truck size={14} />
                <span className="text-xs font-bold">Envío gratis</span>
              </div>
            )}
          </div>
        </Link>

        {/* Botón de Agregar (Tarjeta) */}
        <button
          onClick={(e) => { e.preventDefault(); addItem(product as any); }}
          className="mt-4 w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span className="font-bold text-sm">Agregar</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* MODAL POPUP DE VISTA RÁPIDA (Estilo Amazon) */}
      {/* ========================================== */}
      {isQuickViewOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={(e) => { e.preventDefault(); setIsQuickViewOpen(false); }} // Cierra al hacer clic afuera
        >
          {/* Contenedor del Modal */}
          <div
            className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} // Evita que un clic adentro cierre el modal
          >
            {/* Botón Cerrar */}
            <button
              onClick={() => setIsQuickViewOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-slate-100 hover:bg-red-100 hover:text-red-600 rounded-full text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Mitad Izquierda: Imagen Grande */}
            <div className="w-full md:w-1/2 bg-slate-50 p-8 flex items-center justify-center min-h-[300px]">
              <img
                src={product.imageUrl || '/placeholder.png'}
                alt={product.name}
                className="w-full h-full max-h-[400px] object-contain mix-blend-multiply"
              />
            </div>

            {/* Mitad Derecha: Detalles del Producto */}
            <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col overflow-y-auto">
              <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
                {product.name}
              </h2>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-amber-400">
                  <Star size={16} fill="currentColor" strokeWidth={0} />
                  <span className="text-sm font-bold text-slate-700 ml-1">{product.rating || "4.5"}</span>
                </div>
                <span className="text-sm text-blue-600 hover:underline cursor-pointer">
                  {product.reviewsCount || "0"} valoraciones
                </span>
              </div>

              <div className="border-t border-b border-slate-100 py-4 my-2">
                {hasDiscount && (
                  <span className="text-sm text-slate-500 line-through">Precio listado: US$ {product.price.toFixed(2)}</span>
                )}
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">US$ {currentUSD.toFixed(2)}</span>
                  {hasDiscount && (
                    <span className="text-sm font-bold text-red-600 mb-1">(-{discountPercent}%)</span>
                  )}
                </div>
                <div className="text-lg font-bold text-emerald-600 mt-1">
                  Bs. {priceVES}
                </div>
              </div>

              <p className="text-slate-600 text-sm mt-4 leading-relaxed">
                {product.shortDescription || "Un producto de excelente calidad, perfecto para tus necesidades diarias. Diseño moderno y gran durabilidad."}
              </p>

              {/* Botones de acción en el Modal */}
              <div className="mt-8 space-y-3">
                <button
                  onClick={() => {
                    addItem(product as any);
                    setIsQuickViewOpen(false); // Opcional: cerrar el modal tras agregar
                  }}
                  className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
                >
                  <Plus size={20} strokeWidth={2.5} />
                  Agregar al Carrito
                </button>

                <Link
                  href={`/producto/${product.id}`}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  Ver detalles completos <ChevronRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}