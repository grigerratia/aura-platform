// src/types/index.ts

// Definición de un producto para todo el sistema Aura
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  storeId: string;
  isOffer?: boolean; // El signo ? significa que es opcional
}

// Definición de la tienda o negocio
export interface Store {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  whatsapp: string;
  description: string;
  logo_url?: string;
}