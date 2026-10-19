'use client';

import { useState } from 'react';
import { Product } from '@/types';
import GameProductCard from '../GameProductCard';
import AuroraParticles from '../AuroraParticles';
import { Users, Sparkles, Flame, Check, ArrowRight } from 'lucide-react';

interface Props {
  products: Product[];
  onSelectProduct: (p: Product) => void;
}

export default function ManadasMode({ products, onSelectProduct }: Props) {
  // Simulación de estados de manada para productos
  const [joinedGroups, setJoinedGroups] = useState<Record<string, number>>({});

  // Tomamos los primeros 6 productos para compras grupales
  const groupProducts = products.slice(0, 8).map((p, idx) => {
    const target = 3;
    const baseJoined = (idx % 2 === 0) ? 2 : 1;
    const userJoined = joinedGroups[p.id] || 0;
    const currentJoined = Math.min(target, baseJoined + userJoined);

    return {
      product: p,
      targetCount: target,
      currentCount: currentJoined,
    };
  });

  return (
    <div className="space-y-5 pb-20">
      
      {/* 1. ENCABEZADO CON PARTÍCULAS CANVAS AURORA */}
      <div className="relative mx-4 rounded-3xl overflow-hidden bg-gradient-to-br from-violet-950/70 via-[#030910] to-[#020508] border border-violet-500/30 p-5 sm:p-6 shadow-2xl">
        <AuroraParticles count={18} />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-violet-400 text-xs font-black uppercase tracking-wider">
              <Users size={15} className="text-violet-400" />
              <span>Compras en Manada • Cumaná</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Desbloqueo Grupal
            </h2>
            <p className="text-xs text-slate-400 max-w-sm">
              Únete a otros compradores en la misma tienda física para desbloquear hasta 40% de descuento masivo.
            </p>
          </div>

          <div className="bg-[#020508]/80 backdrop-blur-md border border-violet-500/40 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-violet-300 shadow-inner">
            <Flame size={16} className="text-violet-400" />
            <span>Al completarse el cupo, todos pagan precio mayorista en caja.</span>
          </div>
        </div>
      </div>

      {/* 2. CUADRÍCULA DE MANADAS ACTIVAS CON BARRAS DE PROGRESO */}
      <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupProducts.map(({ product, targetCount, currentCount }) => {
          const isComplete = currentCount >= targetCount;
          const progressPercent = Math.round((currentCount / targetCount) * 100);

          return (
            <div
              key={product.id}
              onClick={() => onSelectProduct(product)}
              className="cursor-pointer group bg-[#030910] border border-violet-950/70 hover:border-violet-500/50 rounded-3xl p-4 flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_25px_-5px_rgba(168,85,247,0.25)] select-none"
            >
              <div className="flex gap-3 mb-3">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                  {product.imageUrl || product.image_url ? (
                    <img
                      src={product.imageUrl || product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">Aura</div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-violet-400 font-bold uppercase tracking-wider">
                    <Users size={12} />
                    <span>Manada 3 Personas</span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-violet-300 transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black text-white">
                      ${(product.aura_price_usd || product.price).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 line-through">
                      ${(product.regular_price_usd || product.price * 1.3).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* BARRA DE PROGRESO DE LA MANADA */}
              <div className="space-y-1.5 pt-2 border-t border-slate-900">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className={isComplete ? 'text-emerald-400' : 'text-violet-300'}>
                    {isComplete ? '✓ Manada Completa' : `${currentCount}/${targetCount} compradores unidos`}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {targetCount - currentCount === 1 ? '¡Falta solo 1!' : `Faltan ${targetCount - currentCount}`}
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* BOTÓN DE UNIRSE */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProduct(product);
                }}
                className="game-sweep w-full mt-3 cursor-pointer bg-gradient-to-r from-violet-900/90 to-indigo-800 text-white font-black py-2.5 px-3 rounded-xl text-xs transition border border-violet-500/40 hover:border-violet-400 flex items-center justify-center gap-1.5"
              >
                <Users size={13} className="text-violet-300" />
                <span>Unirme a esta Manada</span>
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}

