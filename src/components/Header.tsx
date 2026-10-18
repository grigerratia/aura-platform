'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store } from '@/types';
import { useReservations } from '@/store/useReservations';
import { Sparkles, Ticket, Store as StoreIcon, Flame, Clock, Wallet } from 'lucide-react';
import ReservationTicketModal from './ReservationTicketModal';
import WalletModal from './WalletModal';

interface Props {
  stores?: Store[];
  initialTasa?: number;
}

export default function Header({ stores, initialTasa = 500.0 }: Props) {
  const router = useRouter();
  const { activeReservation, setOpenTicketModal } = useReservations();
  const [tasa, setTasa] = useState(initialTasa);
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  return (
    <>
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          {/* Logo y Eslogan */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-700 via-purple-700 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              A
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                AURA
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                Cumaná
              </span>
            </div>
          </Link>

          {/* Selector de Tiendas Rápido */}
          {stores && stores.length > 0 && (
            <div className="hidden md:flex items-center">
              <select
                onChange={(e) => {
                  if (e.target.value) router.push(`/${e.target.value}`);
                }}
                className="bg-slate-100 hover:bg-slate-200 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer transition"
              >
                <option value="">Explorar por tienda...</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.slug}>
                    {store.name} {store.zone ? `(${store.zone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Menú de Acciones y Tasa */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tasa BCV del día */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
              <span className="text-slate-500">BCV:</span>
              <span className="text-emerald-700 font-extrabold">{tasa} Bs.</span>
            </div>

            {/* Acceso a Remates */}
            <Link
              href="/#remates"
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
            >
              <Flame size={14} className="text-amber-500 fill-amber-500" />
              <span className="hidden sm:inline">Liquidaciones</span>
            </Link>

            {/* Billetera y Saldo */}
            <button
              onClick={() => setIsWalletOpen(true)}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition"
              title="Mi Saldo a Favor y Perfil"
            >
              <Wallet size={14} className="text-teal-600" />
              <span className="hidden sm:inline">Billetera</span>
            </button>

            {/* Botón Mi Ticket (Si hay reserva activa) */}
            {activeReservation && (
              <button
                onClick={() => setOpenTicketModal(true)}
                className="cursor-pointer relative flex items-center gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Ticket size={15} />
                <span>Mi Ticket #{activeReservation.pin}</span>
                <span className="w-2 h-2 rounded-full bg-white animate-ping absolute -top-0.5 -right-0.5" />
              </button>
            )}

            {/* Acceso Comerciantes */}
            <Link
              href="/negocios"
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition shadow-sm"
            >
              <StoreIcon size={14} />
              <span className="hidden sm:inline">Comercios</span>
            </Link>
          </div>

        </div>
      </header>

      {/* Modal Global del Ticket de Reserva */}
      <ReservationTicketModal />

      {/* Modal de Billetera y Candado de Confianza */}
      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </>
  );
}