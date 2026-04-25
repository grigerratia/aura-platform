'use client';

import { useRouter } from 'next/navigation';
import { Store } from '@/types';

export default function Header({ stores }: { stores: Store[] }) {
  const router = useRouter();

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-indigo-900 cursor-pointer" onClick={() => router.push('/')}>
          AURA
        </h1>

        <select
          onChange={(e) => router.push(`/shop/${e.target.value}`)}
          className="bg-slate-100 border-none rounded-xl p-2 text-sm font-medium outline-none"
        >
          <option value="">Seleccionar tienda...</option>
          {stores?.map((store) => (
            <option key={store.id} value={store.slug}>{store.name}</option>
          ))}
        </select>
      </div>
    </header>
  );
}