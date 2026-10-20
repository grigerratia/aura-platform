'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product, Store } from '@/types';
import GameProductCard from '../GameProductCard';
import ThanosCard from '@/components/vfx/ThanosCard';
import AuroraParticles from '../AuroraParticles';
import GameControlBar from '../GameControlBar';
import { AnimatePresence } from 'framer-motion';
import {
  Search,
  Compass,
  X,
  ArrowRight,
  MapPin,
  Star,
  Heart,
  Radar as RadarIcon,
} from 'lucide-react';
import { useGameSound } from '@/hooks/useGameSound';
import { matchProductCategory } from '@/lib/categories';
import {
  CUMANA_CENTER,
  GeoPoint,
  calculateDistanceKm,
  formatDistance,
  getStoreCoordinates,
} from '@/lib/geoDistance';
import { useFavoriteStores } from '@/store/useFavoriteStores';

interface Props {
  products: Product[];
  stores: Store[];
  onSelectProduct: (p: Product) => void;
}

export interface ActiveFiltersState {
  near: boolean;
  rating: boolean;
  favorites: boolean;
}

export default function RadarMode({
  products,
  stores = [],
  onSelectProduct,
}: Props) {
  const { playTap } = useGameSound();
  const { favorites, toggleFavorite, isFavorite } = useFavoriteStores();

  // 1. Ubicación del usuario (por defecto Centro de Cumaná, con detección GPS)
  const [userLocation, setUserLocation] = useState<GeoPoint>(CUMANA_CENTER);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  // 2. Diccionario de tiendas y cálculo de distancias
  const storesById = useMemo(() => {
    const map = new Map<string, Store>();
    stores.forEach((s) => map.set(s.id, s));
    return map;
  }, [stores]);

  const storeDistances = useMemo(() => {
    const distMap = new Map<string, { km: number; formatted: string }>();
    stores.forEach((s) => {
      const coords = getStoreCoordinates(s);
      const km = calculateDistanceKm(userLocation, coords);
      distMap.set(s.id, { km, formatted: formatDistance(km) });
    });
    return distMap;
  }, [stores, userLocation]);

  // 3. Estados de Búsqueda, Categoría y Filtros Multi-Selección
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inputValue, setInputValue] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFiltersState>({
    near: true,
    rating: false,
    favorites: false,
  });

  const toggleFilter = (key: keyof ActiveFiltersState) => {
    playTap();
    setActiveFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    playTap();
    setActiveQuery(inputValue.trim());
  };

  const handleClearSearch = () => {
    playTap();
    setInputValue('');
    setActiveQuery('');
  };

  // 4. Filtrado y ordenamiento de productos en Radar (con deduplicación para evitar duplicados como "Camisa Cubo")
  const filteredProducts = useMemo(() => {
    const q = activeQuery.toLowerCase().trim();

    // Deduplicación preventiva por clave única (evita que el mismo producto aparezca dos veces)
    const seenKeys = new Set<string>();
    const deduplicatedList: Product[] = [];

    for (const p of products) {
      const dedupeKey = p.id || `${p.name}-${p.store_id || ''}`;
      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey);
        deduplicatedList.push(p);
      }
    }

    let list = deduplicatedList;

    // Filtro por categoría oficial (resuelve que no queden prendas en tecnología)
    if (selectedCategory !== 'all') {
      list = list.filter((p) =>
        matchProductCategory(p.category, selectedCategory, p.subcategory, p.name)
      );
    }

    // Filtro por búsqueda textual (nombre, descripción, categoría, subcategoría y tienda)
    if (q) {
      list = list.filter((p) => {
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        const matchSub = (p.subcategory || '').toLowerCase().includes(q);

        const store = p.store_id ? storesById.get(p.store_id) : undefined;
        const matchStore = store ? store.name.toLowerCase().includes(q) : false;

        const matchSizes = Array.isArray(p.sizes)
          ? p.sizes.some((s) => s.toLowerCase().includes(q))
          : false;

        return matchName || matchDesc || matchCat || matchSub || matchStore || matchSizes;
      });
    }

    // Filtro MULTI-SELECT 1: "Mis Tiendas"
    if (activeFilters.favorites) {
      list = list.filter((p) => p.store_id && favorites.includes(p.store_id));
    }

    // Filtro MULTI-SELECT 2: "Mejor Atención" (rating >= 4.5)
    if (activeFilters.rating) {
      list = list.filter((p) => {
        const store = p.store_id ? storesById.get(p.store_id) : undefined;
        const r = store?.rating ?? 4.8;
        return r >= 4.5;
      });
    }

    // Ordenamiento multi-criterio
    return list.sort((a, b) => {
      const distA = a.store_id ? (storeDistances.get(a.store_id)?.km ?? 999) : 999;
      const distB = b.store_id ? (storeDistances.get(b.store_id)?.km ?? 999) : 999;
      const storeA = a.store_id ? storesById.get(a.store_id) : undefined;
      const storeB = b.store_id ? storesById.get(b.store_id) : undefined;
      const ratingA = storeA?.rating ?? 4.8;
      const ratingB = storeB?.rating ?? 4.8;

      if (activeFilters.near) {
        if (activeFilters.rating && Math.abs(distA - distB) < 0.3) {
          return ratingB - ratingA;
        }
        return distA - distB;
      }

      if (activeFilters.rating) {
        return ratingB - ratingA;
      }

      return (b.discount_percent || 0) - (a.discount_percent || 0);
    });
  }, [
    products,
    selectedCategory,
    activeQuery,
    activeFilters,
    favorites,
    storesById,
    storeDistances,
  ]);

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-24 select-none">
      
      {/* 1. ENCABEZADO COMPACTO CON PARTÍCULAS AURORA Y ESTILO WELCOME PORTAL */}
      <div className="relative mx-4 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#050b16]/85 backdrop-blur-xl py-3 px-4 sm:py-3.5 sm:px-5 shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
        {/* Reflejo especular superior fino */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffb2]/40 to-transparent" />

        {/* Partículas activas en el fondo del header */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <AuroraParticles count={14} colors={['#00ffb2', '#10b981', '#06b6d4', '#38bdf8']} />
        </div>

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] sm:text-xs font-semibold tracking-wider uppercase">
              <RadarIcon size={13} className="text-[#00ffb2] animate-pulse drop-shadow-[0_0_6px_rgba(0,255,178,0.5)]" />
              <span>Exploración en Vivo • Cumaná</span>
            </div>

            <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-200 via-[#00ffb2] to-cyan-200 bg-clip-text text-transparent">
              Radar Aura
            </h2>

            <p className="text-[11px] sm:text-xs font-light text-slate-400 truncate max-w-sm sm:max-w-md hidden sm:block">
              Encuentra productos físicos en tiendas locales y aparta con precio especial.
            </p>
          </div>

          {/* Contador de vitrinas compacto */}
          <div className="bg-[#030812]/90 backdrop-blur-xl rounded-xl px-3 py-1.5 flex items-center gap-2 shrink-0 shadow-inner">
            <Compass size={14} className="text-emerald-400" />
            <div className="flex flex-col text-right">
              <span className="text-[9px] uppercase font-light text-slate-400">Vitrinas</span>
              <span className="font-mono text-xs sm:text-sm font-bold text-slate-100">
                {filteredProducts.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BARRA INTEGRADA: BUSCADOR, CATEGORÍAS Y FILTROS EN UNA SOLA FILA */}
      <GameControlBar
        searchPlaceholder="Buscar por producto, marca o tienda..."
        searchValue={inputValue}
        onSearchChange={(val) => {
          setInputValue(val);
          if (!val.trim()) setActiveQuery('');
        }}
        onSearchSubmit={handleSearchSubmit}
        onSearchClear={handleClearSearch}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        favoritesCount={favorites.length}
        accentColor="#00ffb2"
      />

      {/* 3. CUADRÍCULA DIRECTA: 5 COLUMNAS EN PC, 2 EN MÓVIL (SEPARACIÓN DE 4PX EN MÓVIL, MÁS GRANDE) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-3 lg:gap-4 px-2 sm:px-4">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => {
            const store = product.store_id ? storesById.get(product.store_id) : undefined;
            const distance = product.store_id ? storeDistances.get(product.store_id)?.formatted : undefined;
            const storeRating = store?.rating ?? 4.8;
            const isFav = product.store_id ? isFavorite(product.store_id) : false;

            return (
              <ThanosCard
                key={product.id}
                intensity={product.stock && product.stock <= 1 ? 'epic' : 'fast'}
              >
                <GameProductCard
                  product={product}
                  onSelect={onSelectProduct}
                  storeName={store?.name}
                  storeRating={storeRating}
                  distanceFormatted={distance}
                  isFavoriteStore={isFav}
                  onToggleFavoriteStore={
                    product.store_id ? () => toggleFavorite(product.store_id!) : undefined
                  }
                />
              </ThanosCard>
            );
          })}
        </AnimatePresence>

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 text-center space-y-3 bg-[#050b16]/75 backdrop-blur-xl rounded-3xl p-6 shadow-xl">
            <Compass size={36} className="text-emerald-500/40 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-200">
              {activeFilters.favorites
                ? 'No tienes productos de tus tiendas seguidas'
                : 'No encontramos productos con estos criterios'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-light">
              {activeFilters.favorites
                ? 'Toca el corazón en cualquier producto para seguir tiendas y ver sus ofertas aquí.'
                : 'Prueba buscando otro término, cambiando de categoría o desactivando filtros.'}
            </p>
            {(activeQuery || selectedCategory !== 'all' || !activeFilters.near || activeFilters.rating || activeFilters.favorites) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  handleClearSearch();
                  setActiveFilters({ near: true, rating: false, favorites: false });
                }}
                className="mt-2 cursor-pointer bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-[#00ffb2] hover:to-emerald-400 text-slate-100 hover:text-black font-bold px-4 py-2 rounded-xl text-xs transition active:scale-95"
              >
                Restablecer filtros
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
