import { createClient } from '@/lib/server';
import { Store } from '@/types';
import Link from 'next/link';
import Image from 'next/image';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: stores } = await supabase.from('stores').select('*');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section - Estilo Aurora */}
      <section className="relative bg-gradient-to-r from-indigo-900 via-purple-800 to-teal-700 py-24 px-6 text-center text-white overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            Descubre el ecosistema <span className="text-teal-300">AURA</span>
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-10">
            La infraestructura digital para el comercio moderno en Cumaná.
          </p>
          <button className="bg-teal-500 hover:bg-teal-400 text-white px-10 py-4 rounded-full font-bold transition-all transform hover:scale-105 shadow-2xl">
            Comenzar a comprar
          </button>
        </div>
      </section>

      {/* Grid de Tiendas */}
      <section className="max-w-7xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-slate-900 mb-10">Tiendas Oficiales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stores?.map((store: Store) => (
            <Link
              href={`/${store.slug}`}
              key={store.id}
              className="group bg-white p-8 rounded-3xl border border-slate-200 hover:border-teal-500 transition-all shadow-sm hover:shadow-xl"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-2xl mb-6 shadow-inner overflow-hidden flex items-center justify-center relative">
                {/* Usamos el operador de encadenamiento opcional (?) y validamos la cadena */}
                {store.logo_url && store.logo_url.trim() !== '' ? (
                  <Image
                    src={store.logo_url}
                    alt={`Logo de ${store.name}`}
                    fill
                    sizes="64px"
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <span className="text-2xl font-bold text-slate-400">
                    {store.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">{store.name}</h3>
              <p className="text-slate-600">Explorar productos y ofertas exclusivas.</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}