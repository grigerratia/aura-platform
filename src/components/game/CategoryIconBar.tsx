'use client';

import { useGameSound } from '@/hooks/useGameSound';
import { LayoutGrid } from 'lucide-react';
import { AURA_OFFICIAL_CATEGORIES } from '@/lib/categories';

export interface CategoryItem {
  id: string;
  label: string;
  icon: any;
  colorHex?: string;
}

export const GAME_CATEGORIES: CategoryItem[] = [
  { id: 'all', label: 'Todo', icon: LayoutGrid, colorHex: '#00ffb2' },
  ...AURA_OFFICIAL_CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.name,
    icon: cat.icon,
    colorHex: cat.colorHex,
  })),
];

interface Props {
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
}

export default function CategoryIconBar({
  selectedCategory,
  onSelectCategory,
}: Props) {
  const { playTap } = useGameSound();

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-3 select-none">
      <div className="flex items-center gap-3 sm:gap-4 px-4 min-w-max">
        {GAME_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          const accentColor = cat.colorHex || '#00ffb2';

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                playTap();
                onSelectCategory(cat.id);
              }}
              className="cursor-pointer flex flex-col items-center gap-2 py-1 transition-all group active:scale-95 outline-none relative"
            >
              {/* Contenedor del ícono: Vidrio oscuro, reflejo especular de 1px y glow interno contenido (sin cortes) */}
              <div
                className={`relative overflow-hidden p-2.5 sm:p-3 rounded-2xl transition-all duration-300 flex items-center justify-center ${
                  isSelected
                    ? 'bg-[#050b16]/95 text-[#00ffb2] scale-105'
                    : 'bg-[#050b16]/50 text-slate-400 hover:text-slate-200 hover:bg-[#071322]/70'
                }`}
              >
                {/* 1. Reflejo especular superior fino (Estilo WelcomePortal) */}
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffb2]/50 to-transparent transition-opacity duration-300 ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                  }`}
                />

                {/* 2. Luz ambiental interior confinada (NO choca ni se corta con el contenedor) */}
                <div
                  className="pointer-events-none absolute inset-0 transition-opacity duration-300 rounded-2xl"
                  style={{
                    background: `radial-gradient(40px circle at 50% 10%, ${accentColor}26, transparent 75%)`,
                    opacity: isSelected ? 1 : 0,
                  }}
                />

                <Icon
                  size={20}
                  className="relative z-10 stroke-[1.8] transition-transform duration-300"
                  style={{ color: isSelected ? accentColor : undefined }}
                />
              </div>

              {/* Título en letra ligera y color suave (sin blancos puros) */}
              <span
                className={`text-[11px] sm:text-xs font-light tracking-wide transition-colors ${
                  isSelected
                    ? 'text-emerald-300 font-medium'
                    : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
