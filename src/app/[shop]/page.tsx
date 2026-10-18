import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import GetDolarTasa from "@/util/getDolarTasa";
import Header from "@/components/Header";
import { Store, Product } from "@/types";
import { MapPin, Phone, CheckCircle, ShieldCheck, Sparkles, MessageCircle } from "lucide-react";
import Link from "next/link";

export default async function ShopPage({ params }: { params: Promise<{ shop: string }> }) {
  const { shop } = await params;

  // 1. Obtenemos la tasa BCV y la Tienda simultáneamente
  const [tasa, { data: store, error: storeError }] = await Promise.all([
    GetDolarTasa(),
    supabase.from('stores').select('*').eq('slug', shop).single()
  ]);

  if (storeError || !store) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-md">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Tienda no encontrada</h1>
          <p className="text-slate-500 text-sm mb-6">
            La vitrina que buscas no está disponible o el enlace cambió.
          </p>
          <Link href="/" className="inline-block bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl text-sm">
            Ver todas las tiendas en Aura
          </Link>
        </div>
      </main>
    );
  }

  // 2. Consultamos el inventario activo de esta tienda
  const { data: inventory } = await supabase
    .from('store_products')
    .select(`
      id,
      price,
      stock,
      discount_percent,
      is_active,
      products (*)
    `)
    .eq('store_id', store.id)
    .eq('is_active', true);

  const products: Product[] = (inventory || []).map((item: any) => ({
    ...item.products,
    id: item.products?.id || item.id,
    price: item.price,
    store_product_id: item.id,
    stock: item.stock,
    discount_percent: item.discount_percent,
    store_id: store.id,
    sizes: item.products?.sizes || ['37', '38', '39', '40'],
    is_clearance: (item.discount_percent && item.discount_percent >= 20) || false,
    clearance_badge: item.discount_percent ? `${item.discount_percent}% OFF` : undefined,
  }));

  const badges = store.badges || ['Acepta Cashea', 'Punto de Venta', 'Efectivo / Divisas', 'Garantía de Tienda'];
  const waNumber = (store.owner_whatsapp || store.whatsapp || '').toString().replace(/[^0-9]/g, '');
  const waLink = waNumber ? `https://wa.me/${waNumber.startsWith('58') ? waNumber : `58${waNumber}`}?text=${encodeURIComponent(`Hola ${store.name}, vi sus productos en Aura y tengo una consulta.`)}` : null;

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans">
      <Header stores={[store]} initialTasa={tasa} />

      {/* CABECERA DE VITRINA DE LA TIENDA */}
      <section className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div className="flex items-center gap-5">
              {/* Logo / Avatar */}
              <div className="w-20 h-20 bg-gradient-to-tr from-slate-900 to-indigo-900 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-lg border-2 border-white shrink-0 overflow-hidden relative">
                {store.logo_url && store.logo_url.trim() !== '' ? (
                  <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                ) : (
                  store.name.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    {store.name}
                  </h1>
                  {store.verification_status === 'PENDING_REVIEW' ? (
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                      En Revisión
                    </span>
                  ) : store.verification_status === 'DRAFT_UNVERIFIED' ? (
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-300">
                      Borrador
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck size={12} /> Vitrina Verificada
                    </span>
                  )}
                </div>

                <p className="text-slate-600 text-sm mt-1 max-w-xl">
                  {store.description || 'Catálogo oficial con reserva por 3 horas y pago directo en el local.'}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} className="text-indigo-600" />
                    {store.address || store.zone || 'Cumaná, Sucre'}
                  </span>
                  <span>•</span>
                  <span>Tasa del día: <strong className="text-emerald-700">{tasa} Bs.</strong></span>
                </div>
              </div>
            </div>

            {/* Botón WhatsApp de la Tienda */}
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 text-xs shadow-md shadow-emerald-600/20 shrink-0 self-start md:self-auto"
              >
                <MessageCircle size={16} />
                Contactar a la Tienda
              </a>
            )}

          </div>

          {/* Insignias de Servicio y Confianza */}
          <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-100">
            {badges.map((badge: string) => (
              <span
                key={badge}
                className="text-xs font-bold px-3 py-1 bg-slate-50 text-slate-700 rounded-xl border border-slate-200 flex items-center gap-1.5"
              >
                <CheckCircle size={13} className="text-teal-600" /> {badge}
              </span>
            ))}
          </div>

        </div>
      </section>

      {/* AVISO DE CONFIANZA Y PRECIO CONGELADO */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-600 shrink-0" />
            <span>
              <strong>Garantía de Vitrina Aura:</strong> Aparta tu producto con precio congelado por 3 horas y paga en caja al retirar.
            </span>
          </div>
          <span className="font-bold text-indigo-700 shrink-0">
            {products.length} productos disponibles hoy
          </span>
        </div>
      </div>

      {/* SECCIÓN DE PRODUCTOS */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                store={store}
                tasa={tasa}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center max-w-lg mx-auto">
            <p className="text-slate-600 font-medium">Esta tienda aún no tiene productos activos en su vitrina digital.</p>
          </div>
        )}
      </main>
    </div>
  );
}