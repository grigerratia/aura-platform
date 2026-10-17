"use client";

import { useCart } from "../store/useCart";
import { Clock, Star, X, ChevronRight, Truck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Product } from "@/types";

interface QuickViewModalProps {
  product: Product;
  tasa: number;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, tasa, isOpen, onClose }: QuickViewModalProps) {
  const addItem = useCart((state) => state.addItem);

  // Si no está abierto, no renderizamos nada en el DOM
  if (!isOpen) return null;

  // --- Lógica de Stock ---
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
  const isLowStock = typeof product.stock === 'number' && product.stock > 0 && product.stock < 5;

  // --- Lógica de Precios Sincronizada (Priorizando tabla intermedia) ---
  const hasDbDiscountPercent = typeof (product.discount_percent ?? product.discount_percentage) === 'number' && (product.discount_percent ?? product.discount_percentage)! > 0;
  const hasDbSalePrice = typeof product.sale_price === 'number' && product.sale_price < product.price;

  const hasDiscount = hasDbDiscountPercent || hasDbSalePrice;

  // Calculamos el precio final en USD
  let currentUSD = product.price;
  if (hasDbDiscountPercent) {
    currentUSD = product.price * (1 - (product.discount_percent ?? product.discount_percentage!) / 100);
  } else if (hasDbSalePrice) {
    currentUSD = product.sale_price!;
  }

  // Calculamos el porcentaje a mostrar
  const displayDiscount = hasDbDiscountPercent
    ? (product.discount_percent ?? product.discount_percentage!)
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
        <div className={`relative w-full md:w-1/2 bg-slate-50 p-8 flex items-center justify-center min-h-[300px] ${isOutOfStock ? 'opacity-70 grayscale-[0.5]' : ''}`}>
          {/* Etiqueta de Oferta en el Modal */}
          {hasDiscount && (
            <div className="absolute top-4 left-4 z-10 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wide shadow-sm">
              {displayDiscount}% OFF
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

            {/* Indicador de Disponibilidad */}
            <div className="mt-2 text-sm font-medium">
              {isOutOfStock ? (
                <span className="text-red-500">Producto agotado temporalmente</span>
              ) : isLowStock ? (
                <span className="text-amber-600">¡Solo quedan {product.stock} disponibles!</span>
              ) : typeof product.stock === 'number' ? (
                <span className="text-emerald-600">{product.stock} unidades disponibles</span>
              ) : null}
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
            <Link
              href={`/producto/${product.id}${product.store_id ? `?store=${product.store_id}` : ''}`}
              onClick={onClose}
              className={`cursor-pointer w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 ${
                isOutOfStock
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-700 to-teal-600 hover:from-indigo-600 hover:to-teal-500 text-white'
              }`}
            >
              <Clock size={18} />
              {isOutOfStock ? 'Agotado en Tienda' : 'Apartar y Congelar Precio'}
            </Link>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium pt-1">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Reserva gratis por 3 horas. Pagas al retirar en caja.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}