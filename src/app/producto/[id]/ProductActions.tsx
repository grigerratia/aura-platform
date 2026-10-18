'use client';

import { useState } from 'react';
import { Product, Store } from '@/types';
import { Clock, ShieldCheck, CheckCircle2, Users } from 'lucide-react';
import ReserveProductModal from '@/components/ReserveProductModal';
import WaitlistModal from '@/components/WaitlistModal';

interface Props {
  product: Product;
  store: Store;
  tasa: number;
}

export default function ProductActions({ product, store, tasa }: Props) {
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);

  // Validamos el stock
  const isOutOfStock = product.stock_status === 'sold_out' || (typeof product.stock === 'number' && product.stock <= 0);

  return (
    <div className="space-y-4">
      {isOutOfStock ? (
        <div className="space-y-2">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <Users size={16} className="text-amber-600 shrink-0" />
            <span>Este producto se encuentra en <strong>Reserva Temporal</strong> o agotado para hoy.</span>
          </div>

          <button
            onClick={() => setIsWaitlistModalOpen(true)}
            className="cursor-pointer w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-4 rounded-2xl font-black text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Users size={18} />
            Anotarme en la Fila de Espera (Mismo Precio)
          </button>
        </div>
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

      {/* Modal de Fila de Espera */}
      <WaitlistModal
        product={product}
        store={store}
        isOpen={isWaitlistModalOpen}
        onClose={() => setIsWaitlistModalOpen(false)}
      />
    </div>
  );
}