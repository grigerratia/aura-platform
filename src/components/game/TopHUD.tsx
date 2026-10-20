'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useGameSound } from '@/hooks/useGameSound';
import {
  Shield, Wallet, Volume2, VolumeX,
  MapPin, ChevronDown, Check, X,
  User, LogIn, UserPlus, LogOut, Store as StoreIcon,
  ShieldCheck, Menu, Settings, DollarSign, Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onOpenWallet: () => void;
  walletCreditUSD?: number;
  selectedCity?: string;
  onSelectCity?: (city: string) => void;
  tasa?: number;
  onGoHome?: () => void;
}

export default function TopHUD({
  onOpenWallet,
  walletCreditUSD = 0.0,
  selectedCity = 'Cumaná',
  onSelectCity,
  tasa = 500.0,
  onGoHome,
}: Props) {
  const router = useRouter();
  const { isMuted, toggleMute, playTap } = useGameSound();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{
    full_name?: string;
    role?: string;
    id_doc?: string;
    trust_score?: number;
  } | null>(null);

  const [trustScore, setTrustScore] = useState(100);
  const [xp, setXp] = useState(650);
  const maxXp = 1000;

  const [showRankModal, setShowRankModal] = useState(false);
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showUserDrawer, setShowUserDrawer] = useState(false);
  const [balanceGlow, setBalanceGlow] = useState(false);

  // Cargar usuario autenticado y escuchar cambios
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role, id_doc, trust_score, wallet_credit_usd')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          setProfile(data);
          if (data.trust_score !== undefined) {
            setTrustScore(data.trust_score);
            setXp(Math.min(1000, data.trust_score * 10));
          }
        }
      }
    };
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role, id_doc, trust_score, wallet_credit_usd')
          .eq('id', session.user.id)
          .maybeSingle();
        setProfile(data);
        if (data?.trust_score !== undefined) {
          setTrustScore(data.trust_score);
          setXp(Math.min(1000, data.trust_score * 10));
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Efecto de brillo al cambiar saldo
  useEffect(() => {
    setBalanceGlow(true);
    const t = setTimeout(() => setBalanceGlow(false), 1200);
    return () => clearTimeout(t);
  }, [walletCreditUSD]);

  const handleSignOut = async () => {
    playTap();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setShowUserDrawer(false);
    router.push('/');
    router.refresh();
  };

  // Cálculo del Nivel de Aura (Bronce -> Plata -> Oro)
  // Colores boreales: Nivel 1 = Verde, Nivel 2 = Carmesí / Rojo, Nivel 3 = Azul con Violeta
  const getAuraLevel = () => {
    if (trustScore >= 95) {
      return {
        name: 'Nivel Oro',
        tier: 'Nivel 3',
        colorClass: 'text-violet-400',
        barClass: 'bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500',
        glowClass: 'aurora-glow-cosmic',
        badgeBorder: 'border-violet-500/50',
        badgeBg: 'bg-violet-950/40',
        iconColor: '#c084fc',
        description: 'Nivel Oro VIP: Máximo prestigio en Aura. Retiros prioritarios y 0% de recargo.',
      };
    }
    if (trustScore >= 80) {
      return {
        name: 'Nivel Plata',
        tier: 'Nivel 2',
        colorClass: 'text-rose-400',
        barClass: 'bg-gradient-to-r from-amber-500 to-rose-500',
        glowClass: 'aurora-glow-red',
        badgeBorder: 'border-rose-500/50',
        badgeBg: 'bg-rose-950/40',
        iconColor: '#fb7185',
        description: 'Nivel Plata: Comprador verificado con alta asistencia en comercios locales.',
      };
    }
    return {
      name: 'Nivel Bronce',
      tier: 'Nivel 1',
      colorClass: 'text-emerald-400',
      barClass: 'bg-gradient-to-r from-teal-500 to-emerald-400',
      glowClass: 'aurora-glow-green',
      badgeBorder: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-950/40',
      iconColor: '#00ffb2',
      description: 'Nivel Bronce: Nivel inicial estándar. Acceso completo a reservas de 3 horas.',
    };
  };

  const levelInfo = getAuraLevel();
  const xpPercent = Math.min(100, Math.round((xp / maxXp) * 100));
  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 bg-[#020508]/85 backdrop-blur-xl border-b border-emerald-950/60 select-none">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          
          {/* 1. IZQUIERDA: INSIGNIA DE NIVEL AURA + BARRA XP */}
          <div
            onClick={() => {
              playTap();
              setShowRankModal(true);
            }}
            className="cursor-pointer flex items-center gap-2 group transition active:scale-95"
            title="Ver tu Nivel de Aura y Beneficios"
          >
            <div
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${levelInfo.badgeBg} border ${levelInfo.badgeBorder} flex items-center justify-center transition-all group-hover:scale-105 ${levelInfo.glowClass}`}
            >
              <Shield size={16} color={levelInfo.iconColor} className="shrink-0" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] sm:text-xs font-black tracking-tight ${levelInfo.colorClass}`}>
                  {levelInfo.name}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider hidden xs:inline">
                  {levelInfo.tier}
                </span>
              </div>

              {/* Barra de Progreso XP brillante */}
              <div className="w-16 sm:w-24 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80 mt-0.5">
                <div
                  className={`h-full ${levelInfo.barClass} transition-all duration-500 shadow-sm`}
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* BOTÓN HOME AURA (VOLVER A LA PORTADA) */}
          {onGoHome && (
            <button
              type="button"
              onClick={() => {
                playTap();
                onGoHome();
              }}
              className="cursor-pointer text-[11px] sm:text-xs font-medium tracking-[0.25em] text-slate-300 hover:text-[#00ffb2] transition-colors uppercase px-3 py-1.5 rounded-xl hover:bg-slate-900/60 active:scale-95"
              title="Volver a la Portada de Inicio"
            >
              AURA
            </button>
          )}

          {/* 2. CENTRO: SALDO BILLETERA AURA */}
          <button
            onClick={() => {
              playTap();
              onOpenWallet();
            }}
            className="cursor-pointer flex items-center gap-2 px-2 py-1 rounded-xl transition active:scale-95 hover:bg-emerald-950/30 group"
            title="Abrir Billetera de Protección Aura"
          >
            <Wallet size={15} className="text-emerald-400 group-hover:rotate-6 transition-transform" />
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">
                Saldo:
              </span>
              <span
                className={`text-sm sm:text-base font-black tracking-tight transition-all duration-300 ${
                  balanceGlow
                    ? 'text-[#00ffb2] scale-110 drop-shadow-[0_0_12px_rgba(0,255,178,0.7)]'
                    : 'text-slate-200'
                }`}
              >
                ${walletCreditUSD.toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-400/80 font-bold">USD</span>
            </div>
          </button>

          {/* 3. DERECHA: TASA BCV + CIUDAD + LOGIN/PERFIL + MENÚ */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Tasa Oficial BCV */}
            <div
              className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs font-bold text-slate-300"
              title="Tasa Oficial BCV del día"
            >
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">BCV:</span>
              <span className="text-[#00ffb2] font-black">{tasa} Bs.</span>
            </div>

            {/* Selector de Ciudad */}
            <div className="relative hidden xs:block">
              <button
                onClick={() => {
                  playTap();
                  setShowCityMenu(!showCityMenu);
                }}
                className="cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white px-2 py-1.5 rounded-xl transition"
              >
                <MapPin size={13} className="text-emerald-400" />
                <span className="truncate max-w-[65px] sm:max-w-none">{selectedCity}</span>
                <ChevronDown size={12} className="text-slate-500" />
              </button>

              {showCityMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowCityMenu(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-36 bg-[#030a10] border border-emerald-950/80 rounded-2xl shadow-2xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                    {['Cumaná', 'Carúpano', 'Puerto La Cruz'].map((city) => (
                      <button
                        key={city}
                        onClick={() => {
                          playTap();
                          onSelectCity?.(city);
                          setShowCityMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                          selectedCity === city
                            ? 'text-[#00ffb2] bg-emerald-950/40'
                            : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
                        }`}
                      >
                        <span>{city}</span>
                        {selectedCity === city && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Botón Mute / Unmute con Lucide */}
            <button
              onClick={() => {
                playTap();
                toggleMute();
              }}
              className="cursor-pointer p-2 rounded-xl text-slate-400 hover:text-[#00ffb2] bg-slate-950/60 hover:bg-emerald-950/30 border border-slate-800/60 transition active:scale-95"
              title={isMuted ? 'Activar Efectos de Sonido' : 'Silenciar Interfaz'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* ACCIONES DE USUARIO: LOGIN / REGISTRO / AVATAR */}
            {user ? (
              <button
                onClick={() => {
                  playTap();
                  setShowUserDrawer(true);
                }}
                className="cursor-pointer flex items-center gap-1.5 bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-800/40 px-2 sm:px-2.5 py-1.5 rounded-xl transition text-xs font-bold text-slate-200"
                title="Abrir menú de usuario"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black">
                  {displayName.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline max-w-[70px] truncate">{displayName}</span>
                <Menu size={14} className="text-emerald-400" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  href="/login"
                  onClick={playTap}
                  className="cursor-pointer hidden sm:flex items-center gap-1 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-900/60 transition"
                >
                  <LogIn size={13} className="text-emerald-400" />
                  <span>Entrar</span>
                </Link>

                <Link
                  href="/registro"
                  onClick={playTap}
                  className="cursor-pointer hidden md:flex items-center gap-1 bg-[#00ffb2] hover:bg-emerald-400 text-[#020508] px-2.5 py-1.5 rounded-xl text-xs font-black transition active:scale-95 shadow-[0_0_12px_rgba(0,255,178,0.2)]"
                >
                  <UserPlus size={13} />
                  <span>Registro</span>
                </Link>

                <button
                  onClick={() => {
                    playTap();
                    setShowUserDrawer(true);
                  }}
                  className="cursor-pointer p-2 rounded-xl text-slate-300 hover:text-white bg-slate-950/60 border border-slate-800/60 transition"
                  title="Menú de Navegación y Cuenta"
                >
                  <Menu size={16} />
                </button>
              </div>
            )}

          </div>

        </div>
      </header>

      {/* DRAWER / MENÚ DE USUARIO Y CONFIGURACIÓN */}
      <AnimatePresence>
        {showUserDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-sm h-full bg-[#030910] border-l border-emerald-950/80 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                
                {/* Cabecera del Drawer */}
                <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-black font-black text-base shadow-[0_0_12px_rgba(0,255,178,0.4)]">
                      A
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-white tracking-tight">AURA</h3>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        Plataforma Hiperlocal
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      playTap();
                      setShowUserDrawer(false);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-900/80 rounded-xl transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Tarjeta de Usuario o Estado Invitado */}
                {user ? (
                  <div className="bg-[#020508] border border-emerald-950/60 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-black font-black flex items-center justify-center text-lg shadow-inner">
                        {displayName.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-white text-sm truncate">
                          {profile?.full_name || user.email}
                        </h4>
                        <span className="text-[10px] text-emerald-400 font-semibold block">
                          {profile?.role === 'owner'
                            ? 'Comerciante Autorizado'
                            : profile?.role === 'admin'
                            ? 'Administrador Master'
                            : 'Cliente Verificado Aura'}
                        </span>
                        {profile?.id_doc && (
                          <span className="text-[10px] text-slate-500 block">
                            C.I. {profile.id_doc}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900/80 text-xs">
                      <span className="text-slate-400">Reputación:</span>
                      <span className="font-black text-[#00ffb2]">{trustScore} / 100</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#020508] border border-emerald-950/60 rounded-2xl p-4 text-center space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-950/50 border border-emerald-800/40 text-[#00ffb2] flex items-center justify-center mx-auto">
                      <User size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Bienvenido a Aura</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Inicia sesión o regístrate para apartar productos y activar tu Candado de Confianza.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Link
                        href="/login"
                        onClick={() => {
                          playTap();
                          setShowUserDrawer(false);
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs text-center border border-slate-800 transition"
                      >
                        Entrar
                      </Link>
                      <Link
                        href="/registro"
                        onClick={() => {
                          playTap();
                          setShowUserDrawer(false);
                        }}
                        className="w-full bg-[#00ffb2] hover:bg-emerald-400 text-black font-black py-2.5 rounded-xl text-xs text-center transition"
                      >
                        Crear Cuenta
                      </Link>
                    </div>
                  </div>
                )}

                {/* Tasa BCV y Datos Rápidos */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-900 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <DollarSign size={14} className="text-emerald-400" />
                    <span>Tasa Oficial BCV:</span>
                  </div>
                  <span className="font-black text-emerald-400">{tasa} Bs.</span>
                </div>

                {/* Navegación y Enlaces de Cuenta */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-2 pb-1">
                    Mi Espacio
                  </div>

                  {onGoHome && (
                    <button
                      type="button"
                      onClick={() => {
                        playTap();
                        setShowUserDrawer(false);
                        onGoHome();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900/60 transition cursor-pointer text-left"
                    >
                      <Compass size={15} className="text-[#00ffb2]" />
                      <span>Portada / Inicio</span>
                    </button>
                  )}

                  <Link
                    href="/perfil"
                    onClick={() => {
                      playTap();
                      setShowUserDrawer(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900/60 transition"
                  >
                    <User size={15} className="text-emerald-400" />
                    <span>Mi Perfil & Preferencias</span>
                  </Link>

                  <button
                    onClick={() => {
                      playTap();
                      setShowUserDrawer(false);
                      onOpenWallet();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900/60 transition cursor-pointer text-left"
                  >
                    <Wallet size={15} className="text-emerald-400" />
                    <span>Billetera Aura & Saldo</span>
                  </button>

                  {/* Panel de Comercio (si es owner) */}
                  {profile?.role === 'owner' && (
                    <Link
                      href="/negocios/dashboard"
                      onClick={() => {
                        playTap();
                        setShowUserDrawer(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-indigo-300 hover:text-white hover:bg-indigo-950/40 transition"
                    >
                      <StoreIcon size={15} className="text-indigo-400" />
                      <span>Panel de Mi Negocio</span>
                    </Link>
                  )}

                  {/* Panel Master (si es admin) */}
                  {profile?.role === 'admin' && (
                    <Link
                      href="/master"
                      onClick={() => {
                        playTap();
                        setShowUserDrawer(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-violet-300 hover:text-white hover:bg-violet-950/40 transition"
                    >
                      <ShieldCheck size={15} className="text-violet-400" />
                      <span>Panel Master Admin</span>
                    </Link>
                  )}

                  {/* Acceso para nuevos comercios si no es owner */}
                  {profile?.role !== 'owner' && (
                    <Link
                      href="/negocios"
                      onClick={() => {
                        playTap();
                        setShowUserDrawer(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 transition"
                    >
                      <StoreIcon size={15} className="text-slate-500" />
                      <span>Portal para Comercios</span>
                    </Link>
                  )}
                </div>

                {/* Preferencias de Sonido y Ciudad */}
                <div className="space-y-2 pt-2 border-t border-slate-900">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-2">
                    Preferencias de Interfaz
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/40 text-xs">
                    <span className="text-slate-300 font-semibold">Efectos de Sonido</span>
                    <button
                      onClick={() => {
                        playTap();
                        toggleMute();
                      }}
                      className="text-xs font-bold text-emerald-400 hover:text-[#00ffb2] cursor-pointer"
                    >
                      {isMuted ? 'Silenciado' : 'Activados'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/40 text-xs">
                    <span className="text-slate-300 font-semibold">Ciudad Actual</span>
                    <span className="text-xs font-bold text-white">{selectedCity}</span>
                  </div>
                </div>

              </div>

              {/* Botón de Cerrar Sesión (si está logueado) */}
              {user && (
                <div className="pt-6 border-t border-slate-900">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 text-rose-400 hover:text-rose-300 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EXPLICATIVO DEL NIVEL AURA (GAME LORE) */}
      <AnimatePresence>
        {showRankModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-[#030910] border border-emerald-950 rounded-3xl p-6 shadow-2xl space-y-4 relative"
            >
              <button
                onClick={() => setShowRankModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl ${levelInfo.badgeBg} border ${levelInfo.badgeBorder} flex items-center justify-center ${levelInfo.glowClass}`}
                >
                  <Shield size={24} color={levelInfo.iconColor} />
                </div>
                <div>
                  <h3 className={`font-black text-lg ${levelInfo.colorClass}`}>
                    {levelInfo.name}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    Reputación: {trustScore} / 100 • {xp} XP
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/80 border border-slate-900 rounded-2xl text-xs text-slate-300 leading-relaxed">
                {levelInfo.description}
              </div>

              {/* Escala de los 3 Rangos Aura */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Escala de Rango Aura:
                </div>
                
                {/* Nivel 1 */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-emerald-950/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                    <span className="font-bold text-emerald-300">Nivel Bronce (Verde Boreal)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">0 - 79 pts</span>
                </div>

                {/* Nivel 2 */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-rose-950/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]" />
                    <span className="font-bold text-rose-300">Nivel Plata (Carmesí Boreal)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">80 - 94 pts</span>
                </div>

                {/* Nivel 3 */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-violet-950/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_#c084fc]" />
                    <span className="font-bold text-violet-300">Nivel Oro (Azul & Violeta Cósmico)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">95+ pts</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRankModal(false)}
                className="w-full bg-emerald-950/60 hover:bg-emerald-900/60 text-[#00ffb2] font-black py-3 rounded-xl text-xs border border-emerald-800/40 transition cursor-pointer"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
