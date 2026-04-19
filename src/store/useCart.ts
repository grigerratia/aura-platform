import { create } from 'zustand';
import { Product } from '../types';

interface CartItem extends Product {
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  tasa: number;
  setTasa: (tasa: number) => void;
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  increaseItem: (id: string) => void;
  decreaseItem: (id: string) => void;
  getTotal: () => number;
  generateWhatsAppLink: (shopPhone: string, shopName: string) => string;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  tasa: 35.0,

  setTasa: (nuevaTasa: number) => set({ tasa: nuevaTasa }),

  addItem: (product: Product) => set((state) => {
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

  removeItem: (id: string) => set((state) => ({
    items: state.items.filter((i) => i.id !== id),
  })),

  increaseItem: (id: string) => set((state) => ({
    items: state.items.map((i) =>
      i.id === id ? { ...i, quantity: i.quantity + 1 } : i
    ),
  })),

  decreaseItem: (id: string) => set((state) => ({
    items: state.items.map((i) =>
      i.id === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i
    ),
  })),

  getTotal: () => get().items.reduce((acc, i) => acc + (i.price * i.quantity), 0),

  generateWhatsAppLink: (shopPhone, shopName) => {
    const totalUSD = get().getTotal();
    const tasa = get().tasa;
    const totalVES = (totalUSD * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 });

    const itemsList = get().items
      .map(i => `• ${i.name} (x${i.quantity}) - $${(i.price * i.quantity).toFixed(2)}`)
      .join('\n');

    const rawMessage =
      `Olá! Vengo de *Aura* ✨\n\n` +
      `🛍️ *Pedido para: ${shopName}*\n\n` +
      `${itemsList}\n\n` +
      `💰 *TOTAL USD: $${totalUSD.toFixed(2)}*\n` +
      `💵 *TOTAL Bs: Bs. ${totalVES}*\n\n` +
      `¿Me confirman disponibilidad para concretar el pago?`;

    return `https://wa.me/${shopPhone}?text=${encodeURIComponent(rawMessage)}`;
  }
}));