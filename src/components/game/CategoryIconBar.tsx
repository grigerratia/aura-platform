'use client';

import { useGameSound } from '@/hooks/useGameSound';
import {
  Sparkles, Utensils, Tag, Gamepad2,
  Wrench, Pill, Home, Car, LayoutGrid
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface CategoryItem {
  id: string;
  label: string;
  icon: any;
}

export const GAME_CATEGORIES: CategoryItem[] = [
  { id: 'all', label: 'Todo', icon: LayoutGrid },
  { id: 'comida', label: 'Comida', icon: Utensils },
  { id: 'moda', label: 'Moda', icon: Tag },
  { id: 'juguetes', label: 'Juguetes', icon: Gamepad2 },
  { id: 'ferreteria', label: 'Ferretería', icon: Wrench },
  { id: 'farmacia', label: 'Farmacia', icon: Pill },
  { id: 'hogar', label: 'Hogar', icon: Home },
  { id: 'vehiculos', label: 'Vehículos', icon: Car },
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
      <div className="flex items-center gap-4 sm:gap-6 px-4 min-w-max">
        {GAME_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => {
                playTap();
                onSelectCategory(cat.id);
              }}
              className="cursor-pointer flex flex-col items-center gap-1.5 py-1 transition group"
            >
              {/* Icono con brillo aurora si está activo */}
              <div
                className={`p-2 rounded-2xl transition-all duration-300 ${
                  isSelected
                    ? 'bg-emerald-950/50 text-[#00ffb2] shadow-[0_0_15px_-2px_rgba(0,255,178,0.5)] border border-emerald-500/40 scale-105'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Icon size={18} />
              </div>

              {/* Texto limpio sin píldoras repetitivas */}
              <span
                className={`text-[11px] font-bold tracking-tight transition-colors ${
                  isSelected ? 'text-white font-black' : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                {cat.label}
              </span>

              {/* Subrayado sutil aurora en seleccionado */}
              {isSelected && (
                <motion.div
                  layoutId="activeCategoryDot"
                  className="w-4 h-0.5 rounded-full bg-[#00ffb2] shadow-[0_0_6px_#00ffb2]"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

