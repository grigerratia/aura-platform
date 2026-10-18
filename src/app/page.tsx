import { createClient } from '@/lib/server';
import { Store, Product } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import SizeHunterFilter from '@/components/SizeHunterFilter';
import HomeMultiRubroSection from '@/components/HomeMultiRubroSection';
import getDolarTasa from '@/util/getDolarTasa';
import { 
  Sparkles, Clock, ShieldCheck, MapPin, 
  Flame, CheckCircle, ArrowRight, Store as StoreIcon, Search, Target
} from 'lucide-react';

export default async function HomePage() {
  const supabase = await createClient();

  // Obtenemos en paralelo tiendas, tasa BCV y productos destacados de vitrina
  const [tasa, { data: storesData }, { data: storeProductsData }] = await Promise.all([
    getDolarTasa(),
    supabase.from('stores').select('*'),
    supabase
      .from('store_products')
      .select(`
        id,
        price,
        stock,
        discount_percent,
        store_id,
        products (*)
      `)
      .eq('is_active', true)
      .limit(16)
  ]);

  const stores: Store[] = storesData || [];

  // Mapeamos los productos de inventario a formato Product con arquetipos y variantes
  const products: Product[] = (storeProductsData || []).map((sp: any) => {
    const rawCat = (sp.products?.category || '').toLowerCase();
    const archetype = sp.products?.category_archetype || (
      rawCat.includes('comida') || rawCat.includes('restaurante') || rawCat.includes('café') ? 'GASTRO_FLASH' :
      rawCat.includes('vehículo') || rawCat.includes('moto') || rawCat.includes('carro') ? 'VEHICLES_CLASSIFIED' :
      rawCat.includes('electro') || rawCat.includes('mueble') || rawCat.includes('tecnología') ? 'HIGH_TICKET' :
      rawCat.includes('ferretería') || rawCat.includes('farmacia') || rawCat.includes('repuesto') ? 'URGENT_SEARCH' : 'RETAIL_STANDARD'
    );

    return {
      ...sp.products,
      id: sp.products?.id || sp.id,
      store_id: sp.store_id,
      store_product_id: sp.id,
      price: sp.price,
      regular_price_usd: sp.products?.regular_price_usd || sp.price,
      aura_price_usd: sp.products?.aura_price_usd || (sp.discount_percent ? Number((sp.price * (1 - sp.discount_percent / 100)).toFixed(2)) : sp.price),
      unlock_fee_usd: sp.products?.unlock_fee_usd,
      category_archetype: archetype,
      variants: sp.products?.variants || (sp.products?.sizes ? [{ label: 'Talla', options: sp.products.sizes }] : []),
      specs: sp.products?.specs || {},
      auto_confirm_stock: sp.products?.auto_confirm_stock,
      is_sponsored: Boolean(sp.products?.is_sponsored),
      published_at: sp.products?.published_at || sp.created_at,
      stock: sp.stock,
      discount_percent: sp.discount_percent,
      sizes: sp.products?.sizes || ['37', '38', '39', '40'],
      is_clearance: (sp.discount_percent && sp.discount_percent >= 20) || false,
      clearance_badge: sp.discount_percent ? `${sp.discount_percent}% OFF` : undefined,
    };
  });

  // Separamos remates / ofertas destacadas para la sección de dopamina
  const clearanceProducts = products.filter(p => p.is_clearance || (p.discount_percent && p.discount_percent > 0));
  const regularProducts = products;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header Unificado de Aura */}
      <Header stores={stores} initialTasa={tasa} />

      {/* Hero Section - Vitrina Local Cumaná */}
      <section className="relative bg-gradient-to-br from-indigo-950 via-purple-900 to-teal-800 text-white py-16 md:py-24 px-4 overflow-hidden">
        {/* Luces de fondo decorativas */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-teal-300 text-xs md:text-sm font-bold uppercase tracking-wider mb-6">
            <Sparkles size={16} className="text-teal-400" />
            Vitrina Local & Reserva Garantizada • Cumaná
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-6 tracking-tight leading-tight">
            Encuentra lo que buscas y <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-300 to-amber-300">apártalo en 1 clic</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-200/90 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            Sabe qué tienda física de Cumaná tiene tu talla hoy, congela el precio por 3 horas y ve a tiro seguro pagando directo en caja.
          </p>

          {/* Buscador Rápido Local */}
          <div className="max-w-2xl mx-auto bg-white p-2 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col sm:flex-row gap-2 border border-slate-200">
            <div className="flex-1 flex items-center px-4 py-2.5 gap-3">
              <Search className="text-slate-400 shrink-0" size={20} />
              <input
                type="text"
                placeholder="¿Qué buscas hoy? Ej: Zapatos 39, Camisa, Cashea..."
                className="w-full bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 text-sm font-medium"
              />
            </div>
            <a
              href="#tiendas"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3.5 rounded-xl md:rounded-2xl transition flex items-center justify-center gap-2 text-sm shadow-md"
            >
              Explorar Vitrinas
            </a>
          </div>

          {/* Pastillas de Filtros Rápidos */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <span className="text-xs text-white/70 font-semibold mr-1">Filtros populares:</span>
            <a href="#cazador-tallas" className="bg-teal-400/20 hover:bg-teal-400/30 text-teal-300 border border-teal-400/40 px-3.5 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 shadow-sm">
              <Target size={13} className="text-teal-400" /> Cazador de Tallas
            </a>
            <a href="#remates" className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1">
              <Flame size={13} /> Liquidaciones de Hoy
            </a>
            <span className="bg-white/10 text-white/90 px-3 py-1 rounded-full text-xs font-medium border border-white/10">
              Acepta Cashea
            </span>
            <span className="bg-white/10 text-white/90 px-3 py-1 rounded-full text-xs font-medium border border-white/10">
              Calzado y Zapatos
            </span>
            <span className="bg-white/10 text-white/90 px-3 py-1 rounded-full text-xs font-medium border border-white/10">
              Zona Centro
            </span>
          </div>

        </div>
      </section>

      {/* SECCIÓN 1: "Cómo Funciona Aura" (Tres Pasos de Certeza) */}
      <section className="max-w-6xl mx-auto py-12 px-4 -mt-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl shrink-0">
              1
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base mb-1">Explora la Vitrina</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Revisa disponibilidad, fotos y precios reales de tiendas en Cumaná sin caminar bajo el sol.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-black text-xl shrink-0">
              2
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base mb-1">Aparta por 3 Horas</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Congela el precio y tu talla en 1 clic. Recibes un Ticket QR con PIN de retiro para caja.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xl shrink-0">
              3
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base mb-1">Paga en el Local</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Retira en la tienda física y paga a tu gusto: Efectivo, Pago Móvil, Punto de Venta o Cashea.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* CATÁLOGO MULTI-RUBRO UNIVERSAL CON FILTRADO EN VIVO */}
      <HomeMultiRubroSection initialProducts={products} tasa={tasa} stores={stores} />

      {/* FILTRO ESTRELLA: "Cazador de Últimos Pares por Talla" */}
      <SizeHunterFilter products={products} tasa={tasa} />

      {/* SECCIÓN 2: "Remates Verificados de Hoy" (Dopamina y Escasez) */}
      <section id="remates" className="max-w-7xl mx-auto py-10 px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mb-2">
              <Flame size={14} className="fill-amber-500 text-amber-500" />
              Oportunidades de Hoy
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Liquidaciones y Últimas Tallas
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Mercancía de temporada y remates verificados para retirar hoy mismo.
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Tasa BCV del día: <strong className="text-emerald-700">{tasa} Bs.</strong>
          </span>
        </div>

        {clearanceProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {clearanceProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} tasa={tasa} />
            ))}
          </div>
        ) : regularProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {regularProducts.slice(0, 4).map((prod) => (
              <ProductCard key={prod.id} product={{ ...prod, is_clearance: true }} tasa={tasa} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center max-w-md mx-auto shadow-sm">
            <Flame className="text-amber-500 mx-auto mb-2" size={32} />
            <h3 className="font-bold text-slate-800 text-sm">Vitrinas renovando inventario</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Los comercios de Cumaná están actualizando sus ofertas de hoy.
            </p>
            <Link
              href="/negocios/registro"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl transition"
            >
              ¿Tienes una tienda? Publica tus productos aquí
            </Link>
          </div>
        )}
      </section>

      {/* SECCIÓN 3: Directorio de Vitrinas Oficiales de Cumaná */}
      <section id="tiendas" className="max-w-7xl mx-auto py-12 px-4">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 mb-2">
            <StoreIcon size={14} />
            Comercios Aliados
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Vitrinas Físicas en Cumaná
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Conoce los comercios con inventario activo y atención garantizada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => {
            const badges = store.badges || ['Acepta Cashea', 'Punto de Venta', 'Retiro Inmediato'];
            return (
              <Link
                href={`/${store.slug}`}
                key={store.id}
                className="group bg-white p-6 rounded-3xl border border-slate-200/80 hover:border-indigo-500 hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center relative border border-slate-200 shrink-0 shadow-inner">
                      {store.logo_url && store.logo_url.trim() !== '' ? (
                        <Image
                          src={store.logo_url}
                          alt={`Logo de ${store.name}`}
                          fill
                          sizes="64px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <span className="text-2xl font-black text-indigo-900">
                          {store.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <MapPin size={12} className="text-indigo-600" />
                        {store.zone || 'Cumaná Centro'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
                    {store.name}
                  </h3>
                  <p className="text-slate-500 text-xs line-clamp-2 mb-4 leading-relaxed">
                    {store.description || 'Calzado, ropa y artículos con reserva garantizada en Cumaná.'}
                  </p>

                  {/* Insignias de Confianza */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {badges.map((b) => (
                      <span
                        key={b}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1"
                      >
                        <CheckCircle size={10} className="text-teal-600" /> {b}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-800">
                  <span>Ver Vitrina y Productos</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SECCIÓN 4: Banner para Comerciantes Locales */}
      <section className="bg-slate-900 text-white py-16 px-4 mt-auto">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 p-8 sm:p-12 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest block">
              Para Dueños de Tiendas en Cumaná
            </span>
            <h2 className="text-3xl font-black tracking-tight">
              Convierte a los transeúntes en compradores reales
            </h2>
            <p className="text-slate-400 text-sm max-w-xl">
              Publica tus 15 productos clave y remates desde tu celular en 5 minutos. Recibe clientes en tu caja con el producto ya apartado.
            </p>
          </div>

          <Link
            href="/negocios"
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-8 py-4 rounded-2xl transition shadow-xl shadow-teal-500/20 whitespace-nowrap text-sm shrink-0"
          >
            Activar mi Vitrina
          </Link>
        </div>
      </section>
    </div>
  );
}