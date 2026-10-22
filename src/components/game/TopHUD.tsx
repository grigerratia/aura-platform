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
  ShieldCheck, Menu, DollarSign, ChevronRight
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
    store_id?: string;
  } | null>(null);

  const [hasStore, setHasStore] = useState(false);
  const [trustScore, setTrustScore] = useState(100);
  const [xp, setXp] = useState(650);
  const maxXp = 1000;

  const [showRankModal, setShowRankModal] = useState(false);
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [balanceGlow, setBalanceGlow] = useState(false);

  // Cargar usuario autenticado, tienda y escuchar cambios
  useEffect(() => {
    let isMounted = true;

    const loadUserData = async (userId: string) => {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, role, id_doc, trust_score, wallet_credit_usd, store_id')
          .eq('id', userId)
          .maybeSingle();

        if (!isMounted) return;

        if (profileData) {
          setProfile(profileData);
          if (profileData.trust_score !== undefined) {
            setTrustScore(profileData.trust_score);
            setXp(Math.min(1000, profileData.trust_score * 10));
          }
        }

        // Verificación de Tienda (por store_id / role owner, o en tabla stores)
        if (profileData?.store_id || profileData?.role === 'owner') {
          setHasStore(true);
        } else {
          const { data: storeData } = await supabase
            .from('stores')
            .select('id')
            .eq('owner_id', userId)
            .limit(1)
            .maybeSingle();
          if (!isMounted) return;
          setHasStore(Boolean(storeData));
        }
      } catch (err) {
        console.error('Error cargando perfil en TopHUD:', err);
      }
    };

    const initAuth = async () => {
      try {
        // Usar getSession() primero (instantáneo, sin lock, lee almacenamiento local)
        const { data: { session } } = await supabase.auth.getSession();
        let currentUser = session?.user || null;

        if (!currentUser) {
          const { data: userData } = await supabase.auth.getUser();
          currentUser = userData?.user || null;
        }

        if (!isMounted) return;
        setUser(currentUser);

        if (currentUser) {
          await loadUserData(currentUser.id);
        } else {
          setProfile(null);
          setHasStore(false);
        }
      } catch (err) {
        console.error('Error inicializando auth en TopHUD:', err);
      }
    };

    initAuth();

    // Escuchar cambios de autenticación sin llamadas bloqueantes en el callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setProfile(null);
        setHasStore(false);
      } else if (session?.user) {
        setUser(session.user);
        loadUserData(session.user.id);
      }
    });

    return () => {
      isMounted = false;
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
    setShowUserDropdown(false);
    setUser(null);
    setProfile(null);
    setHasStore(false);

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }

    router.push('/');
    router.refresh();
  };

  // Cálculo del Nivel de Aura (Bronce -> Plata -> Oro)
  const getAuraLevel = () => {
    if (trustScore >= 95) {
      return {
        name: 'Nivel Oro',
        tier: 'Nivel 3',
        colorClass: 'text-amber-400',
        barClass: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-300',
        glowClass: 'aurora-glow-cosmic',
        badgeBorder: 'border-amber-500/40',
        badgeBg: 'bg-amber-950/30',
        iconColor: '#fbbf24',
        dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]',
        description: 'Nivel Oro VIP: Máximo prestigio en Aura. Retiros prioritarios y 0% de recargo.',
      };
    }
    if (trustScore >= 80) {
      return {
        name: 'Nivel Plata',
        tier: 'Nivel 2',
        colorClass: 'text-slate-300',
        barClass: 'bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400',
        glowClass: 'aurora-glow-red',
        badgeBorder: 'border-slate-400/40',
        badgeBg: 'bg-slate-900/40',
        iconColor: '#cbd5e1',
        dotClass: 'bg-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.9)]',
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
      dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(0,255,178,0.9)]',
      description: 'Nivel Bronce: Nivel inicial estándar. Acceso completo a reservas de 3 horas.',
    };
  };

  const levelInfo = getAuraLevel();
  const xpPercent = Math.min(100, Math.round((xp / maxXp) * 100));
  const displayName = profile?.full_name?.split(' ')[0]
    || user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || '';

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 bg-[#020508]/85 backdrop-blur-xl border-b border-emerald-950/60 select-none">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          
          {/* ============================================================== */}
          {/* 1. ZONA IZQUIERDA: MARCA + CIUDAD UNIFICADAS                   */}
          {/* ============================================================== */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Logo AURA funcional (siempre Link a / y resetea portal si aplica) */}
            <Link
              href="/"
              onClick={(e) => {
                playTap();
                if (onGoHome) {
                  e.preventDefault();
                  onGoHome();
                }
              }}
              className="cursor-pointer flex items-center gap-2 group shrink-0"
              title="AURA - Inicio"
            >
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 via-emerald-400 to-[#00ffb2] flex items-center justify-center text-black font-black text-sm shadow-[0_0_14px_rgba(0,255,178,0.35)] group-hover:shadow-[0_0_20px_rgba(0,255,178,0.6)] group-hover:scale-105 transition-all">
                A
              </div>
              <span className="text-sm sm:text-base font-black tracking-[0.2em] bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent group-hover:to-[#00ffb2] transition-colors leading-none">
                AURA
              </span>
            </Link>

            {/* Separador vertical sutil */}
            <div className="h-4 w-[1px] bg-slate-800/80 shrink-0" />

            {/* Selector minimalista de ciudad (sin bordes pesados) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setShowCityMenu(!showCityMenu);
                }}
                className="cursor-pointer flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white py-1 px-1 rounded-lg transition-colors group"
                title="Seleccionar ciudad"
              >
                <MapPin size={13} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="truncate max-w-[80px] sm:max-w-none">{selectedCity}</span>
                <ChevronDown
                  size={11}
                  className={`text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${
                    showCityMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {showCityMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowCityMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-40 bg-[#040913]/95 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl py-1.5 z-50 overflow-hidden"
                    >
                      {['Cumaná', 'Carúpano', 'Puerto La Cruz'].map((city) => (
                        <button
                          key={city}
                          onClick={() => {
                            playTap();
                            onSelectCity?.(city);
                            setShowCityMenu(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                            selectedCity === city
                              ? 'text-[#00ffb2] bg-emerald-950/40'
                              : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
                          }`}
                        >
                          <span>{city}</span>
                          {selectedCity === city && <Check size={12} />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 2. ZONA CENTRAL: 100% VACÍA Y DESPEJADA                        */}
          {/* ============================================================== */}

          {/* ============================================================== */}
          {/* 3. ZONA DERECHA: SOLO 2 CÁPSULAS ELEGANTES                     */}
          {/* ============================================================== */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* Ícono de Comercio (Condicional - Solo Dueños de Comercio): Solo ícono limpio sin pastilla */}
            {user && hasStore && (
              <Link
                href="/negocios/dashboard"
                onClick={playTap}
                className="cursor-pointer p-1.5 text-slate-400 hover:text-[#00ffb2] transition-colors hover:scale-110 active:scale-95 shrink-0"
                title="Mi Comercio"
              >
                <StoreIcon size={18} />
              </Link>
            )}

            {/* CÁPSULA 2 (Menú Unificado de Usuario) */}
            <div className="relative">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    setShowUserDropdown(!showUserDropdown);
                  }}
                  className="cursor-pointer flex items-center gap-2 bg-[#050b16]/90 hover:bg-[#081224] border border-slate-800/80 hover:border-slate-700/80 backdrop-blur-xl px-2.5 sm:px-3 py-1.5 rounded-xl transition-all active:scale-95 group shadow-sm"
                  title="Menú de Usuario"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 shadow-inner">
                    {displayName.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white max-w-[80px] sm:max-w-[120px] truncate">
                    {displayName || 'Usuario'}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${levelInfo.dotClass} shrink-0`}
                    title={levelInfo.name}
                  />
                  <Menu size={14} className="text-slate-400 group-hover:text-[#00ffb2] transition-colors shrink-0 ml-0.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/login"
                    onClick={playTap}
                    className="cursor-pointer text-xs font-bold text-slate-300 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-slate-900/60 transition"
                  >
                    Entrar
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      setShowUserDropdown(!showUserDropdown);
                    }}
                    className="cursor-pointer p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white bg-[#050b16]/90 border border-slate-800/80 hover:border-slate-700 backdrop-blur-xl transition active:scale-95"
                    title="Menú de Navegación"
                  >
                    <Menu size={15} />
                  </button>
                </div>
              )}

              {/* DROPDOWN CINEMATOGRÁFICO */}
              <AnimatePresence>
                {showUserDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserDropdown(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-[320px] sm:max-w-[340px] bg-[#040913]/95 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_25px_rgba(0,255,178,0.06)] p-3.5 space-y-3 z-50 overflow-hidden"
                    >
                      {/* Cabecera / Info del Usuario o Bienvenida */}
                      {user ? (
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/60 border border-slate-900">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black font-black flex items-center justify-center text-sm shadow-inner shrink-0">
                            {displayName.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-white text-xs truncate">
                                {profile?.full_name || user.email}
                              </h4>
                              <span className={`w-2 h-2 rounded-full ${levelInfo.dotClass} shrink-0`} />
                            </div>
                            <span className="text-[10px] text-emerald-400 font-semibold block truncate">
                              {hasStore
                                ? 'Comerciante Autorizado'
                                : profile?.role === 'admin'
                                ? 'Administrador Master'
                                : 'Cliente Verificado Aura'}
                            </span>
                            {profile?.id_doc && (
                              <span className="text-[9px] text-slate-500 block">
                                C.I. {profile.id_doc}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 text-center rounded-xl bg-slate-950/60 border border-slate-900 space-y-2">
                          <div className="w-9 h-9 rounded-xl bg-emerald-950/50 border border-emerald-800/40 text-[#00ffb2] flex items-center justify-center mx-auto">
                            <User size={18} />
                          </div>
                          <h4 className="font-bold text-white text-xs">Bienvenido a Aura</h4>
                          <p className="text-[11px] text-slate-400">
                            Inicia sesión para apartar productos y activar tu Billetera y Reputación.
                          </p>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <Link
                              href="/login"
                              onClick={() => {
                                playTap();
                                setShowUserDropdown(false);
                              }}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs text-center border border-slate-800 transition"
                            >
                              Entrar
                            </Link>
                            <Link
                              href="/registro"
                              onClick={() => {
                                playTap();
                                setShowUserDropdown(false);
                              }}
                              className="w-full bg-[#00ffb2] hover:bg-emerald-400 text-black font-black py-2 rounded-xl text-xs text-center transition"
                            >
                              Registro
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* a) TARJETA DE NIVEL DEL USUARIO (SOLO SI LOGUEADO) */}
                      {user && (
                        <div
                          onClick={() => {
                            playTap();
                            setShowUserDropdown(false);
                            setShowRankModal(true);
                          }}
                          className={`p-3 rounded-xl ${levelInfo.badgeBg} border ${levelInfo.badgeBorder} cursor-pointer hover:border-slate-700/80 transition-all group`}
                          title="Ver detalles de tu Nivel y Beneficios"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`relative w-8 h-8 rounded-lg ${levelInfo.badgeBg} border ${levelInfo.badgeBorder} flex items-center justify-center ${levelInfo.glowClass} shrink-0`}>
                                <Shield size={16} color={levelInfo.iconColor} />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-black tracking-tight ${levelInfo.colorClass}`}>
                                    {levelInfo.name}
                                  </span>
                                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                                    {levelInfo.tier}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Reputación: <strong className="text-[#00ffb2]">{trustScore} / 100</strong>
                                </span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                          </div>

                          {/* Barra de Progreso XP brillante */}
                          <div className="mt-2.5">
                            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                              <div
                                className={`h-full ${levelInfo.barClass} transition-all duration-500 shadow-sm`}
                                style={{ width: `${xpPercent}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold mt-1">
                              <span>Progreso de Rango</span>
                              <span>{xpPercent}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* b) SALDO DE BILLETERA AURA (SOLO SI LOGUEADO) */}
                      {user && (
                        <button
                          type="button"
                          onClick={() => {
                            playTap();
                            setShowUserDropdown(false);
                            onOpenWallet();
                          }}
                          className="w-full cursor-pointer flex items-center justify-between p-3 rounded-xl bg-slate-950/70 hover:bg-emerald-950/30 border border-slate-800/70 hover:border-emerald-800/50 transition-all group text-left"
                          title="Abrir Billetera de Protección Aura"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                              <Wallet size={16} />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                                Saldo Billetera Aura
                              </span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm font-black text-slate-100 group-hover:text-[#00ffb2] transition-colors">
                                  ${walletCreditUSD.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-emerald-400/90 font-bold">USD</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      )}

                      {/* c) INDICADOR INFORMATIVO DE LA TASA BCV DEL DÍA */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 text-xs">
                        <div className="flex items-center gap-2 text-slate-400 font-medium">
                          <DollarSign size={14} className="text-emerald-400 shrink-0" />
                          <span>Tasa Oficial BCV:</span>
                        </div>
                        <span className="font-black text-emerald-400">
                          {typeof tasa === 'number' ? Number(tasa).toFixed(2) : tasa} Bs.
                        </span>
                      </div>

                      {/* d) ENLACES DE CUENTA Y PREFERENCIAS */}
                      <div className="space-y-1 pt-1 border-t border-slate-800/70">
                        {user && (
                          <Link
                            href="/perfil"
                            onClick={() => {
                              playTap();
                              setShowUserDropdown(false);
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/60 transition"
                          >
                            <User size={14} className="text-emerald-400" />
                            <span>Mi Perfil & Preferencias</span>
                          </Link>
                        )}

                        {/* Sonido */}
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-slate-300">
                          <div className="flex items-center gap-2 font-semibold">
                            {isMuted ? (
                              <VolumeX size={14} className="text-slate-500" />
                            ) : (
                              <Volume2 size={14} className="text-[#00ffb2]" />
                            )}
                            <span>Efectos de Sonido</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              playTap();
                              toggleMute();
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                              isMuted
                                ? 'bg-slate-900 text-slate-400 hover:text-white'
                                : 'bg-emerald-950/60 text-[#00ffb2] border border-emerald-800/40'
                            }`}
                          >
                            {isMuted ? 'Mute' : 'Activo'}
                          </button>
                        </div>

                        {/* Enlace discreto "Registrar mi negocio" SOLO si NO tiene tienda */}
                        {!hasStore && (
                          <Link
                            href="/negocios"
                            onClick={() => {
                              playTap();
                              setShowUserDropdown(false);
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 transition"
                          >
                            <StoreIcon size={14} className="text-slate-500" />
                            <span>Registrar mi negocio</span>
                          </Link>
                        )}

                        {/* Panel Master si es admin */}
                        {profile?.role === 'admin' && (
                          <Link
                            href="/master"
                            onClick={() => {
                              playTap();
                              setShowUserDropdown(false);
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-violet-300 hover:text-white hover:bg-violet-950/40 transition"
                          >
                            <ShieldCheck size={14} className="text-violet-400" />
                            <span>Panel Master Admin</span>
                          </Link>
                        )}
                      </div>

                      {/* Botón de Cerrar Sesión */}
                      {user && (
                        <div className="pt-1.5 border-t border-slate-800/70">
                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full flex items-center justify-center gap-2 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 text-rose-400 hover:text-rose-300 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                          >
                            <LogOut size={13} />
                            <span>Cerrar Sesión</span>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>
      </header>

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
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shadow-[0_0_8px_#cbd5e1]" />
                    <span className="font-bold text-slate-300">Nivel Plata (Plata Boreal)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">80 - 94 pts</span>
                </div>

                {/* Nivel 3 */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-amber-950/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                    <span className="font-bold text-amber-300">Nivel Oro (Dorado Cósmico)</span>
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
