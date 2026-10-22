'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoriteProductsState {
  favorites: string[]; // Lista de IDs de productos guardados individualmente
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
}

export const useFavoriteProducts = create<FavoriteProductsState>()(
  persist(
    (set, get) => ({
      favorites: [],

      isFavorite: (productId: string) => {
        if (!productId) return false;
        return get().favorites.includes(productId);
      },

      toggleFavorite: (productId: string) => {
        if (!productId) return;
        const current = get().favorites;
        const exists = current.includes(productId);
        const updated = exists
          ? current.filter((id) => id !== productId)
          : [...current, productId];

        set({ favorites: updated });
      },

      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: 'aura-favorite-products-storage',
    }
  )
);

