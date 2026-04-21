"use client";

import { useState } from "react";
import { useCart } from "../store/useCart";
import { ShoppingBag, X, Trash2, Plus, Minus, MessageCircle } from "lucide-react";

export function CartFloating({ initialTasa }: { initialTasa: number }) {
  const { items, removeItem, increaseItem, decreaseItem } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  // 1. Calculamos los precios reales con descuento aplicado
  const calculateItemPrice = (item: any) => {
    const hasDbDiscountPercent = typeof item.discount_percentage === 'number' && item.discount_percentage > 0;
    const hasDbSalePrice = typeof item.sale_price === 'number' && item.sale_price < item.price;

    if (hasDbDiscountPercent) return item.price * (1 - item.discount_percentage / 100);
    if (hasDbSalePrice) return item.sale_price;
    return item.price;
  };

  const totalUSD = items.reduce((acc, item) => acc + calculateItemPrice(item) * item.quantity, 0);
  const totalOriginal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const ahorro = totalOriginal - totalUSD;
  const totalVES = (totalUSD * initialTasa).toLocaleString("es-VE", { minimumFractionDigits: 2 });

  return (
    <>
      {/* Botón flotante para abrir el carrito */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-50 bg-black text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform cursor-pointer"
      >
        <ShoppingBag size={24} />
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
            {items.reduce((acc, item) => acc + item.quantity, 0)}
          </span>
        )}
      </button>

      {/* Overlay oscuro de fondo */}
      {isOpen && <div className="fixed inset-0 bg-black/40 z-40 cursor-pointer" onClick={() => setIsOpen(false)} />}

      {/* Panel lateral del carrito */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">

          {/* Cabecera del Carrito */}
          <div className="p-6 border-b flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              {/* Nuevo icono y texto */}
              <ShoppingBag size={24} className="text-gray-900" />
              <h2 className="text-xl font-bold text-gray-900">Mi Carrito</h2>
            </div>
            {/* Botón cerrar */}
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-900 cursor-pointer">
              <X size={20} />
            </button>
          </div>

          {/* Lista de Productos (Cuerpo) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {items.length === 0 ? (
              <p className="text-gray-600 text-center mt-10">Tu carrito está vacío.</p>
            ) : (
              items.map((item) => {
                const finalPrice = calculateItemPrice(item);
                const hasDiscount = finalPrice < item.price;
                const discountPercent = item.discount_percentage || Math.round(((item.price - finalPrice) / item.price) * 100);

                return (
                  <div key={item.id} className="flex gap-4 items-center">
                    {/* Imagen y etiqueta de descuento */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                      <img src={item.imageUrl || '/placeholder.png'} alt={item.name} className="w-full h-full object-cover" />
                      {hasDiscount && (
                        <div className="absolute top-1 left-1 bg-red-600 text-white text-[9px] font-bold px-1 rounded">-{discountPercent}%</div>
                      )}
                    </div>

                    {/* Detalles y controles */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 leading-tight">{item.name}</h3>
                      <p className="font-bold text-gray-900 mt-1">${(finalPrice * item.quantity).toFixed(2)}</p>

                      {/* Controles de cantidad - CORREGIDOS */}
                      <div className="flex items-center gap-3 mt-3">
                        {/* Botón Minus - Cambiado borde y color de icono */}
                        <button
                          onClick={() => decreaseItem(item.id)}
                          className="p-1 border border-gray-300 rounded hover:bg-gray-100 text-gray-900 cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>

                        {/* Cantidad - Asegurado color de texto gris oscuro */}
                        <span className="text-sm font-medium text-gray-900 w-6 text-center">{item.quantity}</span>

                        {/* Botón Plus - Cambiado borde y color de icono */}
                        <button
                          onClick={() => increaseItem(item.id)}
                          className="p-1 border border-gray-300 rounded hover:bg-gray-100 text-gray-900 cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>

                        {/* Botón Eliminar */}
                        <button onClick={() => removeItem(item.id)} className="text-red-500 ml-4 hover:text-red-700 cursor-pointer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Totales y Botón de Pago (Pie) */}
          {items.length > 0 && (
            <div className="p-6 border-t bg-white space-y-4">
              <div className="flex justify-between text-lg">
                <span className="font-medium text-gray-900">Subtotal:</span>
                <span className="font-bold text-gray-900">${totalUSD.toFixed(2)}</span>
              </div>
              {ahorro > 0 && (
                <div className="flex justify-between text-sm text-red-600 font-bold">
                  <span>Ahorraste:</span>
                  <span>-${ahorro.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total en Bolívares:</span>
                <span className="font-semibold text-gray-800">Bs. {totalVES}</span>
              </div>
              {/* Botón de pago */}
              <button
                onClick={() => window.open(useCart.getState().generateWhatsAppLink("584120000000", "Nombre de Tienda"), "_blank")}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <MessageCircle size={20} />
                Enviar Pedido por WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}