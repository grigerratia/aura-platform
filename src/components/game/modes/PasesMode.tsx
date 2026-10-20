'use client';

import { useState } from 'react';
import { useReservations } from '@/store/useReservations';
import { useGameSound } from '@/hooks/useGameSound';
import {
  Ticket,
  Clock,
  ShieldCheck,
  Wallet,
  QrCode,
  MapPin,
  Store,
  Phone,
  ArrowRight,
  AlertCircle,
  Sparkles,
  X,
} from 'lucide-react';
import ThanosCard from '@/components/vfx/ThanosCard';

interface Props {
  onOpenWallet: () => void;
  onExploreRadar: () => void;
}

export default function PasesMode({ onOpenWallet, onExploreRadar }: Props) {
  const { activeReservation, clearActiveReservation } = useReservations();
  const { playTap } = useGameSound();

  const [showPagoMovilModal, setShowPagoMovilModal] = useState(false);

  return (
    <div className="space-y-6 pb-24 px-4 max-w-xl mx-auto select-none">
      
      {/* 1. SECCIÓN DE PASE ACTIVO (TICKET QR DE 3 HORAS CON ESTILO WELCOME PORTAL) */}
      {activeReservation ? (
        <ThanosCard intensity="epic">
          <div className="relative overflow-hidden bg-[#050b16]/85 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.65)] space-y-6">
            {/* Reflejo especular superior fino de 1px */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffb2]/40 to-transparent" />

            {/* Halo ambiental interno */}
            <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-emerald-600/15 via-teal-500/10 to-transparent blur-3xl" />

            {/* Header del Ticket */}
            <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00ffb2] animate-ping" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#00ffb2]">
                  Pase Oficial de Reserva Activo
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                #{activeReservation.pin}
              </span>
            </div>

            {/* Información del Producto y Comercio */}
            <div className="relative z-10 flex items-center gap-3.5">
              <div className="w-16 h-16 rounded-2xl bg-slate-950/80 overflow-hidden relative shrink-0">
                {activeReservation.product_image ? (
                  <img
                    src={activeReservation.product_image}
                    alt={activeReservation.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-600 font-bold">
                    Aura
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <h3 className="font-bold text-slate-100 text-base truncate">
                  {activeReservation.product_name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <Store size={13} />
                  <span className="truncate">{activeReservation.store_name}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-light">
                  <MapPin size={11} className="text-slate-500" />
                  <span>{activeReservation.store_address || 'Cumaná, Sucre'}</span>
                </div>
              </div>
            </div>

            {/* CÓDIGO PIN DESTACADO & QR */}
            <div className="relative overflow-hidden bg-[#030812]/90 backdrop-blur-xl rounded-2xl p-5 text-center space-y-2 shadow-inner">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                Muestra este código PIN al cajero en tienda:
              </span>
              <div className="font-mono text-3xl sm:text-4xl font-black text-[#00ffb2] tracking-widest drop-shadow-[0_0_12px_rgba(0,255,178,0.5)]">
                {activeReservation.pin}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-300 font-light pt-1">
                <Clock size={13} className="text-indigo-400" />
                <span>Reserva garantizada por 3 horas en estante</span>
              </div>
            </div>

            {/* DESGLOSE FINANCIERO */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[#030812]/75 backdrop-blur-md rounded-2xl relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                <span className="text-[10px] text-slate-500 block uppercase font-light">Anticipo Desbloqueo:</span>
                <span className="font-bold text-[#00ffb2] text-sm sm:text-base">
                  ${(activeReservation.unlock_fee_usd || 0).toFixed(2)} USD
                </span>
              </div>

              <div className="p-3.5 bg-[#030812]/75 backdrop-blur-md rounded-2xl relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700/20 to-transparent" />
                <span className="text-[10px] text-slate-500 block uppercase font-light">A Pagar en Caja:</span>
                <span className="font-bold text-slate-100 text-sm sm:text-base">
                  ${(activeReservation.store_pay_balance_usd || activeReservation.price_usd).toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* BOTÓN DOBLE CIERRE: PAGO MÓVIL DIRECTO A LA TIENDA */}
            <button
              type="button"
              onClick={() => {
                playTap();
                setShowPagoMovilModal(true);
              }}
              className="game-sweep w-full bg-gradient-to-r from-indigo-900/90 via-indigo-700/80 to-purple-800 text-slate-100 font-black py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              <span>Asegurar Ya con Pago Móvil Directo (48h o Delivery)</span>
              <ArrowRight size={14} />
            </button>

            {/* Cancelar Reserva */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  if (confirm('¿Deseas liberar esta reserva para otros compradores?')) {
                    clearActiveReservation();
                  }
                }}
                className="text-xs text-rose-400/70 hover:text-rose-300 underline cursor-pointer font-light transition-colors"
              >
                Liberar reserva y recuperar saldo a favor
              </button>
            </div>
          </div>
        </ThanosCard>
      ) : (
        /* ESTADO VACÍO (SIN PASES ACTIVOS CON ESTILO WELCOME PORTAL) */
        <div className="relative overflow-hidden bg-[#050b16]/85 backdrop-blur-xl rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

          <div className="w-16 h-16 rounded-2xl bg-[#030812]/90 text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
            <Ticket size={28} className="drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-slate-100 text-lg sm:text-xl">
              No tienes pases activos hoy
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto font-light leading-relaxed">
              Explora el Radar o las ofertas Relámpago y desbloquea tu primer ticket de 3 horas sin intermediación bancaria.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              playTap();
              onExploreRadar();
            }}
            className="game-sweep bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-[#00ffb2] hover:to-emerald-400 text-slate-100 hover:text-black font-bold px-6 py-3 rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-md"
          >
            Explorar Radar Cumaná
          </button>
        </div>
      )}

      {/* 2. ACCESO DIRECTO A BILLETERA DE PROTECCIÓN */}
      <div className="relative overflow-hidden bg-[#050b16]/85 backdrop-blur-xl rounded-3xl p-5 flex items-center justify-between gap-3 shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#030812]/90 text-[#00ffb2] flex items-center justify-center font-bold shadow-inner">
            <Wallet size={20} />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-sm">Billetera de Protección</div>
            <div className="text-xs text-slate-400 font-light">Candado de Confianza y Saldo a Favor</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playTap();
            onOpenWallet();
          }}
          className="cursor-pointer bg-[#030812]/90 hover:bg-[#071322] text-slate-200 px-4 py-2 rounded-xl text-xs font-medium transition active:scale-95 shadow-sm"
        >
          Consultar
        </button>
      </div>

      {/* MODAL PAGO MÓVIL DIRECTO */}
      {showPagoMovilModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative overflow-hidden w-full max-w-sm bg-[#050b16]/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <Phone size={18} className="text-indigo-400" />
                <span>Pago Móvil Directo al Comercio</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPagoMovilModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-light">
              Transfiere directamente de tu banco al banco de la tienda <strong className="text-slate-100 font-semibold">{activeReservation?.store_name}</strong>. Al enviar el comprobante por WhatsApp, tu reserva se extiende a <strong>48 horas</strong> o se despacha por <strong>delivery</strong>.
            </p>

            <div className="p-3.5 bg-[#030812]/90 rounded-2xl space-y-1 text-xs shadow-inner">
              <div className="text-slate-500 text-[10px] font-light uppercase">Banco Destino:</div>
              <div className="font-medium text-slate-200">0102 Banco de Venezuela</div>
              <div className="text-slate-500 text-[10px] font-light uppercase mt-2">Teléfono / Pago Móvil:</div>
              <div className="font-mono font-bold text-teal-300">0414-798-1234</div>
            </div>

            <button
              type="button"
              onClick={() => setShowPagoMovilModal(false)}
              className="game-sweep w-full bg-gradient-to-r from-indigo-800 to-purple-800 text-slate-100 font-bold py-3 rounded-xl text-xs transition cursor-pointer active:scale-95 shadow-md"
            >
              Listo, Comprendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
