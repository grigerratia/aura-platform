'use client';

import { useState } from 'react';
import { Product, Store } from '@/types';
import { Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import ReserveProductModal from '@/components/ReserveProductModal';

interface Props {
  product: Product;
  store: Store;
  tasa: number;
}

export default function ProductActions({ product, store, tasa }: Props) {
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);

  // Validamos el stock
  const isOutOfStock = product.stock_status === 'sold_out' || (typeof product.stock === 'number' && product.stock <= 0);

  return (
    <div className="space-y-4">
      {isOutOfStock ? (
        <button
          disabled
          className="w-full bg-slate-200 text-slate-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 cursor-not-allowed"
        >
          Agotado en Tienda
        </button>
      ) : (
        <button
          onClick={() => setIsReserveModalOpen(true)}
          className="cursor-pointer w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-teal-500/25 transition-all transform active:scale-98 flex items-center justify-center gap-2"
        >
          <Clock size={20} />
          Apartar por 3 Horas (Pago en Tienda)
        </button>
      )}

      {/* Modal de Reserva */}
      <ReserveProductModal
        product={product}
        store={store}
        tasa={tasa}
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
      />
    </div>
  );
}