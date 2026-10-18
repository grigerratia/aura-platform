'use client';

import { useState } from 'react';
import { Product, Store } from '@/types';
import MultiRubroBar, { MultiRubroCategory, MULTI_RUBRO_CATEGORIES } from './MultiRubroBar';
import { ProductCard } from './ProductCard';
import { Sparkles, Flame, Store as StoreIcon, Layers } from 'lucide-react';

interface Props {
  initialProducts: Product[];
  tasa: number;
  stores: Store[];
}

export default function HomeMultiRubroSection({ initialProducts, tasa, stores }: Props) {
  const [activeCategory, setActiveCategory] = useState<MultiRubroCategory>(MULTI_RUBRO_CATEGORIES[0]);

  // Filtrado por vertical
  const filteredProducts = initialProducts.filter((p) => {
    if (activeCategory.id === 'all') return true;

    // Comparar por arquetipo
    if (activeCategory.archetype && p.category_archetype === activeCategory.archetype) {
      return true;
    }

    // Comparar por coincidencia en categoría o nombre
    if (activeCategory.categoryQuery) {
      const q = activeCategory.categoryQuery.toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();
      if (pCat.includes(q) || pName.includes(q)) return true;
    }

    return false;
  });

  // Ordenar: Primero los patrocinados (Aura Ads Motor 3)
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (a.is_sponsored && !b.is_sponsored) return -1;
    if (!a.is_sponsored && b.is_sponsored) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Barra de navegación de verticales multi-rubro */}
      <MultiRubroBar
        activeId={activeCategory.id}
        onSelect={(cat) => setActiveCategory(cat)}
      />

      <div className="max-w-7xl mx-auto px-4">
        {/* Cabecera del catálogo filtrado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
              <Layers size={14} className="text-indigo-600" />
              <span>Explorando: <strong className="text-slate-900">{activeCategory.name}</strong></span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {activeCategory.id === 'all' ? 'Vitrinas de Toda la Ciudad' : activeCategory.name}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            {sortedProducts.length} {sortedProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'}
          </span>
        </div>

        {/* Grid de Productos */}
        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedProducts.map((prod) => {
              const store = stores.find((s) => s.id === prod.store_id);
              return (
                <div key={prod.id} className="relative">
                  {prod.is_sponsored && (
                    <div className="absolute top-2 right-2 z-20 bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <Sparkles size={10} /> Destacado
                    </div>
                  )}
                  <ProductCard product={prod} tasa={tasa} store={store} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-2">
            <StoreIcon size={32} className="mx-auto text-slate-400" />
            <h4 className="font-bold text-slate-900 text-base">Aún no hay productos en esta categoría hoy</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Los comercios de Cumaná están actualizando sus vitrinas en vivo. Explora &quot;Todo Cumaná&quot; para ver las ofertas activas.
            </p>
            <button
              onClick={() => setActiveCategory(MULTI_RUBRO_CATEGORIES[0])}
              className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              Ver todas las categorías
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

