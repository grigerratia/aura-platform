// src/store/useCart.ts
import { create } from 'zustand';
import { Product } from '../types';

// Definimos la estructura de un item dentro del carrito
interface CartItem extends Product {
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  getTotal: () => number;
  // Función para construir el link que enviará la factura al vendedor
  generateWhatsAppLink: (shopPhone: string, shopName: string) => string;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],

  // Agrega un producto o incrementa su cantidad si ya existe
  addItem: (product) => set((state) => {
    const existing = state.items.find((i) => i.id === product.id);
    if (existing) {
      return {
        items: state.items.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };
    }
    return { items: [...state.items, { ...product, quantity: 1 }] };
  }),

  // Elimina un producto por completo del carrito
  removeItem: (id) => set((state) => ({
    items: state.items.filter((i) => i.id !== id),
  })),

  // Calcula el subtotal de la compra
  getTotal: () => get().items.reduce((acc, i) => acc + i.price * i.quantity, 0),

  // Lógica principal: Transforma el carrito en un mensaje legible para WhatsApp
  generateWhatsAppLink: (shopPhone, shopName) => {
    const total = get().getTotal();
    const itemsList = get().items
      .map(i => `• ${i.name} (x${i.quantity}) - $${i.price * i.quantity}`)
      .join('\n');

    // Construimos el mensaje con formato de WhatsApp (negritas y saltos de línea)
    const rawMessage =
      `Olá! Vengo de *Aura* ✨\n\n` +
      `🛍️ *Pedido para: ${shopName}*\n` +
      `--------------------------\n` +
      `${itemsList}\n` +
      `--------------------------\n` +
      `💰 *TOTAL: $${total}*\n\n` +
      `¿Me confirman disponibilidad para concretar el pago?`;

    // EncodeURIComponent convierte el texto en un formato seguro para URLs
    return `https://wa.me/${shopPhone}?text=${encodeURIComponent(rawMessage)}`;
  }
}));