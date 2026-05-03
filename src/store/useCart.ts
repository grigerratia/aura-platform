import { create } from 'zustand';
import { Product } from '../types';

interface CartItem extends Product {
  quantity: number;
  // Estandarizado con tus columnas de Supabase
  sale_price?: number | null;
  discount_percent?: number | null; 
}

interface CartStore {
  items: CartItem[];
  tasa: number;
  store_id: string | null; // Para rastrear la tienda dinámicamente
  setTasa: (tasa: number) => void;
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  increaseItem: (id: string) => void;
  decreaseItem: (id: string) => void;
  getTotal: () => number;
  getItemFinalPrice: (item: CartItem) => number;
  generateWhatsAppLink: (shopPhone: string, shopName: string, clientData: ClientData) => string;
  clearCart: () => void;
}

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
  store_id: null,

  setTasa: (nuevaTasa: number) => set({ tasa: nuevaTasa }),

  getItemFinalPrice: (item: CartItem) => {
    // Prioridad 1: Descuento porcentual
    const hasDbDiscountPercent = typeof item.discount_percent === 'number' && item.discount_percent > 0;
    // Prioridad 2: Precio de oferta fijo
    const hasDbSalePrice = typeof item.sale_price === 'number' && item.sale_price < item.price;

    if (hasDbDiscountPercent) {
      return item.price * (1 - (item.discount_percent ?? 0) / 100);
    }
    if (hasDbSalePrice) {
      return item.sale_price!;
    }
    return item.price;
  },

  addItem: (product: Product) => set((state) => {
    const existing = state.items.find((i) => i.id === product.id);
    
    // Si es el primer item, guardamos el store_id de la tienda actual
    const newStoreId = state.items.length === 0 ? (product.store_id || null) : state.store_id;

    if (existing) {
      return {
        items: state.items.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
        store_id: newStoreId
      };
    }

    return { 
      items: [...state.items, { ...product, quantity: 1 }],
      store_id: newStoreId
    };
  }),

  removeItem: (id: string) => set((state) => {
    const newItems = state.items.filter((i) => i.id !== id);
    return {
      items: newItems,
      // Si el carrito queda vacío, reseteamos el store_id
      store_id: newItems.length === 0 ? null : state.store_id
    };
  }),

  clearCart: () => set({ items: [], store_id: null }),

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
    return get().items.reduce((acc, item) => 
      acc + (get().getItemFinalPrice(item) * item.quantity), 0
    );
  },

  generateWhatsAppLink: (shopPhone, shopName, clientData) => {
    const state = get();

    const itemsList = state.items
      .map(i => `🔸 ${i.quantity}x ${i.name} - $${(state.getItemFinalPrice(i) * i.quantity).toFixed(2)}`)
      .join('\n');

    const totalUsd = state.getTotal().toFixed(2);
    const totalBs = (state.getTotal() * state.tasa).toLocaleString('es-VE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });

    // Mantenemos el tono profesional y autoritario solicitado
    const message = `⚠️ *SISTEMA DE PEDIDOS - NO MODIFICAR ESTE MENSAJE* ⚠️
Para garantizar el procesamiento rápido y exacto de su compra, por favor envíe este mensaje tal cual.

Hola, equipo de *${shopName}*. Deseo procesar el siguiente pedido:

🧾 *FACTURA DIGITAL (PDF):*
${clientData.pdfUrl ? clientData.pdfUrl : '(Cargando documento...)'}

📦 *RESUMEN DEL PEDIDO:*
${itemsList}
-----------------------------------
💰 *TOTAL A PAGAR:*
USD: $${totalUsd}
VES: ${totalBs} Bs. (Tasa: ${state.tasa})

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