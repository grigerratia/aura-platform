'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Product, Store } from '@/types';
import { Clock, Eye, Sparkles, Tag, CheckCircle2, Users } from 'lucide-react';
import ReserveProductModal from './ReserveProductModal';
import { QuickViewModal } from './QuickViewModal';
import WaitlistModal from './WaitlistModal';

interface Props {
  product: Product;
  tasa: number;
  store?: Store;
}

export function ProductCard({ product, tasa, store }: Props) {
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  // Lógica de Precios
  const hasDbDiscountPercent = typeof (product.discount_percent ?? product.discount_percentage) === 'number' && (product.discount_percent ?? product.discount_percentage)! > 0;
  const hasDbSalePrice = typeof product.sale_price === 'number' && product.sale_price < product.price;
  const hasDiscount = hasDbDiscountPercent || hasDbSalePrice || product.is_clearance;

  let currentUSD = product.price;
  if (hasDbDiscountPercent) {
    currentUSD = product.price * (1 - (product.discount_percent ?? product.discount_percentage!) / 100);
  } else if (hasDbSalePrice) {
    currentUSD = product.sale_price!;
  }

  const displayDiscount = hasDbDiscountPercent
    ? (product.discount_percent ?? product.discount_percentage!)
    : (hasDiscount && product.price > currentUSD ? Math.round(((product.price - currentUSD) / product.price) * 100) : null);

  const priceVES = (currentUSD * tasa).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // URL del producto
  const productUrl = `/producto/${product.id}${product.store_id ? `?store=${product.store_id}` : ''}`;
  const isOutOfStock = product.stock_status === 'sold_out' || (typeof product.stock === 'number' && product.stock <= 0);
  const isLastUnits = product.stock_status === 'last_units' || (typeof product.stock === 'number' && product.stock > 0 && product.stock <= 3);

  const resolvedStore: Store = store || {
    id: product.store_id || product.storeId || '',
    name: 'Tienda Oficial',
    slug: '',
    address: 'Cumaná, Sucre',
  };

  return (
    <>
      <div className={`group relative flex flex-col bg-white rounded-3xl p-3 sm:p-4 shadow-xs hover:shadow-xl transition-all duration-300 border border-slate-200/80 hover:border-indigo-300 ${isOutOfStock ? 'opacity-65' : ''}`}>
        
        {/* Badges superiores: Remate / Descuento */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
          {product.is_clearance && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Sparkles size={11} /> Remate de Hoy
            </span>
          )}
          {displayDiscount && displayDiscount > 0 && !product.is_clearance && (
            <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              -{displayDiscount}% OFF
            </span>
          )}
        </div>

        {/* Imagen del Producto */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 mb-3 flex items-center justify-center border border-slate-100">
          <Link href={productUrl} className="w-full h-full p-3 cursor-pointer flex items-center justify-center">
            <img
              src={product.imageUrl || product.image_url || '/placeholder.png'}
              alt={product.name}
              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
            />
          </Link>

          {/* Botón de Vista Rápida */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsQuickViewOpen(true);
            }}
            className="cursor-pointer absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-full shadow-md hover:bg-slate-900 hover:text-white transition-all p-2 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 border border-slate-200"
            title="Vista rápida"
          >
            <Eye size={16} />
          </button>
        </div>

        {/* Contenido e Información */}
        <div className="flex flex-col flex-1 min-w-0">
          
          {/* Categoría / Marca */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1">
            <span className="truncate">{product.category || 'Comercio Local'}</span>
            {isLastUnits && (
              <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                ¡Últimas tallas!
              </span>
            )}
          </div>

          {/* Nombre */}
          <Link href={productUrl} className="cursor-pointer mb-2">
            <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Tallas disponibles */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="flex items-center gap-1 mb-3 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium">Tallas:</span>
              {product.sizes.slice(0, 4).map((sz) => (
                <span key={sz} className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                  {sz}
                </span>
              ))}
              {product.sizes.length > 4 && (
                <span className="text-[10px] text-slate-400">+{product.sizes.length - 4}</span>
              )}
            </div>
          )}

          {/* Precios (USD y Bs) */}
          <div className="mt-auto pt-2 border-t border-slate-100">
            {hasDiscount && product.price > currentUSD && (
              <span className="block text-[11px] text-slate-400 line-through">
                ${product.price.toFixed(2)} USD
              </span>
            )}
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900 leading-none">
                  ${currentUSD.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-slate-500">USD</span>
              </div>
              <span className="text-xs font-semibold text-emerald-600">
                Bs. {priceVES}
              </span>
            </div>
          </div>

          {/* Botón de Acción: Fila de Espera si está agotado o Apartar en 1 Clic */}
          {isOutOfStock ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsWaitlistOpen(true);
              }}
              className="cursor-pointer mt-3 w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98 bg-amber-500 hover:bg-amber-400 text-slate-950"
            >
              <Users size={14} />
              <span>Fila de Espera (Avisarme)</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsReserveModalOpen(true);
              }}
              className="cursor-pointer mt-3 w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98 bg-gradient-to-r from-indigo-700 to-teal-600 hover:from-indigo-600 hover:to-teal-500 text-white shadow-indigo-500/20"
            >
              <Clock size={14} />
              <span>Apartar por 3 Horas</span>
            </button>
          )}

        </div>
      </div>

      {/* Modal de Reserva Inmediata */}
      <ReserveProductModal
        product={product}
        store={resolvedStore}
        tasa={tasa}
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
      />

      {/* Modal de Fila de Espera */}
      <WaitlistModal
        product={product}
        store={resolvedStore}
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
      />

      {/* Modal de Vista Rápida */}
      <QuickViewModal
        product={product}
        tasa={tasa}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  );
}