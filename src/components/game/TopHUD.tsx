'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useGameSound } from '@/hooks/useGameSound';
import {
  Shield, Sparkles, Wallet, Volume2, VolumeX,
  MapPin, ChevronDown, Check, Zap, Info, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onOpenWallet: () => void;
  walletCreditUSD?: number;
  selectedCity?: string;
  onSelectCity?: (city: string) => void;
}

export default function TopHUD({
  onOpenWallet,
  walletCreditUSD = 0.0,
  selectedCity = 'Cumaná',
  onSelectCity,
}: Props) {
  const { isMuted, toggleMute, playTap } = useGameSound();
  const [trustScore, setTrustScore] = useState(100);
  const [xp, setXp] = useState(650);
  const [maxXp, setMaxXp] = useState(1000);
  const [showRankModal, setShowRankModal] = useState(false);
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [balanceGlow, setBalanceGlow] = useState(false);

  // Cargar puntuación real del usuario si está logueado
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('trust_score, wallet_credit_usd')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.trust_score !== undefined) {
          setTrustScore(profile.trust_score);
          // XP basado en el puntaje
          setXp(Math.min(1000, profile.trust_score * 10));
        }
      }
    });
  }, []);

  // Efecto de brillo al cambiar saldo
  useEffect(() => {
    setBalanceGlow(true);
    const t = setTimeout(() => setBalanceGlow(false), 1200);
    return () => clearTimeout(t);
  }, [walletCreditUSD]);

  // Cálculo del Nivel de Aurora Boreal (Verde -> Rojo -> Azul/Violeta)
  const getAuroraLevel = () => {
    if (trustScore >= 95) {
      return {
        name: 'Aurora Cósmica',
        tier: 'Nivel 3',
        colorClass: 'text-violet-400',
        barClass: 'bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500',
        glowClass: 'aurora-glow-cosmic',
        badgeBorder: 'border-violet-500/50',
        badgeBg: 'bg-violet-950/40',
        iconColor: '#c084fc',
        description: 'Máximo prestigio boreal: Retiros prioritarios y 0% de recargo.',
      };
    }
    if (trustScore >= 80) {
      return {
        name: 'Aurora Carmesí',
        tier: 'Nivel 2',
        colorClass: 'text-rose-400',
        barClass: 'bg-gradient-to-r from-amber-500 to-rose-500',
        glowClass: 'aurora-glow-red',
        badgeBorder: 'border-rose-500/50',
        badgeBg: 'bg-rose-950/40',
        iconColor: '#fb7185',
        description: 'Comprador verificado con alta asistencia en comercios.',
      };
    }
    return {
      name: 'Aurora Verde',
      tier: 'Nivel 1',
      colorClass: 'text-emerald-400',
      barClass: 'bg-gradient-to-r from-teal-500 to-emerald-400',
      glowClass: 'aurora-glow-green',
      badgeBorder: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-950/40',
      iconColor: '#00ffb2',
      description: 'El nivel más común: Acceso al semáforo de reservas de 3 horas.',
    };
  };

  const levelInfo = getAuroraLevel();
  const xpPercent = Math.min(100, Math.round((xp / maxXp) * 100));

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 bg-[#020508]/85 backdrop-blur-xl border-b border-emerald-950/60 select-none">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          
          {/* 1. IZQUIERDA: INSIGNIA DE NIVEL AURORA + BARRA XP */}
          <div
            onClick={() => {
              playTap();
              setShowRankModal(true);
            }}
            className="cursor-pointer flex items-center gap-2 group transition active:scale-95"
            title="Ver tu Nivel de Aurora y Beneficios"
          >
            <div
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${levelInfo.badgeBg} border ${levelInfo.badgeBorder} flex items-center justify-center transition-all group-hover:scale-105 ${levelInfo.glowClass}`}
            >
              <Shield size={16} color={levelInfo.iconColor} className="shrink-0" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
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

          {/* 2. CENTRO: SALDO BILLETERA AURA (TIPOGRAFÍA FLOTANTE LIMPIA, SIN PÍLDORAS) */}
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
                    : 'text-white'
                }`}
              >
                ${walletCreditUSD.toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-400/80 font-bold">USD</span>
            </div>
          </button>

          {/* 3. DERECHA: SELECTOR CIUDAD + BOTÓN SONIDO (LUCIDE ICONS) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Selector de Ciudad */}
            <div className="relative">
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

          </div>

        </div>
      </header>

      {/* MODAL EXPLICATIVO DEL NIVEL AURORA (GAME LORE) */}
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

              {/* Escala de las 3 Auroras Boreales */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Escala de Rango Boreal:
                </div>
                
                {/* Nivel 1 */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-emerald-950/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                    <span className="font-bold text-emerald-300">Aurora Verde (Común)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">0 - 79 pts</span>
                </div>

                {/* Nivel 2 */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-rose-950/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]" />
                    <span className="font-bold text-rose-300">Aurora Carmesí (Avanzado)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">80 - 94 pts</span>
                </div>

                {/* Nivel 3 */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-violet-950/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_#c084fc]" />
                    <span className="font-bold text-violet-300">Aurora Cósmica (Élite)</span>
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

