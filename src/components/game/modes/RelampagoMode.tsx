'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product, Store } from '@/types';
import GameProductCard from '../GameProductCard';
import ThanosCard from '@/components/vfx/ThanosCard';
import CategoryIconBar from '../CategoryIconBar';
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

    // Si hay búsqueda activa: busca en la totalidad de productos del catálogo sin descartar ninguno
    // Si no hay búsqueda: destaca remates, descuentos y stock límite, pero si hay pocos muestra el catálogo
    let list = [...products];

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
      list = list.filter((p) => matchProductCategory(p.category, selectedCategory));
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
    <div className="space-y-6 pb-24 select-none">
      
      {/* 1. ENCABEZADO ÉPICO CINEMATOGRÁFICO: SIN BORDES, VIDRIO OSCURO Y RESPLANDOR */}
      <div className="relative mx-4 rounded-3xl overflow-hidden bg-[#050b16]/85 backdrop-blur-xl p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
        {/* Reflejo especular superior (1px de luz sin bordes) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-rose-400/40 to-transparent" />

        {/* Halo atmosférico de energía relámpago */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-rose-600/15 via-amber-500/10 to-transparent blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold tracking-wider uppercase">
              <Zap size={16} className="fill-rose-400 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <span>Liquidaciones & Oportunidades del Día</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-rose-300 via-amber-200 to-rose-400 bg-clip-text text-transparent">
              Relámpago Aura
            </h2>

            <p className="text-xs sm:text-sm font-light text-slate-400 max-w-md">
              Últimas unidades a precio de remate físico y cupos gastronómicos antes de cerrar caja en Cumaná.
            </p>
          </div>

          {/* Reloj Digital de Cuenta Regresiva (Sin bordes duros) */}
          <div className="bg-[#030812]/90 backdrop-blur-xl rounded-2xl px-4 py-3 flex items-center gap-3.5 self-start sm:self-auto shadow-inner">
            <Clock size={18} className="text-rose-400 animate-pulse drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-light text-slate-400 tracking-wider">
                Vence hoy en
              </span>
              <div className="flex items-center gap-1 font-mono text-base sm:text-lg font-black text-slate-100">
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

      {/* 2. BUSCADOR INTUITIVO: SOLO FLECHA (SIN LA PALABRA BUSCAR) */}
      <div className="px-4">
        <form
          onSubmit={handleSearchSubmit}
          className="relative bg-[#050b16]/85 backdrop-blur-xl rounded-2xl px-4 py-2.5 flex items-center gap-2.5 shadow-[0_10px_25px_rgba(0,0,0,0.5)] focus-within:shadow-[0_0_20px_-3px_rgba(0,255,178,0.35)] transition-all"
        >
          {/* Reflejo especular superior */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700/30 to-transparent" />

          <Search size={18} className="text-emerald-400 shrink-0" />

          <input
            type="text"
            placeholder="Buscar en relámpago, marcas o tiendas..."
            value={searchInputValue}
            onChange={(e) => {
              setSearchInputValue(e.target.value);
              if (!e.target.value.trim()) {
                setActiveQuery('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit();
              }
            }}
            className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-200 placeholder-slate-500 font-light"
          />

          {searchInputValue && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition cursor-pointer"
              title="Borrar búsqueda"
            >
              <X size={16} />
            </button>
          )}

          {/* BOTÓN SOLO CON LA FLECHA (QUITADA LA PALABRA BUSCAR) */}
          <button
            type="submit"
            title="Buscar"
            className="cursor-pointer bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-[#00ffb2] hover:to-emerald-400 text-slate-100 hover:text-black p-2 rounded-xl flex items-center justify-center transition active:scale-95 shadow-md"
          >
            <ArrowRight size={16} className="stroke-[2.5]" />
          </button>
        </form>
      </div>

      {/* 3. FILA DE 9 CATEGORÍAS OFICIALES EN ORDEN EXACTO */}
      <div className="space-y-1">
        <CategoryIconBar
          selectedCategory={selectedCategory}
          onSelectCategory={(catId) => {
            playTap();
            setSelectedCategory(catId);
          }}
        />
      </div>

      {/* 4. FILTROS RÁPIDOS MULTI-SELECCIÓN (SIN PÍLDORAS): MÁS CERCA, MEJOR ATENCIÓN, MIS TIENDAS */}
      <div className="px-4 flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-1">
        {/* Filtro 1: Más Cerca */}
        <button
          type="button"
          onClick={() => toggleFilter('near')}
          className={`cursor-pointer pb-2 pt-1 px-1 flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap relative outline-none ${
            activeFilters.near
              ? 'text-slate-100 font-medium'
              : 'text-slate-400 hover:text-slate-300 font-light'
          }`}
        >
          <MapPin
            size={14}
            className={`shrink-0 transition-colors ${
              activeFilters.near
                ? 'text-[#00ffb2] drop-shadow-[0_0_6px_rgba(0,255,178,0.5)]'
                : 'text-slate-500'
            }`}
          />
          <span className="text-xs tracking-wide">Más cerca</span>
          {activeFilters.near && (
            <span className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00ffb2] to-transparent rounded-full" />
          )}
        </button>

        {/* Filtro 2: Mejor Atención (Medido por Estrellas) */}
        <button
          type="button"
          onClick={() => toggleFilter('rating')}
          className={`cursor-pointer pb-2 pt-1 px-1 flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap relative outline-none ${
            activeFilters.rating
              ? 'text-slate-100 font-medium'
              : 'text-slate-400 hover:text-slate-300 font-light'
          }`}
        >
          <Star
            size={14}
            className={`shrink-0 transition-colors ${
              activeFilters.rating
                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                : 'text-slate-500'
            }`}
          />
          <span className="text-xs tracking-wide">Mejor atención</span>
          {activeFilters.rating && (
            <span className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full" />
          )}
        </button>

        {/* Filtro 3: Mis Tiendas (Favoritas / Seguidas) */}
        <button
          type="button"
          onClick={() => toggleFilter('favorites')}
          className={`cursor-pointer pb-2 pt-1 px-1 flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap relative outline-none ${
            activeFilters.favorites
              ? 'text-slate-100 font-medium'
              : 'text-slate-400 hover:text-slate-300 font-light'
          }`}
        >
          <Heart
            size={14}
            className={`shrink-0 transition-colors ${
              activeFilters.favorites
                ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]'
                : 'text-slate-500'
            }`}
          />
          <span className="text-xs tracking-wide">Mis tiendas</span>
          {favorites.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-bold">
              {favorites.length}
            </span>
          )}
          {activeFilters.favorites && (
            <span className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent rounded-full" />
          )}
        </button>
      </div>

      {/* 5. CUADRÍCULA DE PRODUCTOS FLASH: 5 COLUMNAS EN PC, 2 EN MÓVIL (SIN DIV ENVOLVENTE INNECESARIO) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 px-4">
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
