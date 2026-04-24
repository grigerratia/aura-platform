import { create } from 'zustand';
import { Product } from '../types';

interface CartItem extends Product {
  quantity: number;
  sale_price?: number | null;
  discount_percentage?: number | null;
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

  getItemFinalPrice: (item: CartItem) => number;
  // -----------------------------------------------------
  generateWhatsAppLink: (shopPhone: string, shopName: string, clientData: ClientData) => string;
}

//Interfaz de datos del cliente
interface ClientData {
  name: string;
  phone: string;
  address: string;
  idDocument: string;
  email: string;
  pdfUrl?: string;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  tasa: 35.0,

  setTasa: (nuevaTasa: number) => set({ tasa: nuevaTasa }),

  // Definición del helper
  getItemFinalPrice: (item: CartItem) => {
    const hasDbDiscountPercent = typeof item.discount_percentage === 'number' && item.discount_percentage > 0;
    const hasDbSalePrice = typeof item.sale_price === 'number' && item.sale_price < item.price;

    if (hasDbDiscountPercent) return item.price * (1 - item.discount_percentage! / 100);
    if (hasDbSalePrice) return item.sale_price!;
    return item.price;
  },

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

  getTotal: () => {
    // Usamos get().getItemFinalPrice para acceder a la función
    return get().items.reduce((acc, item) => acc + (get().getItemFinalPrice(item) * item.quantity), 0);
  },

  // En tu archivo src/store/useCart.ts
  generateWhatsAppLink: (shopPhone, shopName, clientData) => {
    const state = get();
    const itemsList = state.items
      .map(i => `- ${i.name} (x${i.quantity}) - $${(state.getItemFinalPrice(i) * i.quantity).toFixed(2)}`)
      .join('\n');

    const total = state.items.reduce((acc, i) => acc + (state.getItemFinalPrice(i) * i.quantity), 0).toFixed(2);

    const message = `*Nuevo Pedido - ${shopName}*
--------------------------
*Datos del Cliente:*
👤 Nombre: ${clientData.name}
🆔 Documento: ${clientData.idDocument}
📧 Email: ${clientData.email}
📱 Teléfono: ${clientData.phone}
📍 Dirección: ${clientData.address}
FACTURA DEÑ CÑIENTE: 

*Detalle del Pedido:*
${itemsList}

💰 *Total a pagar: $${total}*
--------------------------
¿Podrían confirmarme la disponibilidad?`;

    return `https://wa.me/${shopPhone}?text=${encodeURIComponent(message)}`;
  }
}));