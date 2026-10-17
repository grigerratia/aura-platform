import { createClient } from '@/lib/server';
import { notFound } from 'next/navigation';
import { Star, Truck, ShieldCheck, MapPin, CheckCircle, Sparkles, Clock, ArrowLeft } from 'lucide-react';
import ProductActions from './ProductActions';
import getDolarTasa from '@/util/getDolarTasa';
import BackButton from '@/components/ui/BackButton';
import Header from '@/components/Header';
import { Product, Store } from '@/types';
import Link from 'next/link';

export default async function ProductPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ store?: string }>
}) {
  const { id } = await params;
  const { store: storeParam } = await searchParams;
  const productId = id.trim();

  const supabase = await createClient();

  // Armamos la consulta para traer el producto y la tienda correspondiente
  let query = supabase
    .from('store_products')
    .select(`
      id,
      price,
      stock,
      discount_percent,
      store_id,
      products (*),
      stores (*)
    `)
    .eq('product_id', productId);

  if (storeParam) {
    query = query.eq('store_id', storeParam);
  }

  const [tasa, { data: storeProduct, error }] = await Promise.all([
    getDolarTasa(),
    query.limit(1).maybeSingle()
  ]);

  if (!storeProduct || error) {
    return notFound();
  }

  const rawProduct = (storeProduct.products as any) || {};
  const rawStore = (storeProduct.stores as any) || {};

  const product: Product = {
    ...rawProduct,
    id: rawProduct.id || productId,
    price: storeProduct.price,
    stock: storeProduct.stock,
    discount_percent: storeProduct.discount_percent,
    store_id: storeProduct.store_id,
    sizes: rawProduct.sizes || ['37', '38', '39', '40'],
    is_clearance: (storeProduct.discount_percent && storeProduct.discount_percent >= 20) || false,
    clearance_badge: storeProduct.discount_percent ? `${storeProduct.discount_percent}% OFF` : undefined,
  };

  const store: Store = {
    id: rawStore.id || storeProduct.store_id,
    name: rawStore.name || 'Tienda Oficial',
    slug: rawStore.slug || '',
    whatsapp: rawStore.whatsapp || rawStore.owner_whatsapp,
    address: rawStore.address || rawStore.zone || 'Cumaná, Sucre',
    zone: rawStore.zone || 'Cumaná Centro',
    badges: rawStore.badges || ['Acepta Cashea', 'Punto de Venta', 'Delivery Local', 'Garantía en Local'],
    logo_url: rawStore.logo_url
  };

  // Lógica de Stock honesto
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
  const isLowStock = typeof product.stock === 'number' && product.stock > 0 && product.stock < 5;

  // Lógica de Precios
  const hasDbDiscountPercent = typeof (product.discount_percent ?? product.discount_percentage) === 'number' && (product.discount_percent ?? product.discount_percentage)! > 0;
  const hasDbSalePrice = typeof product.sale_price === 'number' && product.sale_price < product.price;
  const hasDiscount = hasDbDiscountPercent || hasDbSalePrice || product.is_clearance;

  let currentUSD = product.price;
  if (hasDbDiscountPercent) {
    currentUSD = product.price * (1 - (product.discount_percent ?? product.discount_percentage!) / 100);
  } else if (hasDbSalePrice) {
    currentUSD = product.sale_price!;
  }

  const displayDiscount = hasDbDiscountPercent
    ? (product.discount_percent ?? product.discount_percentage)
    : (hasDiscount ? Math.round(((product.price - currentUSD) / product.price) * 100) : 0);

  const priceVES = (currentUSD * tasa).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header stores={[store]} initialTasa={tasa} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Breadcrumb de Navegación */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-medium">
          <Link href="/" className="hover:text-indigo-600 transition">Vitrinas</Link>
          <span>/</span>
          <Link href={`/${store.slug}`} className="hover:text-indigo-600 transition">{store.name}</Link>
          <span>/</span>
          <span className="text-slate-900 font-bold truncate max-w-xs">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* Columna Izquierda: Imagen del Producto */}
          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm relative flex items-center justify-center min-h-[380px]">
            <BackButton />

            {product.is_clearance && (
              <div className="absolute top-4 right-4 z-10 bg-amber-500 text-slate-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Sparkles size={14} /> Remate de Hoy
              </div>
            )}

            <img
              src={product.imageUrl || product.image_url || '/placeholder.png'}
              alt={product.name}
              className="w-full h-auto object-contain max-h-[460px] mix-blend-multiply"
            />
          </div>

          {/* Columna Derecha: Información del Producto y Tienda */}
          <div className="space-y-6">
            
            {/* Categoría y Nombre */}
            <div>
              <span className="text-indigo-600 font-black text-xs uppercase tracking-widest block mb-1">
                {product.category || store.name}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Disponibilidad Honesta en Tienda */}
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isOutOfStock
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : isLowStock
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                <Clock size={15} />
                {isOutOfStock
                  ? 'Agotado Temporalmente'
                  : isLowStock
                  ? `¡Últimas ${product.stock} unidades en tienda!`
                  : 'Disponible en estante físico'}
              </div>
            </div>

            {/* Caja de Precios y Tasa BCV */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              {hasDiscount && (
                <div className="inline-block bg-red-600 text-white text-xs font-black px-3 py-1 rounded-md uppercase tracking-wide">
                  {displayDiscount}% OFF
                </div>
              )}

              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-slate-900">
                  ${currentUSD.toFixed(2)}
                </span>
                <span className="text-sm font-bold text-slate-500 uppercase">USD</span>
                {hasDiscount && (
                  <span className="text-base text-slate-400 line-through ml-2">
                    ${product.price.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                <span>Bs. {priceVES}</span>
                <span className="text-xs font-normal text-slate-400">• Tasa oficial BCV: {tasa} Bs.</span>
              </div>

              <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center gap-2">
                <ShieldCheck size={16} className="text-teal-600" />
                <span>Congelas este precio por 3 horas al apartar. Pagas en el local al retirar.</span>
              </div>
            </div>

            {/* Tallas / Variantes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Tallas Disponibles en Tienda
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((sz) => (
                    <span
                      key={sz}
                      className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 shadow-xs"
                    >
                      {sz}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Botón Principal de Reserva por 3 Horas */}
            <ProductActions product={product} store={store} tasa={tasa} />

            {/* Datos de la Tienda Física */}
            <div className="bg-slate-100/80 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    {store.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{store.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={12} className="text-indigo-600" /> {store.address || store.zone}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/${store.slug}`}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  Ver Vitrina
                </Link>
              </div>

              {/* Insignias de la Tienda */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200">
                {store.badges?.map((b) => (
                  <span key={b} className="text-[10px] font-bold px-2 py-0.5 bg-white text-slate-700 rounded-md border border-slate-200 flex items-center gap-1">
                    <CheckCircle size={10} className="text-teal-600" /> {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Descripción */}
            {product.description && (
              <div className="pt-2">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-2">
                  Detalles del producto
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}