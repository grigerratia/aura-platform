'use client';

import { useState, useMemo } from 'react';
import { Product, Store } from '@/types';
import CategoryIconBar from '../CategoryIconBar';
import GameProductCard from '../GameProductCard';
import ThanosTransition from '@/components/vfx/ThanosTransition';
import { AnimatePresence } from 'framer-motion';
import { Search, Compass, X, ArrowRight, Store as StoreIcon } from 'lucide-react';
import { useGameSound } from '@/hooks/useGameSound';

interface Props {
  products: Product[];
  stores: Store[];
  onSelectProduct: (p: Product) => void;
}

export default function RadarMode({
  products,
  stores,
  onSelectProduct,
}: Props) {
  const { playTap } = useGameSound();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inputValue, setInputValue] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  // Diccionario de tiendas para búsqueda rápida por nombre de comercio
  const storesById = useMemo(() => {
    const map = new Map<string, Store>();
    stores.forEach((s) => map.set(s.id, s));
    return map;
  }, [stores]);

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

  // Filtrado de productos por categoría y texto de búsqueda
  const filteredProducts = useMemo(() => {
    const q = activeQuery.toLowerCase().trim();

    return products.filter((p) => {
      // 1. Filtro por categoría
      if (selectedCategory !== 'all') {
        const rawCat = (p.category || '').toLowerCase();
        const archetype = (p.category_archetype || '').toLowerCase();

        if (selectedCategory === 'comida') {
          if (!rawCat.includes('comida') && !rawCat.includes('restaurante') && !archetype.includes('gastro') && !rawCat.includes('postre') && !rawCat.includes('café')) {
            return false;
          }
        } else if (selectedCategory === 'moda') {
          if (!rawCat.includes('moda') && !rawCat.includes('calzado') && !rawCat.includes('zapato') && !rawCat.includes('ropa') && !rawCat.includes('vestid')) {
            return false;
          }
        } else if (selectedCategory === 'ferreteria') {
          if (!rawCat.includes('ferreter') && !rawCat.includes('herramienta') && !rawCat.includes('repuesto') && !rawCat.includes('construc')) {
            return false;
          }
        } else if (selectedCategory === 'farmacia') {
          if (!rawCat.includes('farmacia') && !rawCat.includes('salud') && !rawCat.includes('medic') && !rawCat.includes('cuidado')) {
            return false;
          }
        } else if (selectedCategory === 'vehiculos') {
          if (!rawCat.includes('veh') && !rawCat.includes('moto') && !rawCat.includes('carro') && !rawCat.includes('caucho') && !rawCat.includes('batería')) {
            return false;
          }
        } else if (selectedCategory === 'juguetes') {
          if (!rawCat.includes('juguet') && !rawCat.includes('niñ') && !rawCat.includes('bebé') && !rawCat.includes('game')) {
            return false;
          }
        } else if (selectedCategory === 'hogar') {
          if (!rawCat.includes('hogar') && !rawCat.includes('mueble') && !rawCat.includes('colchón') && !rawCat.includes('electro')) {
            return false;
          }
        }
      }

      // 2. Filtro por búsqueda activa
      if (q) {
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        
        // Coincidencia con nombre de la tienda
        const store = p.store_id ? storesById.get(p.store_id) : undefined;
        const matchStore = store ? store.name.toLowerCase().includes(q) : false;

        // Coincidencia con tallas o specs
        const matchSizes = Array.isArray(p.sizes) ? p.sizes.some((s) => s.toLowerCase().includes(q)) : false;

        return matchName || matchDesc || matchCat || matchStore || matchSizes;
      }

      return true;
    });
  }, [products, selectedCategory, activeQuery, storesById]);

  return (
    <div className="space-y-4 pb-20">
      
      {/* 1. BUSCADOR INTUITIVO CON BOTÓN DE BÚSQUEDA Y SOPORTE ENTER */}
      <div className="px-4">
        <form
          onSubmit={handleSearchSubmit}
          className="relative bg-[#030a10] border border-emerald-950/80 hover:border-emerald-500/50 focus-within:border-[#00ffb2] rounded-2xl px-3 py-2 flex items-center gap-2 shadow-inner transition"
        >
          <Search size={18} className="text-emerald-400 shrink-0 ml-1" />
          
          <input
            type="text"
            placeholder="Buscar por producto, marca o tienda..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              // Si el usuario borra todo, reseteamos el filtro inmediatamente
              if (!e.target.value.trim()) {
                setActiveQuery('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit();
              }
            }}
            className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-white placeholder-slate-500 font-medium"
          />

          {inputValue && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              title="Borrar texto"
            >
              <X size={16} />
            </button>
          )}

          <button
            type="submit"
            className="cursor-pointer bg-emerald-950/80 hover:bg-[#00ffb2] text-emerald-400 hover:text-black font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition active:scale-95 border border-emerald-800/40 hover:border-[#00ffb2]"
          >
            <span className="hidden sm:inline">Buscar</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Indicador de búsqueda activa */}
        {activeQuery && (
          <div className="flex items-center justify-between mt-2 px-1 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>Resultados para:</span>
              <span className="font-bold text-[#00ffb2]">"{activeQuery}"</span>
            </div>
            <button
              onClick={handleClearSearch}
              className="text-slate-400 hover:text-rose-400 text-[11px] font-bold cursor-pointer"
            >
              Quitar filtro
            </button>
          </div>
        )}
      </div>

      {/* 2. FILA HORIZONTAL DE CATEGORÍAS */}
      <CategoryIconBar
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
        }}
      />

      {/* 3. CONTADOR DE VITRINAS (SIN TEXTO DE 60FPS) */}
      <div className="px-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-bold text-slate-300">
          <Compass size={14} className="text-emerald-400" />
          <span>Vitrinas en Cumaná ({filteredProducts.length})</span>
        </div>
      </div>

      {/* 4. CUADRÍCULA DE TARJETAS MINIMALISTAS CON DESINTEGRACIÓN THANOS */}
      <div className="px-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => (
            <ThanosTransition
              key={product.id}
              elementKey={product.id}
              intensity={product.stock && product.stock <= 1 ? 'epic' : 'fast'}
              mode="sync"
              reconstructDust={false}
            >
              <GameProductCard
                product={product}
                onSelect={onSelectProduct}
              />
            </ThanosTransition>
          ))}
        </AnimatePresence>

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 text-center space-y-3 bg-[#030910]/60 border border-slate-900 rounded-3xl p-6">
            <Compass size={36} className="text-emerald-500/40 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">No encontramos productos con estos criterios</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Prueba buscando otro término, cambiando de categoría o explorando todas las vitrinas.
            </p>
            {(activeQuery || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  handleClearSearch();
                }}
                className="mt-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-[#00ffb2] font-black px-4 py-2 rounded-xl text-xs border border-emerald-800/40 transition cursor-pointer"
              >
                Ver todo el catálogo
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
