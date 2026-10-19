'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types';
import GameProductCard from '../GameProductCard';
import AuroraParticles from '../AuroraParticles';
import { Zap, Clock, Flame, Sparkles } from 'lucide-react';

interface Props {
  products: Product[];
  onSelectProduct: (p: Product) => void;
}

export default function RelampagoMode({ products, onSelectProduct }: Props) {
  // Cuenta regresiva al final del día
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

  // Filtrar productos relámpago / liquidaciones / combos del día
  const flashProducts = products.filter(
    (p) =>
      p.is_clearance ||
      (p.discount_percent && p.discount_percent >= 15) ||
      (p.stock && p.stock <= 3) ||
      p.category_archetype === 'GASTRO_FLASH'
  );

  return (
    <div className="space-y-5 pb-20">
      
      {/* 1. ENCABEZADO CON PARTÍCULAS CANVAS DE ENERGÍA Y CUENTA REGRESIVA */}
      <div className="relative mx-4 rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-950/80 via-[#030910] to-[#020508] border border-emerald-500/30 p-5 sm:p-6 shadow-2xl">
        <AuroraParticles count={18} />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-black uppercase tracking-wider">
              <Zap size={15} className="fill-rose-400 text-rose-400" />
              <span>Flash Outlets & Combos del Día</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Liquidaciones Relámpago
            </h2>
            <p className="text-xs text-slate-400 max-w-sm">
              Últimas tallas en remate físico y cupos gastronómicos limitados en Cumaná.
            </p>
          </div>

          {/* Reloj Digital de Cuenta Regresiva */}
          <div className="bg-[#020508]/80 backdrop-blur-md border border-rose-500/30 rounded-2xl p-3 flex items-center gap-3 self-start sm:self-auto shadow-inner">
            <Clock size={16} className="text-rose-400 animate-pulse" />
            <div className="flex items-center gap-1 font-mono text-sm sm:text-base font-black text-white">
              <span>{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="text-rose-400">:</span>
              <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="text-rose-400">:</span>
              <span className="text-rose-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CUADRÍCULA DE PRODUCTOS FLASH */}
      <div className="px-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {flashProducts.map((product) => (
          <GameProductCard
            key={product.id}
            product={product}
            onSelect={onSelectProduct}
            badgeType="clearance"
            customBadge={product.discount_percent ? `-${product.discount_percent}%` : 'Flash'}
          />
        ))}

        {flashProducts.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-slate-500 bg-[#030910] rounded-3xl p-6 border border-slate-900">
            No hay remates activos en este momento. Las tiendas publican a las 9:00 AM y 2:00 PM.
          </div>
        )}
      </div>

    </div>
  );
}

