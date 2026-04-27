import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import { CartFloating } from "@/components/CartFloating";
import GetDolarTasa from "@/util/getDolarTasa";

export default async function ShopPage({ params }: { params: Promise<{ shop: string }> }) {
  const { shop } = await params;

  // 1. Obtenemos la tasa BCV y la Tienda simultáneamente
  // Buscamos la tienda por su slug (que es el parámetro shop)
  const [tasa, { data: store, error: storeError }] = await Promise.all([
    GetDolarTasa(),
    supabase.from('stores').select('id').eq('slug', shop).single()
  ]);

  if (storeError || !store) {
    return <main className="p-10 text-center">Tienda no encontrada</main>;
  }

  // 2. Consultamos la tabla intermedia usando el ID de la tienda obtenida
  // Traemos los datos de la tabla intermedia y el JOIN con la tabla products
  const { data: inventory } = await supabase
    .from('store_products')
    .select(`
      price,
      stock,
      discount_percent,
      products (*)
    `)
    .eq('store_id', store.id)
    .eq('is_active', true); // Solo productos visibles

  return (
    <main className="min-h-screen bg-slate-50/50">
      {/* HEADER DE LA PÁGINA STORE */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4">
        <h1 className="text-2xl font-black text-brand-primary uppercase">
          {shop.replace(/-/g, ' ')}
        </h1>
      </header>

      {/* SECCIÓN DE PRODUCTOS DE LA STORE */}
      <section className="max-w-6xl mx-auto p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {inventory?.map((item: any) => (
          <ProductCard
            key={item.products.id}
            // Aquí pasamos el producto real, pero sobrescribimos el precio con el de la tienda
            product={{
              ...item.products,
              price: item.price,
              stock: item.stock,
              discount_percent: item.discount_percent
            }}
            tasa={tasa}
          />
        ))}
      </section>

      {/* BOTÓN DEL CARRITO FLOTANTE */}
      <CartFloating initialTasa={tasa} />
    </main>
  );
}