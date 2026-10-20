'use client';

import { useState, useRef, useEffect } from 'react';
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
  Check,
} from 'lucide-react';
import { AURA_OFFICIAL_CATEGORIES } from '@/lib/categories';
import { useGameSound } from '@/hooks/useGameSound';

export interface ActiveFiltersState {
  near: boolean;
  rating: boolean;
  favorites: boolean;
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
  accentColor?: string; // hex para el acento del modo (radar: #00ffb2, relampago: #f43f5e, manadas: #8b5cf6)
}

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
  accentColor = '#00ffb2',
}: Props) {
  const { playTap } = useGameSound();

  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  // Cerrar menús al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lista completa: "Todo" + 9 Categorías oficiales
  const categoryOptions = [
    {
      id: 'all',
      name: 'Todo',
      icon: LayoutGrid,
      colorHex: '#00ffb2',
      description: 'Todas las categorías y vitrinas',
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
    <div className="relative px-2 sm:px-4 z-30 select-none">
      <div className="flex items-center gap-1.5 sm:gap-2 w-full">
        
        {/* 1. BUSCADOR (COMPACTO Y ELÁSTICO) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit(e);
          }}
          className="flex-1 min-w-0 relative bg-[#050b16]/85 backdrop-blur-xl rounded-xl px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 sm:gap-2 shadow-[0_10px_25px_rgba(0,0,0,0.5)] focus-within:shadow-[0_0_15px_-3px_rgba(0,255,178,0.3)] transition-all"
        >
          {/* Reflejo especular superior fino */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700/30 to-transparent" />

          <Search size={15} className="text-emerald-400 shrink-0" />

          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-200 placeholder-slate-500 font-light"
          />

          {searchValue && (
            <button
              type="button"
              onClick={onSearchClear}
              className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition cursor-pointer"
              title="Borrar texto"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="submit"
            title="Buscar"
            className="cursor-pointer bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-[#00ffb2] hover:to-emerald-400 text-slate-100 hover:text-black p-1 sm:p-1.5 rounded-lg flex items-center justify-center transition active:scale-95 shadow-sm shrink-0"
          >
            <ArrowRight size={13} className="stroke-[2.5]" />
          </button>
        </form>

        {/* 2. MENÚ DE CATEGORÍAS (EN LA MISMA FILA) */}
        <div className="relative shrink-0" ref={categoryMenuRef}>
          <button
            type="button"
            onClick={() => {
              playTap();
              setIsCategoryMenuOpen((prev) => !prev);
              setIsFilterMenuOpen(false);
            }}
            className={`cursor-pointer bg-[#050b16]/85 backdrop-blur-xl rounded-xl px-2 sm:px-2.5 py-1.5 flex items-center gap-1.5 text-xs transition-all shadow-[0_10px_25px_rgba(0,0,0,0.5)] active:scale-95 relative outline-none ${
              selectedCategory !== 'all'
                ? 'text-[#00ffb2] font-medium'
                : 'text-slate-300 hover:text-slate-100 font-light'
            }`}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700/30 to-transparent" />
            
            {/* Solo el icono sin círculo contenedor que gaste espacio */}
            <CurrentCatIcon
              size={15}
              style={{ color: currentCategory.colorHex }}
              className="shrink-0"
            />
            <span className="hidden xs:inline sm:inline max-w-[85px] truncate">
              {currentCategory.name}
            </span>
            <ChevronDown
              size={12}
              className={`text-slate-400 transition-transform duration-200 ${
                isCategoryMenuOpen ? 'rotate-180 text-emerald-400' : ''
              }`}
            />
          </button>

          {/* Menú Desplegable de Categorías (Icono + Descripción sin círculo) */}
          {isCategoryMenuOpen && (
            <div className="absolute right-0 sm:left-0 top-full mt-2 w-72 sm:w-80 z-50 bg-[#050b16]/95 backdrop-blur-xl rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-slate-800/40 max-h-[65vh] overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/40 mb-1 flex items-center justify-between">
                <span>Categorías de Aura</span>
                <span className="text-[9px] text-emerald-400 font-normal">9 Oficiales</span>
              </div>

              <div className="space-y-0.5">
                {categoryOptions.map((cat) => {
                  const IconComponent = cat.icon;
                  const isSelected = selectedCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        playTap();
                        onSelectCategory(cat.id);
                        setIsCategoryMenuOpen(false);
                      }}
                      className={`w-full cursor-pointer px-2.5 py-2 rounded-xl text-left flex items-center gap-3 transition-colors ${
                        isSelected
                          ? 'bg-slate-900/80 text-slate-100'
                          : 'hover:bg-slate-900/40 text-slate-300'
                      }`}
                    >
                      {/* Ícono directo sin círculo contenedor */}
                      <IconComponent
                        size={18}
                        style={{ color: cat.colorHex }}
                        className="shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs ${
                              isSelected ? 'font-bold text-emerald-300' : 'font-medium text-slate-200'
                            }`}
                          >
                            {cat.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate font-light leading-snug">
                          {cat.description}
                        </p>
                      </div>

                      {isSelected && (
                        <Check size={14} className="text-[#00ffb2] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. MENÚ DE FILTROS (EN LA MISMA FILA) */}
        <div className="relative shrink-0" ref={filterMenuRef}>
          <button
            type="button"
            onClick={() => {
              playTap();
              setIsFilterMenuOpen((prev) => !prev);
              setIsCategoryMenuOpen(false);
            }}
            className={`cursor-pointer bg-[#050b16]/85 backdrop-blur-xl rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-xs transition-all shadow-[0_10px_25px_rgba(0,0,0,0.5)] active:scale-95 relative outline-none ${
              activeFiltersCount > 0
                ? 'text-[#00ffb2] font-medium'
                : 'text-slate-300 hover:text-slate-100 font-light'
            }`}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700/30 to-transparent" />

            <SlidersHorizontal size={14} className="shrink-0 text-emerald-400" />
            <span className="hidden sm:inline">Filtros</span>

            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-[#00ffb2] text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Menú Desplegable de Filtros Multi-Selección */}
          {isFilterMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 z-50 bg-[#050b16]/95 backdrop-blur-xl rounded-2xl p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-slate-800/40 animate-in fade-in zoom-in-95 duration-150 space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/40 mb-1 flex items-center justify-between">
                <span>Filtros Rápidos</span>
                <span className="text-[9px] text-slate-500">Multi-selección</span>
              </div>

              {/* Opción 1: Más Cerca */}
              <button
                type="button"
                onClick={() => onToggleFilter('near')}
                className={`w-full cursor-pointer px-2.5 py-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                  activeFilters.near
                    ? 'bg-slate-900/80 text-slate-100'
                    : 'hover:bg-slate-900/40 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin
                    size={14}
                    className={activeFilters.near ? 'text-[#00ffb2]' : 'text-slate-500'}
                  />
                  <span className="text-xs font-medium">Más cerca (GPS)</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                    activeFilters.near
                      ? 'bg-emerald-500/20 border-emerald-400 text-[#00ffb2]'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                >
                  {activeFilters.near && <Check size={11} className="stroke-[3]" />}
                </div>
              </button>

              {/* Opción 2: Mejor Atención */}
              <button
                type="button"
                onClick={() => onToggleFilter('rating')}
                className={`w-full cursor-pointer px-2.5 py-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                  activeFilters.rating
                    ? 'bg-slate-900/80 text-slate-100'
                    : 'hover:bg-slate-900/40 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star
                    size={14}
                    className={
                      activeFilters.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-500'
                    }
                  />
                  <span className="text-xs font-medium">Mejor atención (4.5+)</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                    activeFilters.rating
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                >
                  {activeFilters.rating && <Check size={11} className="stroke-[3]" />}
                </div>
              </button>

              {/* Opción 3: Mis Tiendas */}
              <button
                type="button"
                onClick={() => onToggleFilter('favorites')}
                className={`w-full cursor-pointer px-2.5 py-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                  activeFilters.favorites
                    ? 'bg-slate-900/80 text-slate-100'
                    : 'hover:bg-slate-900/40 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Heart
                    size={14}
                    className={
                      activeFilters.favorites
                        ? 'fill-rose-500 text-rose-500'
                        : 'text-slate-500'
                    }
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">Mis tiendas</span>
                    {favoritesCount > 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                        {favoritesCount}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                    activeFilters.favorites
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                >
                  {activeFilters.favorites && <Check size={11} className="stroke-[3]" />}
                </div>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
