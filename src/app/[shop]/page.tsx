import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import { CartFloating } from "@/components/CartFloating";
import GetDolarTasa from "@/util/getDolarTasa" //Otiene la tasa de cotización del dólar oficial BCV actualizada

export default async function ShopPage({ params }: { params: Promise<{ shop: string }> }) {
  const { shop } = await params;

  //OBTIENE LA TASA DE COTIZACIÓN DEL DOLAR OFICIAL BCV ACTUALIZADA (SERVIDO DE DOLARAPI.COM)
  const [tasa, { data: products }] = await Promise.all([
    GetDolarTasa(),
    supabase.from('products').select('*')
  ]);

  return (
    <main className="min-h-screen bg-slate-50/50">

      {/* HEADER DE LA PÁGINA STORE */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4">
        <h1 className="text-2xl font-black text-brand-primary upercase">
          {shop.replace(/-/g, ' ')}
        </h1>
      </header>

      {/* SECCIÓN DE PRODUCTOS DE LA STORE */}
      <section className="max-w-6xl mx-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {products?.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            tasa={tasa}
          />
        ))}
      </section>

      {/* BOTÓN DEL CARRITO FLOTANTE */}
      <CartFloating initialTasa={tasa} />
    </main>
  );
}