'use client';

import { CategoryArchetype } from '@/types';
import { 
  Sparkles, Utensils, Gift, Shirt, 
  Tv, Wrench, Pill, Car, Layers
} from 'lucide-react';

export interface MultiRubroCategory {
  id: string;
  name: string;
  archetype?: CategoryArchetype;
  categoryQuery?: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

export const MULTI_RUBRO_CATEGORIES: MultiRubroCategory[] = [
  { id: 'all', name: 'Todo Cumaná', icon: Layers },
  { id: 'gastro', name: 'Comida Hoy (Flash Gastro)', archetype: 'GASTRO_FLASH', categoryQuery: 'Comida', icon: Utensils, badge: 'Canje Hoy', badgeColor: 'bg-amber-500' },
  { id: 'fashion', name: 'Moda y Calzado', archetype: 'RETAIL_STANDARD', categoryQuery: 'Calzado', icon: Shirt, badge: 'Tallas', badgeColor: 'bg-indigo-600' },
  { id: 'highticket', name: 'Hogar y Electro', archetype: 'HIGH_TICKET', categoryQuery: 'Electrodomésticos', icon: Tv, badge: 'Apartado', badgeColor: 'bg-teal-600' },
  { id: 'urgent_tools', name: 'Ferretería y Repuestos', archetype: 'URGENT_SEARCH', categoryQuery: 'Ferretería', icon: Wrench, badge: 'Inmediato', badgeColor: 'bg-orange-600' },
  { id: 'pharmacy', name: 'Farmacia y Salud', archetype: 'URGENT_SEARCH', categoryQuery: 'Farmacia', icon: Pill },
  { id: 'toys', name: 'Juguetes y Regalos', archetype: 'RETAIL_STANDARD', categoryQuery: 'Juguetería', icon: Gift },
  { id: 'vehicles', name: 'Vehículos y Motos', archetype: 'VEHICLES_CLASSIFIED', categoryQuery: 'Vehículos', icon: Car, badge: 'Cita Previa', badgeColor: 'bg-rose-600' },
];

interface Props {
  activeId: string;
  onSelect: (cat: MultiRubroCategory) => void;
}

export default function MultiRubroBar({ activeId, onSelect }: Props) {
  return (
    <div className="w-full bg-white border-y border-slate-200/80 shadow-xs sticky top-16 z-30 backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {MULTI_RUBRO_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeId === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat)}
                className={`cursor-pointer group shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-102'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60 hover:border-slate-300'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-teal-400' : 'text-slate-500 group-hover:text-indigo-600'} />
                <span className="whitespace-nowrap">{cat.name}</span>
                {cat.badge && (
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full text-white ${cat.badgeColor || 'bg-indigo-600'}`}>
                    {cat.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

