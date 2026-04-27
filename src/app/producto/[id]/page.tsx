import { createClient } from '@/lib/server';
import { notFound } from 'next/navigation';
import { Star, Truck, ShieldCheck } from 'lucide-react';
import ProductActions from './ProductActions';
import getDolarTasa from '@/util/getDolarTasa';
import BackButton from '@/components/ui/BackButton';
import { CartFloating } from '@/components/CartFloating';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = id.trim();

  // Ejecutamos en paralelo la consulta a Supabase y la obtención de la tasa
  const supabase = await createClient();

  const [tasa, { data: storeProduct, error }] = await Promise.all([
    getDolarTasa(),
    // Buscamos en store_products y traemos la información relacionada de products
    supabase
      .from('store_products')
      .select(`
        price,
        stock,
        discount_percent,
        products (*)
      `)
      .eq('product_id', productId)
      .single()
  ]);

  if (!storeProduct || error) return notFound();

  // Fusionamos los datos para crear el objeto de producto correcto
  const product = {
    ...(storeProduct.products as any),
    price: storeProduct.price,
    stock: storeProduct.stock,
    discount_percent: storeProduct.discount_percent
  };

  // === LÓGICA DE STOCK ===
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
  const isLowStock = typeof product.stock === 'number' && product.stock > 0 && product.stock < 5;

  // === LÓGICA DE PRECIOS ===
  const hasDbDiscountPercent = typeof (product.discount_percent ?? product.discount_percentage) === 'number' && (product.discount_percent ?? product.discount_percentage) > 0;
  const hasDbSalePrice = typeof product.sale_price === 'number' && product.sale_price < product.price;
  const hasDiscount = hasDbDiscountPercent || hasDbSalePrice;

  let currentUSD = product.price;

  if (hasDbDiscountPercent) {
    currentUSD = product.price * (1 - (product.discount_percent ?? product.discount_percentage) / 100);
  } else if (hasDbSalePrice) {
    currentUSD = product.sale_price;
  }

  const displayDiscount = hasDbDiscountPercent
    ? (product.discount_percent ?? product.discount_percentage)
    : (hasDiscount ? Math.round(((product.price - currentUSD) / product.price) * 100) : 0);

  // Cálculo usando la tasa dinámica obtenida de getDolarTasa
  const priceVES = (currentUSD * tasa).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-12 font-sans">
      {/* Columna Izquierda: Imagen */}
      <div className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center relative ${isOutOfStock ? 'opacity-70 grayscale-[0.5]' : ''}`}>
        <BackButton />
        <img
          src={product.imageUrl || '/placeholder.png'}
          alt={product.name}
          className="w-full h-auto object-contain max-h-[500px]"
        />
      </div>

      {/* Columna Derecha: Información */}
      <div className="space-y-6">
        <div>
          <span className="text-brand-primary font-bold text-sm uppercase tracking-wider">
            {product.brand || "Sin marca"}
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1 leading-snug text-white">{product.name}</h1>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex text-amber-400">
            {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" strokeWidth={0} />)}
          </div>
          <span className="text-sm font-bold text-slate-700 text-white">{product.rating || "5.0"}</span>
          <span className="text-sm text-slate-500 text-white">({product.reviews_count || "0"} valoraciones)</span>
        </div>

        {/* Precios y Descuentos */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
          {hasDiscount && (
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wide">
              {displayDiscount}% OFF
            </span>
          )}

          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">US$</span>
              <span className="text-5xl font-black text-slate-900">{currentUSD.toFixed(2)}</span>
            </div>

            {hasDiscount && (
              <div className="text-sm text-slate-400 line-through decoration-slate-400/70 mt-1">
                US$ {product.price.toFixed(2)}
              </div>
            )}

            <div className="text-lg font-semibold text-emerald-600 mt-2">Bs. {priceVES}</div>

            {/* Indicador de Disponibilidad */}
            <div className="mt-1 text-sm font-medium">
              {isOutOfStock ? (
                <span className="text-red-500">Producto agotado temporalmente</span>
              ) : isLowStock ? (
                <span className="text-amber-600">¡Solo quedan {product.stock} unidades!</span>
              ) : typeof product.stock === 'number' ? (
                <span className="text-emerald-600">Stock disponible: {product.stock}</span>
              ) : null}
            </div>
          </div>

          {product.free_shipping && (
            <div className="flex items-center gap-2 text-emerald-600 mt-4 bg-emerald-100/50 w-fit px-3 py-1.5 rounded-lg">
              <Truck size={18} /> <span className="font-bold text-sm">Envío gratis</span>
            </div>
          )}
        </div>

        {/* Componente cliente con los botones */}
        <ProductActions product={product} />

        {/* Garantía */}
        <div className="flex items-start gap-3 text-sm text-slate-600 border-t border-slate-200 pt-6 mt-6">
          <ShieldCheck className="text-brand-primary shrink-0 mt-0.5" size={24} />
          <p>Compra protegida con Aura. Recibe el producto exacto que pediste o te devolvemos tu dinero.</p>
        </div>

        {/* Descripción larga */}
        {product.description && (
          <div className="prose prose-slate max-w-none pt-2">
            <h3 className="font-bold text-lg mb-2">Descripción del producto</h3>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-white">
              {product.description}
            </p>
          </div>
        )}
      </div>
      <CartFloating initialTasa={tasa} />
    </main>
  );
}