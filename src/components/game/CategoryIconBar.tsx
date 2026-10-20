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
    <div className="w-full overflow-x-auto no-scrollbar py-2 select-none">
      <div className="flex items-center gap-3.5 sm:gap-5 px-4 min-w-max">
        {GAME_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                playTap();
                onSelectCategory(cat.id);
              }}
              className="cursor-pointer flex flex-col items-center gap-2 py-1 transition-all group active:scale-95 outline-none"
            >
              {/* Contenedor del ícono: flotante, borderless, con brillo sutil en seleccionado */}
              <div
                className={`p-2.5 sm:p-3 rounded-2xl transition-all duration-300 flex items-center justify-center ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#06181f] to-[#020b12] text-[#00ffb2] shadow-[0_10px_25px_-5px_rgba(0,255,178,0.35)] scale-110 drop-shadow-[0_0_10px_rgba(0,255,178,0.5)]'
                    : 'bg-[#040913]/60 text-slate-400 hover:text-slate-200 hover:bg-[#071320]/80'
                }`}
              >
                <Icon size={20} className="stroke-[1.75]" />
              </div>

              {/* Título en letra ligera y color slate suave (sin blanco puro) */}
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
