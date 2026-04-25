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
  clearCart: () => void;
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

  clearCart: () => set({ items: [] }),

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

  generateWhatsAppLink: (shopPhone, shopName, clientData) => {
    const state = get();

    // Lista de items con un formato más limpio
    const itemsList = state.items
      .map(i => `🔸 ${i.quantity}x ${i.name} - $${(state.getItemFinalPrice(i) * i.quantity).toFixed(2)}`)
      .join('\n');

    const total = state.items.reduce((acc, i) => acc + (state.getItemFinalPrice(i) * i.quantity), 0).toFixed(2);

    // Mensaje estructurado, profesional y con advertencia
    const message = `⚠️ *SISTEMA DE PEDIDOS - NO MODIFICAR ESTE MENSAJE* ⚠️
Para garantizar el procesamiento rápido y exacto de su compra, por favor envíe este mensaje tal cual.

Hola, equipo de *${shopName}*. Deseo procesar el siguiente pedido:

🧾 *FACTURA DIGITAL (PDF):*
${clientData.pdfUrl ? clientData.pdfUrl : '(Documento no disponible)'}

📦 *RESUMEN DEL PEDIDO:*
${itemsList}
-----------------------------------
💰 *TOTAL A PAGAR: $${total} USD*

🚚 *DATOS DE FACTURACIÓN Y ENVÍO:*
👤 Cliente: ${clientData.name}
🆔 CI/RIF: ${clientData.idDocument}
📱 Contacto: ${clientData.phone}
📍 Dirección: ${clientData.address}
📧 Email: ${clientData.email}

Quedo atento a las instrucciones para realizar el pago. ¡Muchas gracias!`;

    return `https://wa.me/${shopPhone}?text=${encodeURIComponent(message)}`;
  }
}));