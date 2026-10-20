import { CategoryArchetype } from '@/types';
import {
  Shirt,
  Smartphone,
  Home,
  Gamepad2,
  Wrench,
  Pill,
  Utensils,
  Sparkles,
  Car,
} from 'lucide-react';

export interface AuraCategoryDef {
  id: string;
  name: string;
  slug: string;
  archetype: CategoryArchetype;
  icon: any;
  colorHex: string;
  subcategories: string[];
  description: string;
}

/**
 * 9 Categorías Oficiales de Aura en el orden exacto solicitado:
 * 1. Moda, 2. Tecno, 3. Hogar, 4. Juguetes, 5. Ferretería, 6. Farmacia, 7. Comida, 8. Bienestar, 9. Vehículos.
 */
export const AURA_OFFICIAL_CATEGORIES: AuraCategoryDef[] = [
  {
    id: 'moda',
    name: 'Moda',
    slug: 'moda',
    archetype: 'RETAIL_STANDARD',
    icon: Shirt,
    colorHex: '#10b981',
    subcategories: ['Calzado', 'Ropa', 'Accesorios', 'Bolsos & Billeteras', 'Joyería & Relojes'],
    description: 'Calzado, prendas de vestir y accesorios',
  },
  {
    id: 'tecno',
    name: 'Tecno',
    slug: 'tecno',
    archetype: 'HIGH_TICKET',
    icon: Smartphone,
    colorHex: '#06b6d4',
    subcategories: ['Celulares & Tablets', 'Laptops & Computación', 'Audio & Auriculares', 'Accesorios Tech', 'Consolas & Gaming'],
    description: 'Tecnología, telefonía y computación',
  },
  {
    id: 'hogar',
    name: 'Hogar',
    slug: 'hogar',
    archetype: 'HIGH_TICKET',
    icon: Home,
    colorHex: '#38bdf8',
    subcategories: ['Muebles', 'Electrodomésticos', 'Decoración & Iluminación', 'Camas & Colchones', 'Cocina & Bazar'],
    description: 'Equipamiento, muebles y decoración para el hogar',
  },
  {
    id: 'juguetes',
    name: 'Juguetes',
    slug: 'juguetes',
    archetype: 'RETAIL_STANDARD',
    icon: Gamepad2,
    colorHex: '#f59e0b',
    subcategories: ['Juegos de Mesa', 'Juguetes Didácticos', 'Bebés & Primera Infancia', 'Figuras & Coleccionables', 'Peluches'],
    description: 'Juguetería, infantil y regalos',
  },
  {
    id: 'ferreteria',
    name: 'Ferretería',
    slug: 'ferreteria',
    archetype: 'URGENT_SEARCH',
    icon: Wrench,
    colorHex: '#ea580c',
    subcategories: ['Herramientas Manuales', 'Herramientas Eléctricas', 'Pinturas & Impermeabilizantes', 'Plomería & Grifería', 'Electricidad & Iluminación', 'Construcción'],
    description: 'Ferretería, materiales y herramientas',
  },
  {
    id: 'farmacia',
    name: 'Farmacia',
    slug: 'farmacia',
    archetype: 'URGENT_SEARCH',
    icon: Pill,
    colorHex: '#14b8a6',
    subcategories: ['Medicamentos', 'Cuidado Personal', 'Primeros Auxilios', 'Vitaminas & Suplementos', 'Maternidad & Bebé', 'Equipos Médicos'],
    description: 'Salud, bienestar y medicamentos',
  },
  {
    id: 'comida',
    name: 'Comida',
    slug: 'comida',
    archetype: 'GASTRO_FLASH',
    icon: Utensils,
    colorHex: '#f43f5e',
    subcategories: ['Restaurantes', 'Comida Rápida', 'Cafés & Panaderías', 'Postres & Helados', 'Bodegón & Bebidas'],
    description: 'Gastronomía local, menús del día y bebidas',
  },
  {
    id: 'bienestar',
    name: 'Bienestar',
    slug: 'bienestar',
    archetype: 'RETAIL_STANDARD',
    icon: Sparkles,
    colorHex: '#a855f7',
    subcategories: ['Skincare & Cosmética', 'Barbería & Peluquería', 'Spa & Masajes', 'Fitness & Suplementos Deportivos', 'Perfumería'],
    description: 'Belleza, cuidado personal y estética',
  },
  {
    id: 'vehiculos',
    name: 'Vehículos',
    slug: 'vehiculos',
    archetype: 'VEHICLES_CLASSIFIED',
    icon: Car,
    colorHex: '#ec4899',
    subcategories: ['Motos', 'Carros', 'Repuestos & Accesorios', 'Cauchos & Baterías', 'Lubricantes & Fluidos', 'Talleres & Servicios'],
    description: 'Vehículos, repuestos y talleres',
  },
];

/**
 * Función helper para comprobar si un producto coincide con una categoría de Aura
 */
export function getCategoryArchetype(categoryIdOrName: string): CategoryArchetype {
  const norm = (categoryIdOrName || '').toLowerCase().trim();
  const found = AURA_OFFICIAL_CATEGORIES.find(
    (c) => c.id.toLowerCase() === norm || c.name.toLowerCase() === norm || c.slug.toLowerCase() === norm
  );
  return found ? found.archetype : 'RETAIL_STANDARD';
}

export function matchProductCategory(
  productCategory = '',
  filterCategoryId = 'all',
  subcategory = '',
  productName = ''
): boolean {
  if (!filterCategoryId || filterCategoryId === 'all') return true;

  const cat = AURA_OFFICIAL_CATEGORIES.find((c) => c.id === filterCategoryId);
  if (!cat) return true;

  const rawCat = (productCategory || '').toLowerCase().trim();
  const rawSub = (subcategory || '').toLowerCase().trim();
  const rawName = (productName || '').toLowerCase().trim();

  const catName = cat.name.toLowerCase();
  const catSlug = cat.slug.toLowerCase();

  // 1. Coincidencia directa con categoría principal
  if (rawCat === catName || rawCat === catSlug) return true;
  if (rawCat.includes(catName) || rawCat.includes(catSlug)) return true;

  // 2. Coincidencia con subcategoría
  if (rawSub && cat.subcategories.some((s) => rawSub.includes(s.toLowerCase()) || s.toLowerCase().includes(rawSub))) {
    return true;
  }

  // 3. Coincidencia de subcategorías en categoría
  if (cat.subcategories.some((sub) => rawCat.includes(sub.toLowerCase()))) {
    return true;
  }

  // 4. Si el nombre del producto menciona explícitamente alguna subcategoría exclusiva (ej. 'audífonos', 'reloj')
  return cat.subcategories.some((sub) => {
    const s = sub.toLowerCase();
    return s.length > 3 && rawName.includes(s);
  });
}
