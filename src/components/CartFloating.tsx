// 1. Indicamos que es un Client Component porque usa interactividad (clics y estado)
"use client";

import { useState } from "react";
// 2. Importamos el hook del carrito usando ruta relativa
import { useCart } from "../store/useCart";
// 3. Iconos necesarios (asegúrate de tener lucide-react instalado)
import { ShoppingBag, X, MessageCircle } from "lucide-react";

export function CartFloating() {
  // 4. Extraemos las funciones y datos del store de Zustand
  const { items, getTotal, generateWhatsAppLink, removeItem } = useCart();

  // 5. Estado local para abrir o cerrar el resumen del carrito
  const [isOpen, setIsOpen] = useState(false);

  // 6. Si el carrito está vacío, no renderizamos nada para mantener la interfaz limpia
  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {/* Botón flotante principal (Círculo con cantidad) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-brand-primary text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center gap-2 active:scale-95"
      >
        <ShoppingBag size={24} />
        <span className="font-bold">{items.length}</span>
      </button>

      {/* Panel de resumen (Se muestra solo si isOpen es true) */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 bg-white rounded-aura shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">

          {/* Cabecera del carrito */}
          <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">Tu Pedido</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          {/* Lista de productos agregados */}
          <div className="max-h-60 overflow-y-auto p-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                <div className="flex flex-col max-w-[180px]">
                  <span className="text-slate-800 font-medium truncate">{item.name}</span>
                  <span className="text-xs text-slate-400">Cant: {item.quantity}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">${item.price * item.quantity}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                    title="Eliminar producto"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pie del carrito con Total y botón de WhatsApp */}
          <div className="p-4 bg-slate-50">
            <div className="flex justify-between mb-4 items-center">
              <span className="text-slate-500 font-medium">Subtotal:</span>
              <span className="text-2xl font-black text-brand-primary">${getTotal()}</span>
            </div>

            {/* Este enlace genera el mensaje automático para el vendedor.
                Por ahora el teléfono es estático ("584120000000"), luego lo haremos dinámico.
            */}
            <a
              href={generateWhatsAppLink("584120000000", "Tienda Aura")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-200 active:scale-95"
            >
              <MessageCircle size={20} />
              Enviar Pedido
            </a>

            <p className="text-[10px] text-center text-slate-400 mt-3 uppercase tracking-widest font-bold">
              Finaliza tu compra por WhatsApp
            </p>
          </div>
        </div>
      )}
    </div>
  );
}