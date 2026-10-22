'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  LayoutGrid,
  MapPin,
  Star,
  Heart,
  Store as StoreIcon,
} from 'lucide-react';
import { AURA_OFFICIAL_CATEGORIES } from '@/lib/categories';
import { useGameSound } from '@/hooks/useGameSound';

export interface ActiveFiltersState {
  near: boolean;
  rating: boolean;
  favorites: boolean;      // Mis productos favoritos guardados ❤️
  followedStores?: boolean; // Mis vitrinas / tiendas seguidas 🏪
}

interface Props {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: (e?: React.FormEvent) => void;
  onSearchClear: () => void;
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
  activeFilters: ActiveFiltersState;
  onToggleFilter: (key: keyof ActiveFiltersState) => void;
  favoritesCount?: number;
  followedStoresCount?: number;
  accentColor?: string; // hex para el acento del modo (radar: #00ffb2, relampago: #f43f5e, manadas: #8b5cf6)
}

const CINEMATIC_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function GameControlBar({
  searchPlaceholder = 'Buscar productos, tiendas...',
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  selectedCategory,
  onSelectCategory,
  activeFilters,
  onToggleFilter,
  favoritesCount = 0,
  followedStoresCount = 0,
  accentColor = '#00ffb2',
}: Props) {
  const { playTap } = useGameSound();

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);

  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  // Cerrar menús al hacer click afuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCategoryMenuOpen(false);
        setIsFilterMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Lista completa: "Todo" + Categorías oficiales
  const categoryOptions = [
    {
      id: 'all',
      name: 'Todo',
      icon: LayoutGrid,
      colorHex: accentColor,
      description: 'Todas las vitrinas de la ciudad',
    },
    ...AURA_OFFICIAL_CATEGORIES,
  ];

  const currentCategory =
    categoryOptions.find((c) => c.id === selectedCategory) || categoryOptions[0];
  const CurrentCatIcon = currentCategory.icon;

  // Conteo de filtros activos
  const activeFiltersCount =
    (activeFilters.near ? 1 : 0) +
    (activeFilters.rating ? 1 : 0) +
    (activeFilters.favorites ? 1 : 0);

  return (
    <div className="relative px-3 sm:px-5 z-30 select-none">
      <div className="flex items-center gap-2 sm:gap-2.5 w-full max-w-4xl mx-auto">
        
        {/* 1. MONOLITO DE BÚSQUEDA (LUZ ATMOSFÉRICA DINÁMICA SEGÚN EL MODO) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            playTap();
            onSearchSubmit(e);
          }}
          className="flex-1 min-w-0 relative overflow-hidden bg-[#050b16]/85 backdrop-blur-2xl rounded-2xl px-3.5 sm:px-4 py-2.5 flex items-center gap-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.65)] transition-colors duration-700"
        >
          {/* Reflejo especular superior de 1px */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[1px] transition-opacity duration-700"
            style={{
              background: `linear-gradient(90deg, transparent, ${
                isSearchFocused ? accentColor : 'rgba(148, 163, 184, 0.22)'
              }, transparent)`,
              opacity: isSearchFocused ? 0.9 : 0.5,
            }}
          />

          {/* Halo interno que despierta suavemente al enfocar el buscador */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-700"
            style={{
              background: `radial-gradient(180px circle at 15% 0%, ${accentColor}1f, transparent 75%)`,
              opacity: isSearchFocused ? 1 : 0.2,
            }}
          />

          <Search
            size={16}
            style={{ color: isSearchFocused ? accentColor : '#94a3b8' }}
            className="relative z-10 shrink-0 stroke-[1.6] transition-colors duration-500"
          />

          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onChange={(e) => onSearchChange(e.target.value)}
            className="relative z-10 w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-light tracking-wide"
          />

          <AnimatePresence>
            {searchValue && (
              <motion.button
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.2, ease: CINEMATIC_EASE }}
                type="button"
                onClick={() => {
                  playTap();
                  onSearchClear();
                }}
                className="relative z-10 text-slate-500 hover:text-slate-200 p-1 rounded-lg transition-colors duration-300 cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X size={14} className="stroke-[1.8]" />
              </motion.button>
            )}
          </AnimatePresence>

          <button
            type="submit"
            title="Buscar"
            style={{
              backgroundColor: searchValue ? `${accentColor}24` : 'rgba(15, 23, 42, 0.65)',
              color: searchValue ? accentColor : '#94a3b8',
            }}
            className="relative z-10 cursor-pointer hover:text-slate-100 p-1.5 rounded-xl flex items-center justify-center transition-colors duration-500 shrink-0 outline-none"
          >
            <ArrowRight size={14} className="stroke-[1.8]" />
          </button>
        </form>

        {/* 2. SELECTOR DE CATEGORÍAS (MATRIZ ESPACIAL DE 2 COLUMNAS) */}
        <div className="relative shrink-0" ref={categoryMenuRef}>
          <button
            type="button"
            onClick={() => {
              playTap();
              setIsCategoryMenuOpen((prev) => !prev);
              setIsFilterMenuOpen(false);
            }}
            className="cursor-pointer relative overflow-hidden bg-[#050b16]/85 backdrop-blur-2xl rounded-2xl px-3 sm:px-3.5 py-2.5 flex items-center gap-2 text-xs shadow-[0_18px_40px_rgba(0,0,0,0.65)] outline-none group"
          >
            {/* Línea especular superior */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[1px] transition-opacity duration-700"
              style={{
                background: `linear-gradient(90deg, transparent, ${currentCategory.colorHex}80, transparent)`,
                opacity: isCategoryMenuOpen || selectedCategory !== 'all' ? 1 : 0.35,
              }}
            />

            {/* Luz ambiental del rubro actual */}
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-700"
              style={{
                background: `radial-gradient(90px circle at 50% 0%, ${currentCategory.colorHex}26, transparent 75%)`,
                opacity: isCategoryMenuOpen || selectedCategory !== 'all' ? 1 : 0.25,
              }}
            />

            <CurrentCatIcon
              size={16}
              style={{ color: currentCategory.colorHex }}
              className="relative z-10 shrink-0 stroke-[1.6] transition-colors duration-500"
            />

            <span
              className={`relative z-10 hidden xs:inline sm:inline max-w-[92px] truncate tracking-wide transition-colors duration-500 ${
                selectedCategory !== 'all'
                  ? 'text-slate-100 font-normal'
                  : 'text-slate-300 group-hover:text-slate-100 font-light'
              }`}
            >
              {currentCategory.name}
            </span>

            <ChevronDown
              size={13}
              className={`relative z-10 text-slate-500 transition-transform duration-500 ${
                isCategoryMenuOpen ? 'rotate-180 text-slate-200' : 'group-hover:text-slate-300'
              }`}
            />
          </button>

          {/* PANEL CINEMATOGRÁFICO DE CATEGORÍAS */}
          <AnimatePresence>
            {isCategoryMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 8, filter: 'blur(10px)' }}
                transition={{ duration: 0.42, ease: CINEMATIC_EASE }}
                className="fixed inset-x-3 top-28 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[430px] z-50 bg-[#040913]/95 backdrop-blur-3xl rounded-3xl p-4 sm:p-5 shadow-[0_30px_80px_rgba(0,0,0,0.92)] overflow-hidden"
              >
                {/* Reflejo especular superior del panel */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${accentColor}66, transparent)`,
                  }}
                />

                {/* Halo atmosférico de fondo en el menú */}
                <div
                  className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full blur-3xl opacity-25"
                  style={{ backgroundColor: currentCategory.colorHex }}
                />

                {/* Cabecera minimalista del panel */}
                <div className="relative z-10 flex items-center justify-between px-1 pb-3.5 mb-3 border-b border-slate-800/40">
                  <span className="text-[10px] uppercase tracking-[0.32em] text-slate-400 font-light">
                    Explorar Rubros
                  </span>
                  <span className="text-[10px] tracking-[0.2em] uppercase text-slate-500 font-light">
                    {categoryOptions.length} Vitrinas
                  </span>
                </div>

                {/* Cuadrícula de Monolitos de Categoría (2 columnas) */}
                <div className="relative z-10 grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto no-scrollbar pr-0.5">
                  {categoryOptions.map((cat, idx) => {
                    const IconComponent = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    const isHovered = hoveredCatId === cat.id;

                    return (
                      <motion.button
                        key={cat.id}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.35,
                          delay: 0.025 * idx,
                          ease: CINEMATIC_EASE,
                        }}
                        onMouseEnter={() => setHoveredCatId(cat.id)}
                        onMouseLeave={() => setHoveredCatId(null)}
                        onClick={() => {
                          playTap();
                          onSelectCategory(cat.id);
                          setIsCategoryMenuOpen(false);
                        }}
                        className="relative overflow-hidden cursor-pointer rounded-2xl bg-[#070f1f]/75 p-3 text-left flex items-start gap-3 transition-colors duration-500 outline-none group"
                      >
                        {/* Línea de luz superior propia de cada categoría */}
                        <div
                          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] transition-opacity duration-500"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${cat.colorHex}80, transparent)`,
                            opacity: isSelected || isHovered ? 1 : 0.15,
                          }}
                        />

                        {/* Iluminación atmosférica interna */}
                        <div
                          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
                          style={{
                            background: `radial-gradient(95px circle at 20% 0%, ${cat.colorHex}26, transparent 80%)`,
                            opacity: isSelected ? 1 : isHovered ? 0.75 : 0.12,
                          }}
                        />

                        {/* Ícono con halo sutil */}
                        <div className="relative mt-0.5 shrink-0 flex items-center justify-center">
                          <div
                            className="pointer-events-none absolute w-6 h-6 rounded-full blur-md transition-opacity duration-500"
                            style={{
                              backgroundColor: cat.colorHex,
                              opacity: isSelected || isHovered ? 0.45 : 0.1,
                            }}
                          />
                          <IconComponent
                            size={18}
                            style={{ color: cat.colorHex }}
                            className="relative z-10 stroke-[1.5]"
                          />
                        </div>

                        {/* Texto limpio */}
                        <div className="relative z-10 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs tracking-wide truncate transition-colors duration-300 ${
                                isSelected
                                  ? 'font-medium text-slate-100'
                                  : 'font-light text-slate-300 group-hover:text-slate-100'
                              }`}
                            >
                              {cat.name}
                            </span>

                            {/* Punto luminoso indicador de selección */}
                            {isSelected && (
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: cat.colorHex,
                                  boxShadow: `0 0 8px ${cat.colorHex}`,
                                }}
                              />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 group-hover:text-slate-400 truncate font-light mt-0.5 transition-colors duration-300">
                            {cat.description}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. PANEL TÁCTICO DE FILTROS */}
        <div className="relative shrink-0" ref={filterMenuRef}>
          <button
            type="button"
            onClick={() => {
              playTap();
              setIsFilterMenuOpen((prev) => !prev);
              setIsCategoryMenuOpen(false);
            }}
            className="cursor-pointer relative overflow-hidden bg-[#050b16]/85 backdrop-blur-2xl rounded-2xl px-3 sm:px-3.5 py-2.5 flex items-center gap-2 text-xs shadow-[0_18px_40px_rgba(0,0,0,0.65)] outline-none group"
          >
            {/* Reflejo especular superior */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[1px] transition-opacity duration-700"
              style={{
                background: `linear-gradient(90deg, transparent, ${accentColor}80, transparent)`,
                opacity: isFilterMenuOpen || activeFiltersCount > 0 ? 1 : 0.35,
              }}
            />

            {/* Halo interno cuando hay filtros activos */}
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-700"
              style={{
                background: `radial-gradient(90px circle at 50% 0%, ${accentColor}26, transparent 75%)`,
                opacity: isFilterMenuOpen || activeFiltersCount > 0 ? 1 : 0.2,
              }}
            />

            <SlidersHorizontal
              size={15}
              style={{ color: activeFiltersCount > 0 ? accentColor : '#94a3b8' }}
              className="relative z-10 shrink-0 stroke-[1.6] transition-colors duration-500"
            />

            <span
              className={`relative z-10 hidden sm:inline tracking-wide transition-colors duration-500 ${
                activeFiltersCount > 0
                  ? 'text-slate-100 font-normal'
                  : 'text-slate-300 group-hover:text-slate-100 font-light'
              }`}
            >
               Radar
            </span>

            {activeFiltersCount > 0 && (
              <span
                style={{
                  backgroundColor: `${accentColor}22`,
                  color: accentColor,
                  boxShadow: `0 0 10px ${accentColor}33`,
                }}
                className="relative z-10 w-4 h-4 rounded-full text-[10px] font-medium flex items-center justify-center"
              >
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* DESPLEGABLE CINEMATOGRÁFICO DE FILTROS */}
          <AnimatePresence>
            {isFilterMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 8, filter: 'blur(10px)' }}
                transition={{ duration: 0.4, ease: CINEMATIC_EASE }}
                className="absolute right-0 top-full mt-3 w-72 sm:w-80 z-50 bg-[#040913]/95 backdrop-blur-3xl rounded-3xl p-4 shadow-[0_30px_80px_rgba(0,0,0,0.92)] overflow-hidden space-y-2"
              >
                {/* Reflejo especular superior */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${accentColor}66, transparent)`,
                  }}
                />

                <div className="flex items-center justify-between px-1 pb-2.5 mb-1 border-b border-slate-800/40">
                  <span className="text-[10px] uppercase tracking-[0.32em] text-slate-400 font-light">
                    Precisión de Búsqueda
                  </span>
                  <span className="text-[10px] tracking-[0.18em] uppercase text-slate-500 font-light">
                    Multi-filtro
                  </span>
                </div>

                {/* OPCIÓN 1: MÁS CERCA (GPS) */}
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    onToggleFilter('near');
                  }}
                  className="w-full relative overflow-hidden cursor-pointer px-3.5 py-3 rounded-2xl bg-[#070f1f]/75 text-left flex items-center justify-between transition-colors duration-500 group outline-none"
                >
                  <div
                    className="pointer-events-none absolute inset-0 transition-opacity duration-500"
                    style={{
                      background:
                        'radial-gradient(120px circle at 15% 50%, rgba(16, 185, 129, 0.2), transparent 80%)',
                      opacity: activeFilters.near ? 1 : 0.1,
                    }}
                  />

                  <div className="relative z-10 flex items-center gap-3">
                    <MapPin
                      size={16}
                      className={`stroke-[1.6] transition-colors duration-500 ${
                        activeFilters.near ? 'text-emerald-300' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <div>
                      <span
                        className={`block text-xs tracking-wide transition-colors ${
                          activeFilters.near ? 'text-slate-100 font-normal' : 'text-slate-300 font-light'
                        }`}
                      >
                        Más cerca de mí
                      </span>
                      <span className="block text-[10px] text-slate-500 font-light">
                        Priorizar tiendas por GPS
                      </span>
                    </div>
                  </div>

                  {/* Interruptor luminoso minimalista */}
                  <div
                    className={`relative z-10 w-8 h-4 rounded-full p-0.5 transition-colors duration-500 flex items-center ${
                      activeFilters.near ? 'bg-emerald-500/30' : 'bg-slate-900'
                    }`}
                  >
                    <motion.div
                      animate={{ x: activeFilters.near ? 16 : 0 }}
                      transition={{ duration: 0.35, ease: CINEMATIC_EASE }}
                      className={`w-3 h-3 rounded-full ${
                        activeFilters.near
                          ? 'bg-emerald-300 shadow-[0_0_8px_#10b981]'
                          : 'bg-slate-600'
                      }`}
                    />
                  </div>
                </button>

                {/* OPCIÓN 2: MEJOR ATENCIÓN */}
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    onToggleFilter('rating');
                  }}
                  className="w-full relative overflow-hidden cursor-pointer px-3.5 py-3 rounded-2xl bg-[#070f1f]/75 text-left flex items-center justify-between transition-colors duration-500 group outline-none"
                >
                  <div
                    className="pointer-events-none absolute inset-0 transition-opacity duration-500"
                    style={{
                      background:
                        'radial-gradient(120px circle at 15% 50%, rgba(245, 158, 11, 0.2), transparent 80%)',
                      opacity: activeFilters.rating ? 1 : 0.1,
                    }}
                  />

                  <div className="relative z-10 flex items-center gap-3">
                    <Star
                      size={16}
                      className={`stroke-[1.6] transition-colors duration-500 ${
                        activeFilters.rating
                          ? 'text-amber-300 fill-amber-300/20'
                          : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <div>
                      <span
                        className={`block text-xs tracking-wide transition-colors ${
                          activeFilters.rating ? 'text-slate-100 font-normal' : 'text-slate-300 font-light'
                        }`}
                      >
                        Respuesta veloz (4.5+)
                      </span>
                      <span className="block text-[10px] text-slate-500 font-light">
                        Comercios con mejor trato
                      </span>
                    </div>
                  </div>

                  <div
                    className={`relative z-10 w-8 h-4 rounded-full p-0.5 transition-colors duration-500 flex items-center ${
                      activeFilters.rating ? 'bg-amber-500/30' : 'bg-slate-900'
                    }`}
                  >
                    <motion.div
                      animate={{ x: activeFilters.rating ? 16 : 0 }}
                      transition={{ duration: 0.35, ease: CINEMATIC_EASE }}
                      className={`w-3 h-3 rounded-full ${
                        activeFilters.rating
                          ? 'bg-amber-300 shadow-[0_0_8px_#f59e0b]'
                          : 'bg-slate-600'
                      }`}
                    />
                  </div>
                </button>

                {/* OPCIÓN 3: MIS FAVORITOS (PRODUCTOS GUARDADOS CON ❤️) */}
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    onToggleFilter('favorites');
                  }}
                  className="w-full relative overflow-hidden cursor-pointer px-3.5 py-3 rounded-2xl bg-[#070f1f]/75 text-left flex items-center justify-between transition-colors duration-500 group outline-none"
                >
                  <div
                    className="pointer-events-none absolute inset-0 transition-opacity duration-500"
                    style={{
                      background:
                        'radial-gradient(120px circle at 15% 50%, rgba(244, 63, 94, 0.2), transparent 80%)',
                      opacity: activeFilters.favorites ? 1 : 0.1,
                    }}
                  />

                  <div className="relative z-10 flex items-center gap-3">
                    <Heart
                      size={16}
                      className={`stroke-[1.6] transition-colors duration-500 ${
                        activeFilters.favorites
                          ? 'text-rose-300 fill-rose-500'
                          : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs tracking-wide transition-colors ${
                            activeFilters.favorites
                              ? 'text-slate-100 font-normal'
                              : 'text-slate-300 font-light'
                          }`}
                        >
                          Mis favoritos
                        </span>
                        {favoritesCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-normal">
                            {favoritesCount}
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-500 font-light">
                        Productos que guardaste
                      </span>
                    </div>
                  </div>

                  <div
                    className={`relative z-10 w-8 h-4 rounded-full p-0.5 transition-colors duration-500 flex items-center ${
                      activeFilters.favorites ? 'bg-rose-500/30' : 'bg-slate-900'
                    }`}
                  >
                    <motion.div
                      animate={{ x: activeFilters.favorites ? 16 : 0 }}
                      transition={{ duration: 0.35, ease: CINEMATIC_EASE }}
                      className={`w-3 h-3 rounded-full ${
                        activeFilters.favorites
                          ? 'bg-rose-300 shadow-[0_0_8px_#f43f5e]'
                          : 'bg-slate-600'
                      }`}
                    />
                  </div>
                </button>

                {/* OPCIÓN 4: VITRINAS QUE SIGO (LOCALES SEGUIDOS 🏪) */}
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    onToggleFilter('followedStores');
                  }}
                  className="w-full relative overflow-hidden cursor-pointer px-3.5 py-3 rounded-2xl bg-[#070f1f]/75 text-left flex items-center justify-between transition-colors duration-500 group outline-none"
                >
                  <div
                    className="pointer-events-none absolute inset-0 transition-opacity duration-500"
                    style={{
                      background:
                        'radial-gradient(120px circle at 15% 50%, rgba(0, 255, 178, 0.2), transparent 80%)',
                      opacity: activeFilters.followedStores ? 1 : 0.1,
                    }}
                  />

                  <div className="relative z-10 flex items-center gap-3">
                    <StoreIcon
                      size={16}
                      className={`stroke-[1.6] transition-colors duration-500 ${
                        activeFilters.followedStores
                          ? 'text-[#00ffb2]'
                          : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs tracking-wide transition-colors ${
                            activeFilters.followedStores
                              ? 'text-slate-100 font-normal'
                              : 'text-slate-300 font-light'
                          }`}
                        >
                          Vitrinas que sigo
                        </span>
                        {followedStoresCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[#00ffb2] font-normal">
                            {followedStoresCount}
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-500 font-light">
                        Novedades de tiendas seguidas
                      </span>
                    </div>
                  </div>

                  <div
                    className={`relative z-10 w-8 h-4 rounded-full p-0.5 transition-colors duration-500 flex items-center ${
                      activeFilters.followedStores ? 'bg-emerald-500/30' : 'bg-slate-900'
                    }`}
                  >
                    <motion.div
                      animate={{ x: activeFilters.followedStores ? 16 : 0 }}
                      transition={{ duration: 0.35, ease: CINEMATIC_EASE }}
                      className={`w-3 h-3 rounded-full ${
                        activeFilters.followedStores
                          ? 'bg-[#00ffb2] shadow-[0_0_8px_#00ffb2]'
                          : 'bg-slate-600'
                      }`}
                    />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}