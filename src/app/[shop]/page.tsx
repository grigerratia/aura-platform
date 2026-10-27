import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import GetDolarTasa from "@/util/getDolarTasa";
import Header from "@/components/Header";
import { Store, Product } from "@/types";
import { MapPin, Phone, CheckCircle, ShieldCheck, Sparkles, MessageCircle, ArrowLeft } from "lucide-react";
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
      <main className="min-h-screen bg-[#020508] text-white flex items-center justify-center p-6 text-center">
        <div className="bg-[#030910] p-8 rounded-3xl border border-emerald-950/80 shadow-2xl max-w-md space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center mx-auto">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl font-black text-white">Tienda no encontrada</h1>
          <p className="text-slate-400 text-sm">
            La vitrina que buscas no está disponible o el enlace cambió.
          </p>
          <Link
            href="/"
            className="inline-block bg-[#00ffb2] hover:bg-emerald-400 text-black font-black px-6 py-3 rounded-xl text-xs transition"
          >
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
    sizes: item.products?.sizes || [],
    is_clearance: (item.discount_percent && item.discount_percent >= 20) || false,
    clearance_badge: item.discount_percent ? `${item.discount_percent}% OFF` : undefined,
  }));

  const badges = store.badges || ['Acepta Cashea', 'Punto de Venta', 'Efectivo / Divisas', 'Garantía de Tienda'];
  const waNumber = (store.owner_whatsapp || store.whatsapp || '').toString().replace(/[^0-9]/g, '');
  const waLink = waNumber ? `https://wa.me/${waNumber.startsWith('58') ? waNumber : `58${waNumber}`}?text=${encodeURIComponent(`Hola ${store.name}, vi sus productos en Aura y tengo una consulta.`)}` : null;

  return (
    <div className="min-h-screen bg-[#020508] text-white font-sans relative selection:bg-[#00ffb2] selection:text-black">
      {/* Luz Ambiental de Fondo: Aurora Boreal en Cielo Nocturno */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[10%] w-[38rem] h-[38rem] rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="absolute top-[30%] left-[-15%] w-[42rem] h-[42rem] rounded-full bg-purple-900/12 blur-[150px]" />
      </div>

      <div className="relative z-10">
        <Header stores={[store]} initialTasa={tasa} />

        {/* CABECERA DE VITRINA DE LA TIENDA */}
        <section className="bg-[#030910]/80 border-b border-emerald-950/70 backdrop-blur-md pt-20 sm:pt-24 pb-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="flex items-center gap-5">
                {/* Logo / Avatar */}
                <div className="w-20 h-20 bg-gradient-to-tr from-[#020508] to-emerald-950 rounded-3xl flex items-center justify-center text-[#00ffb2] text-3xl font-black shadow-[0_0_20px_rgba(0,255,178,0.25)] border-2 border-emerald-800/40 shrink-0 overflow-hidden relative">
                  {store.logo_url && store.logo_url.trim() !== '' ? (
                    <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    store.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-3xl font-black text-white tracking-tight">
                      {store.name}
                    </h1>
                    {store.verification_status === 'PENDING_REVIEW' ? (
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-950/40 text-amber-400 px-2.5 py-0.5 rounded-xl border border-amber-800/40">
                        En Revisión
                      </span>
                    ) : store.verification_status === 'DRAFT_UNVERIFIED' ? (
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded-xl border border-slate-800">
                        Borrador
                      </span>
                    ) : (
                      <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-950/50 text-[#00ffb2] px-2.5 py-0.5 rounded-xl border border-emerald-800/40 flex items-center gap-1 shadow-[0_0_10px_rgba(0,255,178,0.2)]">
                        <ShieldCheck size={13} /> Vitrina Verificada
                      </span>
                    )}
                  </div>

                  <p className="text-slate-400 text-sm mt-1 max-w-xl leading-relaxed">
                    {store.description || 'Catálogo oficial con reserva por 3 horas y pago directo en el local.'}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 font-medium flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-emerald-400" />
                      {store.address || store.zone || 'Cumaná, Sucre'}
                    </span>
                    <span>•</span>
                    <span>Tasa oficial: <strong className="text-[#00ffb2] font-black">{tasa} Bs.</strong></span>
                  </div>
                </div>
              </div>

              {/* Botón WhatsApp de la Tienda */}
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-950/80 hover:bg-[#00ffb2] text-[#00ffb2] hover:text-black font-black px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 text-xs border border-emerald-800/50 hover:border-[#00ffb2] shadow-[0_0_15px_rgba(0,255,178,0.2)] shrink-0 self-start md:self-auto"
                >
                  <MessageCircle size={16} />
                  <span>Contactar a la Tienda</span>
                </a>
              )}

            </div>

            {/* Insignias de Servicio y Confianza */}
            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-emerald-950/60">
              {badges.map((badge: string) => (
                <span
                  key={badge}
                  className="text-xs font-bold px-3 py-1 bg-slate-950/60 text-slate-300 rounded-xl border border-slate-800/60 flex items-center gap-1.5"
                >
                  <CheckCircle size={13} className="text-emerald-400" /> {badge}
                </span>
              ))}
            </div>

          </div>
        </section>

        {/* AVISO DE CONFIANZA Y PRECIO CONGELADO */}
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#00ffb2] shrink-0" />
              <span>
                <strong>Garantía de Vitrina Aura:</strong> Aparta tu producto con precio congelado por 3 horas y paga en caja al retirar.
              </span>
            </div>
            <span className="font-black text-[#00ffb2] shrink-0">
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
            <div className="bg-[#030910] p-12 rounded-3xl border border-emerald-950/80 text-center max-w-lg mx-auto space-y-2">
              <Sparkles size={28} className="text-emerald-500/50 mx-auto" />
              <p className="text-slate-300 font-bold">Esta tienda aún no tiene productos activos en su vitrina digital.</p>
              <p className="text-xs text-slate-500">Vuelve pronto para ver sus nuevas ofertas y liquidaciones.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}