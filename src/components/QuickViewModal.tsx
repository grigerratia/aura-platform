"use client";

import { useCart } from "../store/useCart";
import { Plus, Star, X, ChevronRight, Truck } from "lucide-react";
import Link from "next/link";
import { ExtendedProduct } from "./ProductCard";

interface QuickViewModalProps {
  product: ExtendedProduct;
  tasa: number;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, tasa, isOpen, onClose }: QuickViewModalProps) {
  const addItem = useCart((state) => state.addItem);

  // Si no está abierto, no renderizamos nada en el DOM
  if (!isOpen) return null;

  // --- Lógica de Precios Sincronizada ---
  const hasDbDiscountPercent = typeof product.discount_percentage === 'number' && product.discount_percentage > 0;
  const hasDbSalePrice = typeof product.sale_price === 'number' && product.sale_price < product.price;

  const hasDiscount = hasDbDiscountPercent || hasDbSalePrice;

  // Calculamos el precio final en USD
  let currentUSD = product.price;
  if (hasDbDiscountPercent) {
    currentUSD = product.price * (1 - product.discount_percentage! / 100);
  } else if (hasDbSalePrice) {
    currentUSD = product.sale_price!;
  }

  // Calculamos el porcentaje a mostrar
  const discountPercent = hasDbDiscountPercent
    ? product.discount_percentage!
    : (hasDiscount ? Math.round(((product.price - currentUSD) / product.price) * 100) : 0);

  const priceVES = (currentUSD * tasa).toLocaleString("es-VE", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={(e) => { e.preventDefault(); onClose(); }}
    >
      {/* Contenedor del Modal */}
      <div
        className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="cursor-pointer absolute top-4 right-4 z-10 p-2 bg-slate-100 hover:bg-red-100 hover:text-red-600 rounded-full text-slate-500 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Mitad Izquierda: Imagen Grande */}
        <div className="relative w-full md:w-1/2 bg-slate-50 p-8 flex items-center justify-center min-h-[300px]">
          {/* Etiqueta de Oferta en el Modal */}
          {hasDiscount && (
            <div className="absolute top-4 left-4 z-10 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wide shadow-sm">
              {discountPercent}% OFF
            </div>
          )}
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
              <span className="text-sm font-bold text-slate-700 ml-1">{product.rating || "5.0"}</span>
            </div>
            <span className="text-sm text-slate-500">({product.reviews_count || "0"})</span>
          </div>

          <div className="border-t border-b border-slate-100 py-4 my-2">
            {hasDiscount && (
              <span className="text-sm text-slate-500 line-through">US$ {product.price.toFixed(2)}</span>
            )}
            <div className="flex items-end gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900">US$ {currentUSD.toFixed(2)}</span>
            </div>
            <div className="text-lg font-bold text-emerald-600 mt-1">
              Bs. {priceVES}
            </div>
            {product.free_shipping && (
              <div className="flex items-center gap-1 text-emerald-600 mt-2">
                <Truck size={16} />
                <span className="text-sm font-bold">Envío gratis</span>
              </div>
            )}
          </div>

          <p className="text-slate-600 text-sm mt-4 leading-relaxed">
            {product.shortDescription || "Un producto de excelente calidad, perfecto para tus necesidades diarias. Diseño moderno y gran durabilidad."}
          </p>

          {/* Botones de acción en el Modal */}
          <div className="mt-8 space-y-3">
            <button
              onClick={() => {
                addItem(product as any);
                onClose();
              }}
              className="cursor-pointer w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
            >
              <Plus size={20} strokeWidth={2.5} />
              Agregar al Carrito
            </button>

            <Link
              href={`/producto/${product.id}`}
              className="cursor-pointer w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
            >
              Ver detalles completos <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}