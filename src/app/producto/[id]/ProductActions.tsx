// src/app/producto/[id]/ProductActions.tsx
'use client';

import { useCart } from '@/store/useCart'; // Ajusta la ruta si tu store está en otro lado
import { MessageCircle, Plus, Check } from 'lucide-react';

export default function ProductActions({ product }: { product: any }) {
  const addItem = useCart((state: any) => state.addItem);

  // Extraemos el carrito (asumiendo que en tu store se llama cart o items)
  const cart = useCart((state: any) => state.cart || state.items || []);
  const isInCart = cart.some((item: any) => item.id === product.id);

  const handleWhatsApp = () => {
    const message = `Hola, estoy interesado en el producto: ${product.name}`;
    window.open(`https://wa.me/584120000000?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleWhatsApp}
        className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold hover:bg-emerald-600 transition flex items-center justify-center gap-2 shadow-md"
      >
        <MessageCircle size={20} /> Contactar por WhatsApp
      </button>

      {!isInCart ? (
        <button
          onClick={() => addItem(product)}
          className="w-full border-2 border-brand-primary text-brand-primary py-4 rounded-xl font-bold hover:bg-brand-primary/10 transition flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Agregar al carrito
        </button>
      ) : (
        <button
          disabled
          className="w-full bg-slate-100 text-slate-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <Check size={20} /> Ya está en el carrito
        </button>
      )}
    </div>
  );
}