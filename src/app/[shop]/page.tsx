// src/app/[shop]/page.tsx
import { ProductCard } from "../../components/ProductCart";
import { CartFloating } from "../../components/CartFloating";
import { Product } from "../../types";

// Datos de ejemplo (Luego los traeremos de Supabase)
const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Zapato Deportivo Ultra",
    description: "Ideales para el día a día en Cumaná.",
    price: 45,
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    category: "Calzado",
    storeId: "1",
  }
];

// Definimos el tipo de los parámetros que recibe la página
interface Props {
  params: Promise<{ shop: string }>;
}

export default async function ShopPage({ params }: Props) {
  // En Next.js 15, los parámetros de la URL se reciben como una Promesa
  const { shop } = await params;

  return (
    <main className="min-h-screen bg-slate-50/50">
      {/* Encabezado dinámico */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black text-brand-primary tracking-tighter uppercase">
            {/* Reemplazamos los guiones por espacios para que se vea bien */}
            {shop.replace(/-/g, ' ')}
          </h1>
          <div className="bg-slate-100 px-4 py-2 rounded-full text-sm font-bold text-slate-600">
            📍 Cumaná
          </div>
        </div>
      </header>

      {/* Listado de productos */}
      <section className="max-w-6xl mx-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {MOCK_PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>

      {/* Componente flotante del carrito */}
      <CartFloating />
    </main>
  );
}