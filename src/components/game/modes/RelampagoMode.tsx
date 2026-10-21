'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product, Store } from '@/types';
import GameProductCard from '../GameProductCard';
import ThanosCard from '@/components/vfx/ThanosCard';
import GameControlBar from '../GameControlBar';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Zap,
  Clock,
  Search,
  X,
  ArrowRight,
  MapPin,
  Star,
  Heart,
  Compass,
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
  stores?: Store[];
  onSelectProduct: (p: Product) => void;
}

export interface ActiveFiltersState {
  near: boolean;
  rating: boolean;
  favorites: boolean;
}

export default function RelampagoMode({
  products,
  stores = [],
  onSelectProduct,
}: Props) {
  const { playTap } = useGameSound();
  const { favorites, toggleFavorite, isFavorite } = useFavoriteStores();

  // 1. Reloj de Cuenta Regresiva al final del día
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Ubicación del usuario (por defecto Centro de Cumaná, con detección GPS)
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
        () => {
          // Si el usuario no otorga permiso, se mantiene Cumaná Centro sin romper la experiencia
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // 3. Diccionario de tiendas y cálculo de distancias
  const storesMap = useMemo(() => {
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

  // 4. Estados de Búsqueda, Categoría y Filtros Multi-Selección (Sin píldoras)
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchInputValue, setSearchInputValue] = useState('');
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
    setActiveQuery(searchInputValue.trim());
  };

  const handleClearSearch = () => {
    playTap();
    setSearchInputValue('');
    setActiveQuery('');
  };

  // 5. Filtrado y Ordenamiento Multi-Criterio de Productos Flash
  const filteredFlashProducts = useMemo(() => {
    const q = activeQuery.toLowerCase().trim();

    // Deduplicación preventiva por ID o Nombre
    const seen = new Set<string>();
    const dedupeProducts = products.filter((p) => {
      const key = p.id || `${p.name}-${p.store_id || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let list = dedupeProducts;

    if (!q) {
      const clearanceList = list.filter(
        (p) =>
          p.is_clearance ||
          (p.discount_percent && p.discount_percent >= 10) ||
          (p.stock && p.stock <= 4) ||
          p.category_archetype === 'GASTRO_FLASH'
      );
      if (clearanceList.length > 0) {
        list = clearanceList;
      }
    }

    // Filtro por categoría oficial
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
        const store = p.store_id ? storesMap.get(p.store_id) : undefined;
        const matchStore = store ? store.name.toLowerCase().includes(q) : false;
        return matchName || matchDesc || matchCat || matchSub || matchStore;
      });
    }

    // Filtro MULTI-SELECT 1: "Mis Tiendas"
    if (activeFilters.favorites) {
      list = list.filter((p) => p.store_id && favorites.includes(p.store_id));
    }

    // Filtro MULTI-SELECT 2: "Mejor Atención" (rating >= 4.5)
    if (activeFilters.rating) {
      list = list.filter((p) => {
        const store = p.store_id ? storesMap.get(p.store_id) : undefined;
        const r = store?.rating ?? 4.8;
        return r >= 4.5;
      });
    }

    // Ordenamiento combinado simultáneo
    return list.sort((a, b) => {
      const distA = a.store_id ? (storeDistances.get(a.store_id)?.km ?? 999) : 999;
      const distB = b.store_id ? (storeDistances.get(b.store_id)?.km ?? 999) : 999;
      const storeA = a.store_id ? storesMap.get(a.store_id) : undefined;
      const storeB = b.store_id ? storesMap.get(b.store_id) : undefined;
      const ratingA = storeA?.rating ?? 4.8;
      const ratingB = storeB?.rating ?? 4.8;

      // Si "Más cerca" está activado:
      if (activeFilters.near) {
        if (activeFilters.rating && Math.abs(distA - distB) < 0.3) {
          return ratingB - ratingA;
        }
        return distA - distB;
      }

      // Si solo "Mejor atención" está activado:
      if (activeFilters.rating) {
        return ratingB - ratingA;
      }

      // Por defecto: mayor descuento
      return (b.discount_percent || 0) - (a.discount_percent || 0);
    });
  }, [
    products,
    selectedCategory,
    activeQuery,
    activeFilters,
    favorites,
    storesMap,
    storeDistances,
  ]);

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-24 select-none">
      
      {/* 1. ENCABEZADO COMPACTO CON PARTÍCULAS AURORA Y ESTILO WELCOME PORTAL */}
      <div className="relative mx-4 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#050b16]/85 backdrop-blur-xl py-3 px-4 sm:py-3.5 sm:px-5 shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
        {/* Reflejo especular superior fino de 1px */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-rose-400/40 to-transparent" />

        {/* Halo de luz ambiental interna sin partículas pesadas */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(220px_circle_at_15%_0%,rgba(244,63,94,0.14),transparent_75%)]" />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 text-rose-400 text-[10px] sm:text-xs font-semibold tracking-wider uppercase">
              <Zap size={13} className="fill-rose-400 text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
              <span>Liquidaciones & Oportunidades del Día</span>
            </div>

            <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-rose-300 via-amber-200 to-rose-400 bg-clip-text text-transparent">
              Relámpago Aura
            </h2>

            <p className="text-[11px] sm:text-xs font-light text-slate-400 truncate max-w-sm sm:max-w-md hidden sm:block">
              Últimas unidades a precio de remate físico y cupos gastronómicos antes de cerrar caja.
            </p>
          </div>

          {/* Reloj Digital de Cuenta Regresiva Compacto */}
          <div className="bg-[#030812]/90 backdrop-blur-xl rounded-xl px-3 py-1.5 flex items-center gap-2 shrink-0 shadow-inner">
            <Clock size={15} className="text-rose-400 animate-pulse drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
            <div className="flex flex-col text-right">
              <span className="text-[9px] uppercase font-light text-slate-400">Vence hoy</span>
              <div className="flex items-center gap-0.5 font-mono text-xs sm:text-sm font-bold text-slate-100">
                <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="text-rose-400">:</span>
                <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="text-rose-400">:</span>
                <span className="text-rose-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BARRA INTEGRADA: BUSCADOR, CATEGORÍAS Y FILTROS EN UNA SOLA FILA */}
      <GameControlBar
        searchPlaceholder="Buscar en relámpago, marcas o tiendas..."
        searchValue={searchInputValue}
        onSearchChange={(val) => {
          setSearchInputValue(val);
          if (!val.trim()) setActiveQuery('');
        }}
        onSearchSubmit={handleSearchSubmit}
        onSearchClear={handleClearSearch}
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => setSelectedCategory(catId)}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        favoritesCount={favorites.length}
        accentColor="#f43f5e"
      />

      {/* 3. CUADRÍCULA DIRECTA: 5 COLUMNAS EN PC, 2 EN MÓVIL (SEPARACIÓN DE 4PX EN MÓVILES) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-3 lg:gap-4 px-2 sm:px-4">
        <AnimatePresence mode="popLayout">
          {filteredFlashProducts.map((product) => {
            const store = product.store_id ? storesMap.get(product.store_id) : undefined;
            const distance = product.store_id ? storeDistances.get(product.store_id)?.formatted : undefined;
            const storeRating = store?.rating ?? 4.8;
            const isFav = product.store_id ? isFavorite(product.store_id) : false;

            return (
              <ThanosCard key={product.id} intensity="epic">
                <GameProductCard
                  product={product}
                  onSelect={onSelectProduct}
                  badgeType="clearance"
                  customBadge={product.discount_percent ? `-${product.discount_percent}%` : 'Flash'}
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

        {filteredFlashProducts.length === 0 && (
          <div className="col-span-full py-16 text-center space-y-3 bg-[#050b16]/75 backdrop-blur-xl rounded-3xl p-6 shadow-xl">
            <Compass size={36} className="text-rose-400/50 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-200">
              {activeFilters.favorites
                ? 'No tienes ofertas relámpago de tus tiendas seguidas'
                : 'No encontramos remates activos con estos criterios'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-light">
              {activeFilters.favorites
                ? 'Toca el corazón en cualquier producto para seguir tiendas y ver sus ofertas aquí.'
                : 'Prueba cambiando de categoría, borrando la búsqueda o desactivando filtros.'}
            </p>
            {(selectedCategory !== 'all' || activeQuery || !activeFilters.near || activeFilters.rating || activeFilters.favorites) && (
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
