import { createClient } from '@/lib/server'; // Verifica que la ruta coincida con tu archivo
import { notFound } from 'next/navigation';
import { Star, Truck, ShieldCheck, Zap } from 'lucide-react';

// IMPORTANTE: params ahora es una Promesa en las versiones nuevas
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  // 1. Esperamos a que lleguen los parámetros de la URL y extraemos el ID
  const { id } = await params;
  const productId = id.trim();

  // 2. Esperamos a que se cree el cliente (porque ahora es asíncrono)
  const supabase = await createClient();

  // 3. Hacemos la consulta a Supabase
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) {
    console.error("Error al buscar en Supabase:", error);
  }

  if (!product) {
    return notFound();
  }

  // Lógica de cálculo de precio
  const finalPrice = product.sale_price && product.sale_price < product.price
    ? product.sale_price
    : product.price * (1 - (product.discount_percentage || 0) / 100);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-12">
      {/* Columna Izquierda: Imagen */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-auto object-contain max-h-[500px]"
          />
        ) : (
          <div className="w-full h-64 bg-slate-50 flex items-center justify-center text-slate-400 rounded-xl">
            Imagen no disponible
          </div>
        )}
      </div>

      {/* Columna Derecha: Información */}
      <div className="space-y-6">
        <div>
          <span className="text-brand-primary font-bold text-sm tracking-wide uppercase">
            {product.brand || "Marca"}
          </span>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">{product.name}</h1>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex text-amber-400">
            {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
          </div>
          <span className="text-sm text-slate-500">{product.reviews_count || 0} valoraciones</span>
        </div>

        {/* Precio */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
          <div className="text-4xl font-black text-slate-900">US$ {finalPrice.toFixed(2)}</div>
          {product.free_shipping && (
            <div className="flex items-center gap-2 text-emerald-600 mt-3 bg-emerald-50 w-fit px-3 py-1 rounded-full">
              <Truck size={16} /> <span className="font-bold text-sm">Envío gratis</span>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="space-y-3 pt-2">
          <button className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold hover:bg-opacity-90 transition shadow-lg flex items-center justify-center gap-2">
            <Zap size={20} /> Comprar ahora
          </button>
          <button className="w-full border-2 border-slate-200 text-slate-700 py-4 rounded-xl font-bold hover:bg-slate-50 transition">
            Agregar al carrito
          </button>
        </div>

        {/* Garantía */}
        <div className="flex items-start gap-3 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
          <ShieldCheck className="text-brand-primary shrink-0 mt-0.5" size={20} />
          <p>Compra protegida, recibe el producto que esperabas o te devolvemos tu dinero.</p>
        </div>

        {/* Descripción larga */}
        <div className="prose prose-slate max-w-none border-t pt-6">
          <h3 className="font-bold text-lg mb-3">Descripción del producto</h3>
          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
            {product.description || "No hay descripción disponible por el momento."}
          </p>
        </div>
      </div>
    </main>
  );
}