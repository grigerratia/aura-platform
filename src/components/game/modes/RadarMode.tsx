'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Product, Store } from '@/types';
import GameProductCard from '../GameProductCard';
import ThanosCard from '@/components/vfx/ThanosCard';
import AuroraParticles from '../AuroraParticles';
import GameControlBar from '../GameControlBar';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Compass,
  X,
  ArrowRight,
  MapPin,
  Star,
  Heart,
  Radar as RadarIcon,
  Store as StoreIcon,
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

interface Props {
  products: Product[];
  stores: Store[];
  onSelectProduct: (p: Product) => void;
}

export interface ActiveFiltersState {
  near: boolean;
  rating: boolean;
  favorites: boolean;      // Mis productos favoritos ❤️
  followedStores?: boolean; // Mis vitrinas seguidas 🏪
}

export default function RadarMode({
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

  // 2.5 Tiendas / Vitrinas registradas reales (tienen owner_id o están verificadas)
  const registeredStores = useMemo(() => {
    const real = stores.filter(
      (s) => Boolean(s.owner_id) || s.verification_status === 'VERIFIED'
    );
    return real.length > 0 ? real : stores;
  }, [stores]);

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [showStoresModal, setShowStoresModal] = useState(false);

  const selectedStore = useMemo(() => {
    return selectedStoreId ? storesById.get(selectedStoreId) : null;
  }, [selectedStoreId, storesById]);

  // 3. Estados de Búsqueda, Categoría y Filtros Multi-Selección
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inputValue, setInputValue] = useState('');
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
    setActiveQuery(inputValue.trim());
  };

  const handleClearSearch = () => {
    playTap();
    setInputValue('');
    setActiveQuery('');
  };

  // 4. Filtrado y ordenamiento de productos en Radar (con deduplicación para evitar duplicados como "Camisa Cubo")
  const filteredProducts = useMemo(() => {
    const q = activeQuery.trim();

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

    // Filtro por Vitrina Comercial Activa (si el usuario seleccionó una tienda específica)
    if (selectedStoreId) {
      list = list.filter((p) => p.store_id === selectedStoreId);
    }

    // Filtro por categoría oficial (resuelve que no queden prendas en tecnología)
    if (selectedCategory !== 'all') {
      list = list.filter((p) =>
        matchProductCategory(p.category, selectedCategory, p.subcategory, p.name)
      );
    }

    // Filtro por búsqueda inteligente y fonética (nombre, descripción, marca, categoría, tienda, tallas)
    if (q) {
      list = list.filter((p) => {
        const store = p.store_id ? storesById.get(p.store_id) : undefined;
        return matchProductFuzzy(p, q, store?.name);
      });
    }

    // Filtro Personal Multi-Select: "Mis Favoritos" (❤️) y/o "Vitrinas que sigo" (🏪)
    // Cuando ambos están activos, se unen (OR): muestra tanto los productos favoritos como todo el catálogo de las tiendas seguidas
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

    // Filtro MULTI-SELECT 3: "Mejor Atención" (rating >= 4.5)
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
    favoriteProductIds,
    favoriteStoreIds,
    storesById,
    storeDistances,
    selectedStoreId,
  ]);

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-24 select-none">
      
      {/* 1. ENCABEZADO COMPACTO CON PARTÍCULAS AURORA Y ESTILO WELCOME PORTAL */}
      <div className="relative mx-4 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#050b16]/85 backdrop-blur-xl py-3 px-4 sm:py-3.5 sm:px-5 shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
        {/* Reflejo especular superior fino */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffb2]/40 to-transparent" />

        {/* Halo de luz ambiental interna */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(220px_circle_at_15%_0%,rgba(0,255,178,0.12),transparent_75%)]" />

        {/* Partículas vivas en el fondo del header */}
        <div className="pointer-events-none absolute inset-0 opacity-85 overflow-hidden">
          <AuroraParticles count={18} colors={['#00ffb2', '#10b981', '#38bdf8', '#a7f3d0']} />
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

          {/* Botón y contador interactivo de vitrinas comerciales registradas */}
          <button
            type="button"
            onClick={() => {
              playTap();
              setShowStoresModal(true);
            }}
            className={`group relative bg-[#030812]/90 hover:bg-[#071322] backdrop-blur-xl rounded-xl px-3 py-1.5 flex items-center gap-2.5 shrink-0 transition-all cursor-pointer border ${
              selectedStoreId
                ? 'border-[#00ffb2]/60 shadow-[0_0_15px_rgba(0,255,178,0.25)]'
                : 'border-slate-800/80 hover:border-emerald-500/40 shadow-inner'
            } active:scale-95`}
            title="Ver comercios registrados y explorar sus vitrinas"
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                selectedStoreId
                  ? 'bg-[#00ffb2] text-black'
                  : 'bg-emerald-950/60 text-emerald-400 group-hover:bg-emerald-900/60'
              }`}
            >
              <StoreIcon size={14} />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[9px] uppercase font-light text-slate-400 flex items-center justify-end gap-1">
                {selectedStoreId ? (
                  <span className="text-[#00ffb2] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ffb2] animate-pulse" />
                    Filtrada
                  </span>
                ) : (
                  'Vitrinas'
                )}
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                {selectedStoreId ? (selectedStore?.name ? (selectedStore.name.length > 12 ? selectedStore.name.slice(0, 10) + '…' : selectedStore.name) : '1') : registeredStores.length}
              </span>
            </div>
          </button>
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
        favoritesCount={favoriteProductIds.length}
        followedStoresCount={favoriteStoreIds.length}
        accentColor="#00ffb2"
      />

      {/* 2.5 BANNER DE VITRINA COMERCIAL ACTIVA (FILTRADO POR TIENDA) */}
      {selectedStore && (
        <div className="relative mx-4 rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-950/40 via-[#050b16]/90 to-teal-950/40 border border-emerald-500/40 p-3 sm:p-3.5 backdrop-blur-xl shadow-[0_10px_25px_rgba(0,0,0,0.5)] flex flex-wrap items-center justify-between gap-3">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffb2]/60 to-transparent" />
          
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-900/70 to-slate-950 border border-emerald-500/40 flex items-center justify-center text-[#00ffb2] font-black text-xs shrink-0 shadow-inner">
              {selectedStore.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase font-bold text-[#00ffb2] tracking-wider">
                  Vitrina Comercial Activa
                </span>
                {selectedStore.zone && (
                  <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                    <MapPin size={9} className="text-emerald-400" />
                    {selectedStore.zone}
                  </span>
                )}
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                {selectedStore.name}
                <span className="ml-2 font-mono text-[11px] font-normal text-slate-400">
                  • {filteredProducts.length} {filteredProducts.length === 1 ? 'producto en Radar' : 'productos en Radar'}
                </span>
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/${selectedStore.slug}`}
              onClick={() => playTap()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00ffb2]/10 hover:bg-[#00ffb2]/20 text-[#00ffb2] text-xs font-bold border border-emerald-500/40 transition active:scale-95 shadow-sm"
            >
              <span>Ir a Tienda Ecommerce</span>
              <ArrowRight size={12} />
            </Link>
            <button
              type="button"
              onClick={() => {
                playTap();
                setSelectedStoreId(null);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition cursor-pointer active:scale-95"
              title="Quitar filtro y ver todas las vitrinas"
            >
              <X size={13} />
              <span className="hidden sm:inline">Ver todas</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. CUADRÍCULA DIRECTA: 5 COLUMNAS EN PC, 2 EN MÓVIL (SEPARACIÓN DE 4PX EN MÓVIL, MÁS GRANDE) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-3 lg:gap-4 px-2 sm:px-4">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => {
            const store = product.store_id ? storesById.get(product.store_id) : undefined;
            const distance = product.store_id ? storeDistances.get(product.store_id)?.formatted : undefined;
            const storeRating = store?.rating ?? 4.8;
            const isFavProduct = isFavoriteProduct(product.id);
            const isFollowing = product.store_id ? isFavoriteStore(product.store_id) : false;

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
                  isFavoriteProduct={isFavProduct}
                  onToggleFavoriteProduct={() => toggleFavoriteProduct(product.id)}
                  isFollowingStore={isFollowing}
                  onToggleFollowStore={
                    product.store_id ? () => toggleFavoriteStore(product.store_id!) : undefined
                  }
                  onSelectStore={(storeId) => {
                    setSelectedStoreId(storeId);
                  }}
                />
              </ThanosCard>
            );
          })}
        </AnimatePresence>

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 text-center space-y-3 bg-[#050b16]/75 backdrop-blur-xl rounded-3xl p-6 shadow-xl">
            <Compass size={36} className="text-emerald-500/40 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-200">
              {activeFilters.favorites && activeFilters.followedStores
                ? 'No encontramos productos de tus favoritos ni de tus vitrinas seguidas'
                : activeFilters.favorites
                ? 'No tienes productos en tus favoritos'
                : activeFilters.followedStores
                ? 'No hay productos de las vitrinas que sigues'
                : selectedStore
                ? `No encontramos productos en ${selectedStore.name} con estos criterios`
                : 'No encontramos productos con estos criterios'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-light">
              {activeFilters.favorites && activeFilters.followedStores
                ? 'Guarda productos con el corazón o sigue vitrinas con "+ Seguir" para verlos juntos aquí.'
                : activeFilters.favorites
                ? 'Toca el corazón en cualquier producto para guardarlo en tu lista.'
                : activeFilters.followedStores
                ? 'Sigue vitrinas comerciales tocando "+ Seguir" en las tarjetas de producto o en el panel de Vitrinas.'
                : selectedStore
                ? 'Puedes limpiar los filtros de búsqueda o ver los productos de todas las vitrinas.'
                : 'Prueba buscando otro término, cambiando de categoría o desactivando filtros.'}
            </p>
            {(selectedStoreId || activeQuery || selectedCategory !== 'all' || !activeFilters.near || activeFilters.rating || activeFilters.favorites || activeFilters.followedStores) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStoreId(null);
                  setSelectedCategory('all');
                  handleClearSearch();
                  setActiveFilters({ near: true, rating: false, favorites: false, followedStores: false });
                }}
                className="mt-2 cursor-pointer bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-[#00ffb2] hover:to-emerald-400 text-slate-100 hover:text-black font-bold px-4 py-2 rounded-xl text-xs transition active:scale-95"
              >
                Restablecer todos los filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. MODAL DE VITRINAS COMERCIALES REGISTRADAS */}
      <AnimatePresence>
        {showStoresModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[#040913]/95 border border-emerald-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Reflejo especular superior fino */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffb2]/50 to-transparent" />

              {/* Halo de luz de fondo */}
              <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-emerald-500/10 blur-[80px]" />

              {/* Header del Modal */}
              <div className="relative z-10 px-5 pt-5 pb-3 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-[#00ffb2]">
                    <StoreIcon size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      Vitrinas Comerciales
                      <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {registeredStores.length} {registeredStores.length === 1 ? 'registrada' : 'registradas'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-light">
                      Explora el catálogo exclusivo y la tienda online de cada comercio local
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    playTap();
                    setShowStoresModal(false);
                  }}
                  className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Lista de Vitrinas / Comercios */}
              <div className="relative z-10 p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                {/* Opción para quitar filtro si hay una vitrina activa */}
                {selectedStoreId && (
                  <button
                    onClick={() => {
                      playTap();
                      setSelectedStoreId(null);
                      setShowStoresModal(false);
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-dashed border-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <X size={14} className="text-rose-400" />
                    <span>Ver todos los productos (todas las vitrinas)</span>
                  </button>
                )}

                {registeredStores.map((store) => {
                  const isSelected = selectedStoreId === store.id;
                  const isFollowing = isFavoriteStore(store.id);
                  const storeProductsCount = products.filter((p) => p.store_id === store.id).length;
                  const distance = storeDistances.get(store.id)?.formatted;

                  return (
                    <div
                      key={store.id}
                      className={`p-3.5 rounded-2xl transition-all border ${
                        isSelected
                          ? 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_20px_rgba(0,255,178,0.15)]'
                          : 'bg-[#060c18]/80 hover:bg-[#081224] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-900/60 to-slate-900 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-black text-sm shrink-0">
                            {store.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white truncate">
                                {store.name}
                              </h4>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 shrink-0">
                                Verificado
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 text-[10px] text-slate-400 mt-0.5 font-light flex-wrap">
                              {store.zone && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin size={10} className="text-emerald-400" />
                                  {store.zone}
                                </span>
                              )}
                              {distance && <span>• {distance}</span>}
                              <span>• {storeProductsCount} {storeProductsCount === 1 ? 'producto' : 'productos'}</span>
                              <span className="flex items-center gap-0.5 text-amber-300 font-medium">
                                <Star size={10} className="fill-amber-400 text-amber-400" />
                                {(store.rating || 4.8).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botón Seguir / Siguiendo Tienda en el Modal */}
                        <button
                          type="button"
                          onClick={() => {
                            playTap();
                            toggleFavoriteStore(store.id);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[10.5px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                            isFollowing
                              ? 'bg-emerald-500/20 text-[#00ffb2] border-emerald-500/40 shadow-sm'
                              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80'
                          }`}
                        >
                          <Heart
                            size={12}
                            className={isFollowing ? 'fill-emerald-400 text-emerald-400' : 'text-slate-400'}
                          />
                          <span>{isFollowing ? 'Siguiendo' : 'Seguir'}</span>
                        </button>
                      </div>

                      {/* Botones de Acción para este comercio */}
                      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-2">
                        <button
                          onClick={() => {
                            playTap();
                            setSelectedStoreId(isSelected ? null : store.id);
                            setShowStoresModal(false);
                          }}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 text-black shadow-md'
                              : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/40'
                          }`}
                        >
                          <RadarIcon size={12} />
                          <span>{isSelected ? 'Mostrando en Radar' : 'Explorar en Radar'}</span>
                        </button>

                        <Link
                          href={`/${store.slug}`}
                          onClick={() => playTap()}
                          className="py-1.5 px-3 rounded-xl text-xs font-bold bg-[#0a1528] hover:bg-[#0f203c] text-slate-200 hover:text-white border border-slate-700/80 transition flex items-center gap-1.5 shrink-0"
                        >
                          <span>Tienda Web</span>
                          <ArrowRight size={12} className="text-emerald-400" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer del Modal */}
              <div className="relative z-10 px-5 py-3 border-t border-slate-800/80 bg-[#030710]/90 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Selecciona un comercio para aislar sus productos en Radar o visita su ecommerce directo.</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
