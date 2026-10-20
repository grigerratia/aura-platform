'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product, Store } from '@/types';
import ThanosCard from '@/components/vfx/ThanosCard';
import CategoryIconBar from '../CategoryIconBar';
import AuroraParticles from '../AuroraParticles';
import { AnimatePresence } from 'framer-motion';
import {
  Users,
  Sparkles,
  Flame,
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
import Image from 'next/image';

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

export default function ManadasMode({
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

  // 3. Estados de Búsqueda, Categoría y Filtros Multi-Selección (Sin píldoras)
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

  // 4. Filtrado y ordenamiento de Manadas
  const filteredManadaProducts = useMemo(() => {
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

    // Filtro por categoría oficial
    if (selectedCategory !== 'all') {
      list = list.filter((p) =>
        matchProductCategory(p.category, selectedCategory, p.subcategory, p.name)
      );
    }

    // Filtro por búsqueda textual
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

    // Filtro MULTI-SELECT 2: "Mejor Atención"
    if (activeFilters.rating) {
      list = list.filter((p) => {
        const store = p.store_id ? storesMap.get(p.store_id) : undefined;
        const r = store?.rating ?? 4.8;
        return r >= 4.5;
      });
    }

    // Ordenamiento simultáneo
    return list.sort((a, b) => {
      const distA = a.store_id ? (storeDistances.get(a.store_id)?.km ?? 999) : 999;
      const distB = b.store_id ? (storeDistances.get(b.store_id)?.km ?? 999) : 999;
      const storeA = a.store_id ? storesMap.get(a.store_id) : undefined;
      const storeB = b.store_id ? storesMap.get(b.store_id) : undefined;
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
    storesMap,
    storeDistances,
  ]);

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-24 select-none">
      
      {/* 1. ENCABEZADO COMPACTO CON PARTÍCULAS AURORA Y ESTILO WELCOME PORTAL */}
      <div className="relative mx-4 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#050b16]/85 backdrop-blur-xl py-3 px-4 sm:py-3.5 sm:px-5 shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
        {/* Reflejo especular superior de 1px */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

        {/* Partículas activas en el fondo del header */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <AuroraParticles count={14} colors={['#8b5cf6', '#a78bfa', '#6366f1', '#06b6d4']} />
        </div>

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 text-violet-400 text-[10px] sm:text-xs font-semibold tracking-wider uppercase">
              <Users size={13} className="text-violet-400 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
              <span>Compras en Manada • Cumaná</span>
            </div>

            <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-violet-200 via-indigo-200 to-cyan-200 bg-clip-text text-transparent">
              Desbloqueo Grupal
            </h2>

            <p className="text-[11px] sm:text-xs font-light text-slate-400 truncate max-w-sm sm:max-w-md hidden sm:block">
              Únete a otros compradores en la misma tienda para desbloquear precio mayorista.
            </p>
          </div>

          <div className="bg-[#030812]/90 backdrop-blur-xl rounded-xl px-3 py-1.5 flex items-center gap-2 shrink-0 shadow-inner">
            <Flame size={15} className="text-violet-400 animate-pulse drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]" />
            <div className="flex flex-col text-right">
              <span className="text-[9px] uppercase font-light text-slate-400">Meta Grupal</span>
              <span className="text-xs font-medium text-slate-200">
                Precio Mayorista
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BUSCADOR INTUITIVO: SOLO FLECHA (SIN PALABRA BUSCAR) */}
      <div className="px-4">
        <form
          onSubmit={handleSearchSubmit}
          className="relative bg-[#050b16]/85 backdrop-blur-xl rounded-2xl px-4 py-2 flex items-center gap-2.5 shadow-[0_10px_25px_rgba(0,0,0,0.5)] focus-within:shadow-[0_0_20px_-3px_rgba(139,92,246,0.35)] transition-all"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700/30 to-transparent" />

          <Search size={16} className="text-violet-400 shrink-0" />

          <input
            type="text"
            placeholder="Buscar manadas, marcas o tiendas..."
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
              <X size={15} />
            </button>
          )}

          <button
            type="submit"
            title="Buscar"
            className="cursor-pointer bg-gradient-to-r from-violet-800 to-indigo-700 hover:from-violet-400 hover:to-cyan-400 text-slate-100 hover:text-black p-1.5 sm:p-2 rounded-xl flex items-center justify-center transition active:scale-95 shadow-md"
          >
            <ArrowRight size={15} className="stroke-[2.5]" />
          </button>
        </form>
      </div>

      {/* 3. FILA DE 9 CATEGORÍAS OFICIALES EN ORDEN EXACTO */}
      <div className="space-y-0.5">
        <CategoryIconBar
          selectedCategory={selectedCategory}
          onSelectCategory={(catId) => {
            playTap();
            setSelectedCategory(catId);
          }}
        />
      </div>

      {/* 4. FILTROS RÁPIDOS MULTI-SELECCIÓN (SIN PÍLDORAS) */}
      <div className="px-4 flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-0.5">
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

      {/* 5. CUADRÍCULA DE MANADAS: 5 COLUMNAS EN PC, 2 EN MÓVIL (SIN DIV ENVOLVENTE INNECESARIO) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 px-4">
        <AnimatePresence mode="popLayout">
          {filteredManadaProducts.map((product, idx) => {
            const store = product.store_id ? storesMap.get(product.store_id) : undefined;
            const distance = product.store_id ? storeDistances.get(product.store_id)?.formatted : undefined;
            const storeRating = store?.rating ?? 4.8;
            const isFav = product.store_id ? isFavorite(product.store_id) : false;

            const targetCount = 3;
            const joinedCount = (idx % 2 === 0) ? 2 : 1;
            const remaining = targetCount - joinedCount;
            const progressPercent = Math.round((joinedCount / targetCount) * 100);

            const regularPrice = product.regular_price_usd || product.price;
            const auraPrice = product.aura_price_usd || product.price;

            return (
              <ThanosCard key={product.id} intensity="fast">
                <div
                  onClick={() => {
                    playTap();
                    onSelectProduct(product);
                  }}
                  className="cursor-pointer group relative overflow-hidden bg-[#050b16]/85 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:bg-[#071322]/90 hover:shadow-[0_15px_35px_rgba(0,0,0,0.65)] active:scale-[0.98] select-none"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/30 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Imagen y Badges */}
                  <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-slate-950/80 mb-2.5">
                    <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-[#020508]/85 backdrop-blur-md text-violet-300 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-md">
                      <Users size={11} className="text-violet-400" />
                      <span>{remaining <= 1 ? 'Falta 1' : `Faltan ${remaining}`}</span>
                    </div>

                    {product.store_id && (
                      <button
                        type="button"
                        title={isFav ? 'Siguiendo esta tienda' : 'Seguir tienda'}
                        onClick={(e) => {
                          e.stopPropagation();
                          playTap();
                          toggleFavorite(product.store_id!);
                        }}
                        className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-[#020508]/75 backdrop-blur-md text-rose-400 hover:scale-115 transition-transform active:scale-90"
                      >
                        <Heart
                          size={13}
                          className={isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-400 hover:text-rose-400'}
                        />
                      </button>
                    )}

                    {product.imageUrl || product.image_url ? (
                      <Image
                        src={product.imageUrl || product.image_url || ''}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-violet-950/20 text-violet-400 font-bold text-xs">
                        Aura
                      </div>
                    )}
                  </div>

                  {/* Metadatos de Tienda */}
                  <div className="space-y-1.5 mb-2.5 px-0.5">
                    {(store?.name || distance || storeRating) && (
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        {store?.name && (
                          <span className="truncate max-w-[95px] font-medium text-slate-400 group-hover:text-slate-300">
                            {store.name}
                          </span>
                        )}

                        <div className="flex items-center gap-2 shrink-0 ml-auto font-light">
                          {distance && (
                            <span className="flex items-center gap-0.5 text-slate-400">
                              <MapPin size={9} className="text-emerald-400 shrink-0" />
                              <span>{distance}</span>
                            </span>
                          )}

                          {storeRating > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-300 font-medium">
                              <Star size={9} className="fill-amber-400 text-amber-400 shrink-0" />
                              <span>{storeRating.toFixed(1)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <h3 className="text-xs sm:text-sm font-semibold text-slate-200 truncate group-hover:text-violet-300 transition-colors">
                      {product.name}
                    </h3>

                    {/* Precios */}
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      {regularPrice > auraPrice && (
                        <span className="text-[11px] text-slate-500 line-through font-light">
                          ${regularPrice.toFixed(2)}
                        </span>
                      )}
                      <span className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
                        ${auraPrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-violet-400/90 font-bold uppercase">USD</span>
                    </div>

                    {/* Barra de progreso de la manada */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="text-violet-300 font-medium">{joinedCount}/{targetCount} unidos</span>
                        <span className="text-slate-500">{remaining === 1 ? '¡Solo 1!' : `Faltan ${remaining}`}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Botón de acción */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTap();
                      onSelectProduct(product);
                    }}
                    className="game-sweep w-full cursor-pointer bg-gradient-to-r from-violet-900/90 via-indigo-700/80 to-purple-800 text-slate-100 font-black py-2 sm:py-2.5 px-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Users size={13} className="text-violet-300" />
                    <span className="truncate">Unirme a la Manada</span>
                  </button>
                </div>
              </ThanosCard>
            );
          })}
        </AnimatePresence>

        {filteredManadaProducts.length === 0 && (
          <div className="col-span-full py-16 text-center space-y-3 bg-[#050b16]/75 backdrop-blur-xl rounded-3xl p-6 shadow-xl">
            <Compass size={36} className="text-violet-400/50 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-200">
              {activeFilters.favorites
                ? 'No hay manadas activas de tus tiendas seguidas'
                : 'No encontramos compras grupales con estos criterios'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-light">
              {activeFilters.favorites
                ? 'Sigue tiendas con el corazón para ver sus compras grupales aquí.'
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
                className="mt-2 cursor-pointer bg-gradient-to-r from-violet-800 to-indigo-700 hover:from-violet-400 hover:to-cyan-400 text-slate-100 hover:text-black font-bold px-4 py-2 rounded-xl text-xs transition active:scale-95"
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
