'use client';

import { useState } from 'react';
import { Product } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { Sparkles, Target, Flame, ArrowRight, X, Check } from 'lucide-react';

interface Props {
  products: Product[];
  tasa: number;
}

type SizeCategory = 'calzado' | 'ropa' | 'pantalones';

const SIZES_MAP: Record<SizeCategory, { label: string; sizes: string[] }> = {
  calzado: {
    label: '👟 Calzado / Zapatos',
    sizes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  },
  ropa: {
    label: '👕 Ropa / Camisas',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  },
  pantalones: {
    label: '👖 Pantalones / Jeans',
    sizes: ['26', '28', '30', '32', '34', '36', '38'],
  },
};

export default function SizeHunterFilter({ products, tasa }: Props) {
  const [activeCategory, setActiveCategory] = useState<SizeCategory>('calzado');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Filtrar productos que tengan la talla seleccionada
  const matchingProducts = selectedSize
    ? products.filter((p) => {
        if (!p.sizes || p.sizes.length === 0) return false;
        return p.sizes.some((sz) => sz.toLowerCase() === selectedSize.toLowerCase());
      })
    : [];

  return (
    <section id="cazador-tallas" className="max-w-7xl mx-auto py-10 px-4">
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
        
        {/* Glow decorativo */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          
          {/* Título de la sección */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20 mb-2">
                <Target size={14} className="text-teal-400" />
                Filtro Estrella • Evita inventario roto
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Cazador de Últimos Pares por Talla
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Selecciona tu talla exacta y descubre al instante qué tienda de Cumaná tiene pares únicos en remate hoy para ir a tiro seguro.
              </p>
            </div>

            {selectedSize && (
              <button
                onClick={() => setSelectedSize(null)}
                className="self-start md:self-auto cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition border border-white/10"
              >
                <X size={14} /> Quitar filtro ({selectedSize})
              </button>
            )}
          </div>

          {/* Selector de Categoría (Pestañas) */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(Object.keys(SIZES_MAP) as SizeCategory[]).map((catKey) => {
              const active = activeCategory === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => {
                    setActiveCategory(catKey);
                    setSelectedSize(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                    active
                      ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  {SIZES_MAP[catKey].label}
                </button>
              );
            })}
          </div>

          {/* Pastillas de Tallas Interactivas */}
          <div className="bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block mb-2.5">
              Toca tu talla exacta:
            </span>
            <div className="flex flex-wrap gap-2">
              {SIZES_MAP[activeCategory].sizes.map((sz) => {
                const isSelected = selectedSize === sz;
                // Contar cuántos productos tienen esta talla
                const count = products.filter(p => p.sizes?.some(s => s.toLowerCase() === sz.toLowerCase())).length;

                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(isSelected ? null : sz)}
                    className={`min-w-12 h-11 px-3.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/30 font-black scale-105 shadow-lg'
                        : count > 0
                        ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                        : 'bg-white/5 text-slate-500 border border-white/5 hover:text-slate-400'
                    }`}
                  >
                    <span className="text-sm font-black">{sz}</span>
                    {count > 0 && (
                      <span className={`text-[9px] font-semibold ${isSelected ? 'text-slate-900' : 'text-teal-400'}`}>
                        {count} disp.
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resultados filtrados por talla */}
          {selectedSize && (
            <div className="mt-8 pt-8 border-t border-white/10 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame size={18} className="text-amber-400" />
                  <h3 className="text-lg font-black text-white">
                    Pares Únicos Disponibles en Talla <span className="text-amber-400 underline font-black">{selectedSize}</span> ({matchingProducts.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  Aparta antes de que otro lo compre
                </span>
              </div>

              {matchingProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {matchingProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={{
                        ...prod,
                        clearance_badge: `Talla ${selectedSize} Lista`,
                        is_clearance: true
                      }}
                      tasa={tasa}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 border border-dashed border-white/20 rounded-2xl p-8 text-center text-slate-400">
                  <p className="text-sm font-medium mb-2">
                    Actualmente no hay pares sueltos en remate para la talla <strong>{selectedSize}</strong>.
                  </p>
                  <p className="text-xs text-slate-500">
                    Prueba seleccionando una talla cercana o explora el catálogo general.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

