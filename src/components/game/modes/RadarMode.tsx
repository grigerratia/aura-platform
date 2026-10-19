'use client';

import { useState } from 'react';
import { Product, Store } from '@/types';
import CategoryIconBar from '../CategoryIconBar';
import GameProductCard from '../GameProductCard';
import { Search, Compass, SlidersHorizontal, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrado reactivo en 60 FPS
  const filteredProducts = products.filter((p) => {
    // Filtro por categoría
    if (selectedCategory !== 'all') {
      const rawCat = (p.category || '').toLowerCase();
      const archetype = (p.category_archetype || '').toLowerCase();

      if (selectedCategory === 'comida') {
        if (!rawCat.includes('comida') && !rawCat.includes('restaurante') && !archetype.includes('gastro')) {
          return false;
        }
      } else if (selectedCategory === 'moda') {
        if (!rawCat.includes('moda') && !rawCat.includes('calzado') && !rawCat.includes('zapato') && !rawCat.includes('ropa')) {
          return false;
        }
      } else if (selectedCategory === 'ferreteria') {
        if (!rawCat.includes('ferreter') && !rawCat.includes('herramienta') && !rawCat.includes('repuesto')) {
          return false;
        }
      } else if (selectedCategory === 'farmacia') {
        if (!rawCat.includes('farmacia') && !rawCat.includes('salud') && !rawCat.includes('medic')) {
          return false;
        }
      } else if (selectedCategory === 'vehiculos') {
        if (!rawCat.includes('veh') && !rawCat.includes('moto') && !rawCat.includes('carro')) {
          return false;
        }
      }
    }

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchDesc = (p.description || '').toLowerCase().includes(q);
      return matchName || matchDesc;
    }

    return true;
  });

  return (
    <div className="space-y-4 pb-20">
      
      {/* 1. BUSCADOR SUTIL RÁPIDO */}
      <div className="px-4">
        <div className="relative bg-[#030a10]/80 border border-emerald-950/70 hover:border-emerald-500/40 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-inner transition">
          <Search size={16} className="text-emerald-400 shrink-0" />
          <input
            type="text"
            placeholder="Radar Cumaná: escribe producto o tienda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-white placeholder-slate-500 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-500 hover:text-white px-1"
            >
              Borrar
            </button>
          )}
        </div>
      </div>

      {/* 2. FILA HORIZONTAL DE CATEGORÍAS (SIN PÍLDORAS) */}
      <CategoryIconBar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* 3. CONTADOR ULTRA-MINIMALISTA */}
      <div className="px-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-bold text-slate-300">
          <Compass size={14} className="text-emerald-400" />
          <span>Vitrinas en Cumaná ({filteredProducts.length})</span>
        </div>
        <span className="text-[11px] text-emerald-400/90 font-medium">60 FPS en vivo</span>
      </div>

      {/* 4. CUADRÍCULA DE TARJETAS MINIMALISTAS */}
      <div className="px-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {filteredProducts.map((product) => (
          <GameProductCard
            key={product.id}
            product={product}
            onSelect={onSelectProduct}
          />
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 text-center space-y-2 bg-[#030910]/60 border border-slate-900 rounded-3xl p-6">
            <Compass size={32} className="text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">No hay productos en este radar</h4>
            <p className="text-xs text-slate-500">Prueba cambiando de categoría o término de búsqueda.</p>
          </div>
        )}
      </div>

    </div>
  );
}

