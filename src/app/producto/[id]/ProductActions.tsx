'use client';

import { useCart } from '@/store/useCart';
import { Plus, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function ProductActions({ product }: { product: any }) {
  const addItem = useCart((state: any) => state.addItem);

  // Extraemos el carrito
  const cart = useCart((state: any) => state.cart || state.items || []);
  const isInCart = cart.some((item: any) => item.id === product.id);

  // Validamos el stock
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;

  return (
    <div className="space-y-3">
      {isOutOfStock ? (
        <button
          disabled
          className="w-full bg-slate-300 text-slate-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed"
        >
          Agotado
        </button>
      ) : !isInCart ? (
        <button
          onClick={() => addItem(product)}
          className="cursor-pointer w-full border-2 border-brand-primary text-brand-primary py-4 rounded-xl font-bold hover:bg-brand-primary/10 transition flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Agregar al carrito
        </button>
      ) : (
        // <Link
        //   href="/checkout"
        //   className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold hover:bg-emerald-600 transition flex items-center justify-center gap-2 shadow-md"
        // >
        //   <ShoppingBag size={20} /> Ir a Pagar
        // </Link>
        <button
          className="w-full border-2 border-brand-primary text-brand-primary py-4 rounded-xl font-bold hover:bg-brand-primary/10 transition flex items-center justify-center gap-2"
        >
          <ShoppingBag size={20} /> Agregado al carrito
        </button>
      )}
    </div>
  );
}