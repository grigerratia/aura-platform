'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product, Store } from '@/types';
import ThanosCard from '@/components/vfx/ThanosCard';
import AuroraParticles from '../AuroraParticles';
import GameControlBar from '../GameControlBar';
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
import { useFavoriteProducts } from '@/store/useFavoriteProducts';
import { matchProductFuzzy } from '@/lib/fuzzySearch';
import Image from 'next/image';

interface Props {
  products: Product[];
  stores?: Store[];
  onSelectProduct: (p: Product) => void;
}

export interface ActiveFiltersState {
  near: boolean;
  rating: boolean;
  favorites: boolean;      // Mis favoritos ❤️
  followedStores?: boolean; // Vitrinas que sigo 🏪
}

export default function ManadasMode({
  products,
  stores = [],
  onSelectProduct,
}: Props) {
  const { playTap } = useGameSound();
  const {
    favorites: favoriteStoreIds,
    toggleFavorite: toggleFavoriteStore,
    isFavorite: isFavoriteStore,
  } = useFavoriteStores();

  const {
    favorites: favoriteProductIds,
    toggleFavorite: toggleFavoriteProduct,
    isFavorite: isFavoriteProduct,
  } = useFavoriteProducts();

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
    followedStores: false,
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
    const q = activeQuery.trim();

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

    // Filtro por búsqueda inteligente y fonética (nombre, descripción, marca, categoría, tienda)
    if (q) {
      list = list.filter((p) => {
        const store = p.store_id ? storesMap.get(p.store_id) : undefined;
        return matchProductFuzzy(p, q, store?.name);
      });
    }

    // Filtro Personal Multi-Select: "Mis Favoritos" (❤️) y/o "Vitrinas que sigo" (🏪)
    // Cuando ambos están activos, se unen (OR): muestra tanto las compras grupales favoritas como las de tiendas seguidas
    if (activeFilters.favorites && activeFilters.followedStores) {
      list = list.filter(
        (p) =>
          favoriteProductIds.includes(p.id) ||
          Boolean(p.store_id && favoriteStoreIds.includes(p.store_id))
      );
    } else if (activeFilters.favorites) {
      list = list.filter((p) => favoriteProductIds.includes(p.id));
    } else if (activeFilters.followedStores) {
      list = list.filter((p) => Boolean(p.store_id && favoriteStoreIds.includes(p.store_id)));
    }

    // Filtro MULTI-SELECT 3: "Mejor Atención"
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
    favoriteProductIds,
    favoriteStoreIds,
    storesMap,
    storeDistances,
  ]);

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-24 select-none">
      
      {/* 1. ENCABEZADO COMPACTO CON PARTÍCULAS AURORA Y ESTILO WELCOME PORTAL */}
      <div className="relative mx-4 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#050b16]/85 backdrop-blur-xl py-3 px-4 sm:py-3.5 sm:px-5 shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
        {/* Reflejo especular superior de 1px */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

        {/* Halo de luz ambiental interna */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(220px_circle_at_15%_0%,rgba(139,92,246,0.12),transparent_75%)]" />

        {/* Partículas vivas en el fondo del header */}
        <div className="pointer-events-none absolute inset-0 opacity-85 overflow-hidden">
          <AuroraParticles count={18} colors={['#8b5cf6', '#a78bfa', '#06b6d4', '#6366f1', '#c084fc']} />
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

      {/* 2. BARRA INTEGRADA: BUSCADOR, CATEGORÍAS Y FILTROS EN UNA SOLA FILA */}
      <GameControlBar
        searchPlaceholder="Buscar manadas, marcas o tiendas..."
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
        favoritesCount={favoriteProductIds.length}
        followedStoresCount={favoriteStoreIds.length}
        accentColor="#8b5cf6"
      />

      {/* 3. CUADRÍCULA DIRECTA: 5 COLUMNAS EN PC, 2 EN MÓVIL (SEPARACIÓN DE 4PX EN MÓVILES) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-3 lg:gap-4 px-2 sm:px-4">
        <AnimatePresence mode="popLayout">
          {filteredManadaProducts.map((product, idx) => {
            const store = product.store_id ? storesMap.get(product.store_id) : undefined;
            const distance = product.store_id ? storeDistances.get(product.store_id)?.formatted : undefined;
            const storeRating = store?.rating ?? 4.8;
            const isFavProduct = isFavoriteProduct(product.id);
            const isFollowing = product.store_id ? isFavoriteStore(product.store_id) : false;

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
                  className="cursor-pointer group relative flex flex-col justify-between bg-transparent p-0 transition-transform duration-300 hover:scale-[1.01] active:scale-[0.98] select-none"
                >
                  {/* Imagen y Badges */}
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-950/80 mb-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-[#020508]/85 backdrop-blur-md text-violet-300 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-md">
                      <Users size={11} className="text-violet-400" />
                      <span>{remaining <= 1 ? 'Falta 1' : `Faltan ${remaining}`}</span>
                    </div>

                    {/* Botón de favorito individual del producto */}
                    <button
                      type="button"
                      title={isFavProduct ? 'Quitar de mis favoritos' : 'Guardar en mis favoritos'}
                      onClick={(e) => {
                        e.stopPropagation();
                        playTap();
                        toggleFavoriteProduct(product.id);
                      }}
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-[#020508]/75 backdrop-blur-md text-rose-400 hover:scale-115 transition-transform active:scale-90 cursor-pointer"
                    >
                      <Heart
                        size={13}
                        className={isFavProduct ? 'fill-rose-500 text-rose-500' : 'text-slate-400 hover:text-rose-400'}
                      />
                    </button>

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
                  <div className="space-y-1 mb-2 px-0.5">
                    {(store?.name || distance || storeRating) && (
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        {store?.name && (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate max-w-[75px] sm:max-w-[85px] font-medium text-slate-400 group-hover:text-slate-300">
                              {store.name}
                            </span>
                            {product.store_id && (
                              <button
                                type="button"
                                title={isFollowing ? `Dejar de seguir a ${store.name}` : `Seguir a ${store.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playTap();
                                  toggleFavoriteStore(product.store_id!);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[8.5px] font-semibold transition-all flex items-center gap-0.5 cursor-pointer shrink-0 ${
                                  isFollowing
                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                                }`}
                              >
                                <span>{isFollowing ? 'Siguiendo' : '+ Seguir'}</span>
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 shrink-0 ml-auto font-light">
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
                        <span className="text-[10px] text-slate-500 line-through font-light">
                          ${regularPrice.toFixed(2)}
                        </span>
                      )}
                      <span className="text-sm sm:text-base font-black text-slate-100 tracking-tight">
                        ${auraPrice.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-violet-400/90 font-bold uppercase">USD</span>
                    </div>

                    {/* Barra de progreso de la manada */}
                    <div className="space-y-0.5 pt-0.5">
                      <div className="flex justify-between items-center text-[9px] text-slate-400">
                        <span className="text-violet-300 font-medium">{joinedCount}/{targetCount} unidos</span>
                        <span className="text-slate-500">{remaining === 1 ? '¡Falta 1!' : `Faltan ${remaining}`}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
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
                    className="game-sweep w-full cursor-pointer bg-gradient-to-r from-violet-900/90 via-indigo-700/80 to-purple-800 text-slate-100 font-bold py-1.5 sm:py-2 px-2 rounded-xl text-[11px] sm:text-xs transition flex items-center justify-center gap-1 shadow-sm active:scale-95"
                  >
                    <Users size={12} className="text-violet-300" />
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
              {activeFilters.favorites && activeFilters.followedStores
                ? 'No encontramos compras grupales de tus favoritos ni de tus vitrinas seguidas'
                : activeFilters.favorites
                ? 'No tienes productos en tus favoritos'
                : activeFilters.followedStores
                ? 'No hay manadas activas de tus vitrinas seguidas'
                : 'No encontramos compras grupales con estos criterios'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-light">
              {activeFilters.favorites && activeFilters.followedStores
                ? 'Guarda compras grupales con el corazón o sigue vitrinas para verlas juntas aquí.'
                : activeFilters.favorites
                ? 'Toca el corazón en cualquier producto para guardarlo en tu lista.'
                : activeFilters.followedStores
                ? 'Sigue vitrinas comerciales tocando "+ Seguir" para ver sus compras grupales aquí.'
                : 'Prueba cambiando de categoría, borrando la búsqueda o desactivando filtros.'}
            </p>
            {(selectedCategory !== 'all' || activeQuery || !activeFilters.near || activeFilters.rating || activeFilters.favorites || activeFilters.followedStores) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  handleClearSearch();
                  setActiveFilters({ near: true, rating: false, favorites: false, followedStores: false });
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
