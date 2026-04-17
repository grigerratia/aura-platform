// 1. IMPORTANTE: Como este componente tiene un botón con clic, debe ser Client Component
"use client";

import { Product } from "../types";
import { Plus } from "lucide-react";
// 2. Importamos nuestro hook del carrito
import { useCart } from "../store/useCart";

export function ProductCard({ product }: { product: Product }) {
  // 3. Extraemos la función de añadir del store
  const addItem = useCart((state) => state.addItem);

  return (
    <div className="group relative bg-white rounded-aura p-4 shadow-sm hover:shadow-xl transition-all border border-slate-100">
      {/* Contenedor de Imagen */}
      <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 mb-4">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>

      {/* Información del producto */}
      <div className="space-y-1">
        <h3 className="font-bold text-slate-800 leading-tight">
          {product.name}
        </h3>
        <p className="text-xl font-black text-slate-900">${product.price}</p>
      </div>

      {/* 4. El Botón: Ahora llama a addItem al hacer clic */}
      <button
        onClick={() => addItem(product)}
        className="mt-4 w-full bg-brand-primary text-white py-2 rounded-aura flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
      >
        <Plus size={18} strokeWidth={3} />
        <span className="font-bold text-sm">Añadir</span>
      </button>
    </div>
  );
}