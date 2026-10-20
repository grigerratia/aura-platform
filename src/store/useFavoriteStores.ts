'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

interface FavoriteStoresState {
  favorites: string[]; // IDs de tiendas favoritas / seguidas
  toggleFavorite: (storeId: string) => Promise<void>;
  isFavorite: (storeId: string) => boolean;
  syncWithSupabase: () => Promise<void>;
}

export const useFavoriteStores = create<FavoriteStoresState>()(
  persist(
    (set, get) => ({
      favorites: [],

      isFavorite: (storeId: string) => {
        return get().favorites.includes(storeId);
      },

      toggleFavorite: async (storeId: string) => {
        const current = get().favorites;
        const exists = current.includes(storeId);
        const updated = exists
          ? current.filter((id) => id !== storeId)
          : [...current, storeId];

        set({ favorites: updated });

        // Intentar sincronizar con Supabase si el usuario está autenticado
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            if (exists) {
              await supabase
                .from('store_favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('store_id', storeId);
            } else {
              await supabase.from('store_favorites').upsert({
                user_id: user.id,
                store_id: storeId,
              });
            }
          }
        } catch {
          // Si falla la red o no hay sesión, se conserva localmente sin romper la experiencia
        }
      },

      syncWithSupabase: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data } = await supabase
            .from('store_favorites')
            .select('store_id')
            .eq('user_id', user.id);

          if (data && data.length > 0) {
            const dbIds = data.map((item: any) => item.store_id);
            const combined = Array.from(new Set([...get().favorites, ...dbIds]));
            set({ favorites: combined });
          }
        } catch {
          // Ignorar silenciosamente
        }
      },
    }),
    {
      name: 'aura_favorite_stores_v1',
    }
  )
);

