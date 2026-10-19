'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store } from '@/types';
import { useReservations } from '@/store/useReservations';
import { supabase } from '@/lib/supabase';
import {
  Sparkles, Ticket, Store as StoreIcon, Flame, Clock, Wallet,
  User, LogOut, ChevronDown, UserPlus, LogIn, ShieldCheck, DollarSign
} from 'lucide-react';
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
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ full_name?: string; role?: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .maybeSingle();
        setProfile(data);
      }
    };
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', session.user.id)
          .maybeSingle();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setUserMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Mi Cuenta';

  return (
    <>
      <header className="bg-[#020508]/85 backdrop-blur-xl sticky top-0 z-40 border-b border-emerald-950/60 shadow-lg select-none">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          {/* Logo y Eslogan */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-black font-black text-lg shadow-[0_0_15px_rgba(0,255,178,0.3)] group-hover:scale-105 transition-transform">
              A
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white group-hover:text-[#00ffb2] transition-colors">
                AURA
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 text-[#00ffb2] border border-emerald-800/40 px-2 py-0.5 rounded-xl">
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
                className="bg-[#030910] hover:bg-slate-900 border border-emerald-950/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 outline-none cursor-pointer transition"
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
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 text-slate-300 text-xs font-bold border border-slate-800/60">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">BCV:</span>
              <span className="text-[#00ffb2] font-black">{tasa} Bs.</span>
            </div>

            {/* Acceso a Remates */}
            <Link
              href="/#remates"
              className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/40 transition"
            >
              <Flame size={14} className="text-rose-400 fill-rose-400" />
              <span>Liquidaciones</span>
            </Link>

            {/* Billetera y Saldo */}
            <button
              onClick={() => setIsWalletOpen(true)}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#00ffb2] bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/40 transition"
              title="Mi Saldo a Favor y Perfil"
            >
              <Wallet size={14} />
              <span className="hidden sm:inline">Billetera</span>
            </button>

            {/* Botón Mi Ticket (Si hay reserva activa) */}
            {activeReservation && (
              <button
                onClick={() => setOpenTicketModal(true)}
                className="cursor-pointer relative flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black px-3.5 py-2 rounded-xl font-black text-xs shadow-[0_0_15px_rgba(0,255,178,0.3)] hover:scale-105 active:scale-95 transition-all"
              >
                <Ticket size={15} />
                <span className="hidden sm:inline">Mi Ticket</span> #{activeReservation.pin}
              </button>
            )}

            {/* USUARIO AUTENTICADO vs INVITADO */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="cursor-pointer flex items-center gap-2 bg-[#030910] hover:bg-slate-900 text-white px-3 py-2 rounded-xl font-bold text-xs border border-emerald-950/80 transition"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[80px] sm:max-w-[120px] truncate">{displayName}</span>
                  <ChevronDown size={14} className="text-slate-500" />
                </button>

                {/* Dropdown del Menú de Usuario */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-[#030910] rounded-2xl shadow-2xl border border-emerald-950/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-white">
                      <div className="px-4 py-2 border-b border-slate-900">
                        <div className="font-bold text-xs text-white truncate">
                          {profile?.full_name || user.email}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                          {profile?.role === 'owner' ? 'Comerciante' : profile?.role === 'admin' ? 'Administrador' : 'Cliente Aura'}
                        </div>
                      </div>

                      {/* Enlaces según rol */}
                      {profile?.role === 'owner' && (
                        <Link
                          href="/negocios/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/60"
                        >
                          <StoreIcon size={14} className="text-indigo-400" />
                          <span>Panel de Mi Tienda</span>
                        </Link>
                      )}

                      {profile?.role === 'admin' && (
                        <Link
                          href="/master"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/60"
                        >
                          <ShieldCheck size={14} className="text-purple-400" />
                          <span>Panel Master</span>
                        </Link>
                      )}

                      <Link
                        href="/perfil"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/60"
                      >
                        <User size={14} className="text-emerald-400" />
                        <span>Mi Perfil & Preferencias</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setIsWalletOpen(true);
                        }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/60 cursor-pointer"
                      >
                        <Wallet size={14} className="text-emerald-400" />
                        <span>Mi Billetera & Saldo</span>
                      </button>

                      <div className="my-1 border-t border-slate-900" />

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/30 cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1 text-slate-300 hover:text-white px-2.5 sm:px-3 py-2 rounded-xl font-bold text-xs hover:bg-slate-900/60 transition"
                >
                  <LogIn size={14} className="text-emerald-400" />
                  <span className="hidden sm:inline">Entrar</span>
                </Link>

                <Link
                  href="/registro"
                  className="flex items-center gap-1 bg-[#00ffb2] hover:bg-emerald-400 text-black px-3 py-2 rounded-xl font-black text-xs shadow-[0_0_12px_rgba(0,255,178,0.2)] transition active:scale-95"
                >
                  <UserPlus size={14} />
                  <span>Crear Cuenta</span>
                </Link>
              </div>
            )}

            {/* Acceso Comerciantes */}
            <Link
              href="/negocios"
              className="hidden md:flex items-center gap-1.5 bg-[#030910] hover:bg-emerald-950/40 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl font-bold text-xs transition border border-emerald-950/80 shrink-0"
            >
              <StoreIcon size={14} className="text-emerald-400" />
              <span>Comercios</span>
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