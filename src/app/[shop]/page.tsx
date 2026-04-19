import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import { CartFloating } from "@/components/CartFloating";

async function getDolarTasa() {
  try {
    const res = await fetch("https://ve.dolarapi.com/v1/dolares/paralelo", { cache: 'no-store' });
    const data = await res.json();
    return data.promedio || 35.0;
  } catch {
    return 35.0;
  }
}

export default async function ShopPage({ params }: { params: Promise<{ shop: string }> }) {
  const { shop } = await params;

  const [tasa, { data: products }] = await Promise.all([
    getDolarTasa(),
    supabase.from('products').select('*')
  ]);

  return (
    <main className="min-h-screen bg-slate-50/50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4">
        <h1 className="text-2xl font-black text-brand-primary uppercase">
          {shop.replace(/-/g, ' ')}
        </h1>
      </header>

      <section className="max-w-6xl mx-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {products?.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            tasa={tasa}
          />
        ))}
      </section>

      <CartFloating initialTasa={tasa} />
    </main>
  );
}