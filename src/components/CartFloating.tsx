"use client";

import { useState } from "react";
import { useCart } from "../store/useCart";
import { ShoppingBag, X, Trash2, ChevronRight, Plus, Minus } from "lucide-react";

export function CartFloating({ initialTasa }: { initialTasa: number }) {
  // Importamos los nuevos métodos del store
  const { items, addItem, removeItem, increaseItem, decreaseItem, getTotal } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  const totalUSD = getTotal();
  const totalVES = (totalUSD * initialTasa).toLocaleString("es-VE", { minimumFractionDigits: 2 });

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-50 bg-black text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform"
      >
        <ShoppingBag size={24} />
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
            {items.reduce((acc, item) => acc + item.quantity, 0)}
          </span>
        )}
      </button>

      {isOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setIsOpen(false)} />}

      <div className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b flex justify-between items-center bg-white">
            <h2 className="text-xl font-bold text-gray-900">Tu Pedido</h2>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-900">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {items.length === 0 ? (
              <p className="text-gray-600 text-center mt-10">Tu carrito está vacío.</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={item.imageUrl || '/placeholder.png'} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>

                    <div className="flex items-center gap-3 mt-2">
                      {/* Usamos decreaseItem y increaseItem */}
                      <button
                        onClick={() => decreaseItem(item.id)}
                        className="p-1 border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                      >
                        <Minus size={14} />
                      </button>

                      <span className="text-sm font-medium text-gray-900 w-6 text-center">{item.quantity}</span>

                      <button
                        onClick={() => increaseItem(item.id)}
                        className="p-1 border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                      >
                        <Plus size={14} />
                      </button>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 ml-4 hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="p-6 border-t bg-white space-y-4">
              <div className="flex justify-between text-lg">
                <span className="font-medium text-gray-900">Subtotal:</span>
                <span className="font-bold text-gray-900">${totalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span className="text-gray-600">Total en Bolívares:</span>
                <span className="font-semibold text-gray-800">Bs. {totalVES}</span>
              </div>
              <button
                onClick={() => window.open(useCart.getState().generateWhatsAppLink("584120000000", "Nombre de Tienda"), "_blank")}
                className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2"
              >
                Proceder al Pago <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}