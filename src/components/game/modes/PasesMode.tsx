'use client';

import { useState } from 'react';
import { useReservations } from '@/store/useReservations';
import { useGameSound } from '@/hooks/useGameSound';
import {
  Ticket, Clock, ShieldCheck, Wallet, QrCode,
  MapPin, Check, Store, Phone, ArrowRight, AlertCircle, Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  onOpenWallet: () => void;
  onExploreRadar: () => void;
}

export default function PasesMode({ onOpenWallet, onExploreRadar }: Props) {
  const { activeReservation, clearActiveReservation } = useReservations();
  const { playTap } = useGameSound();

  const [showPagoMovilModal, setShowPagoMovilModal] = useState(false);

  return (
    <div className="space-y-5 pb-20 px-4 max-w-xl mx-auto">
      
      {/* 1. SECCIÓN DE PASE ACTIVO (TICKET QR DE 3 HORAS) */}
      {activeReservation ? (
        <div className="relative bg-gradient-to-br from-[#041210] via-[#020508] to-[#020508] border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 select-none">
          
          {/* Header del Ticket */}
          <div className="flex items-center justify-between border-b border-emerald-950/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00ffb2] animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-[#00ffb2]">
                Pase Oficial de Reserva Activo
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              #{activeReservation.pin}
            </span>
          </div>

          {/* Información del Producto y Comercio */}
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative shrink-0">
              {activeReservation.product_image ? (
                <img
                  src={activeReservation.product_image}
                  alt={activeReservation.product_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">Aura</div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-black text-white text-base truncate">
                {activeReservation.product_name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <Store size={13} />
                <span className="truncate">{activeReservation.store_name}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin size={11} className="text-slate-500" />
                <span>{activeReservation.store_address || 'Cumaná, Sucre'}</span>
              </div>
            </div>
          </div>

          {/* CÓDIGO PIN DESTACADO & QR */}
          <div className="bg-[#020508] border border-emerald-950 rounded-2xl p-4 text-center space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Muestra este código PIN al cajero en tienda:
            </span>
            <div className="font-mono text-3xl sm:text-4xl font-black text-[#00ffb2] tracking-widest drop-shadow-[0_0_12px_rgba(0,255,178,0.5)]">
              {activeReservation.pin}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-300">
              <Clock size={13} className="text-indigo-400" />
              <span>Reserva garantizada por 3 horas en estante</span>
            </div>
          </div>

          {/* DESGLOSE FINANCIERO */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 block">ANTICIPO DESBLOQUEO:</span>
              <span className="font-bold text-[#00ffb2] text-sm">
                ${(activeReservation.unlock_fee_usd || 0).toFixed(2)} USD
              </span>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 block">A PAGAR EN CAJA:</span>
              <span className="font-bold text-white text-sm">
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
            className="w-full bg-gradient-to-r from-indigo-900/90 to-purple-900 text-indigo-200 font-bold py-3 px-4 rounded-xl text-xs transition border border-indigo-500/40 hover:border-indigo-400 flex items-center justify-center gap-2 cursor-pointer"
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
              className="text-xs text-rose-400/80 hover:text-rose-300 underline cursor-pointer"
            >
              Liberar reserva y recuperar saldo a favor
            </button>
          </div>

        </div>
      ) : (
        /* ESTADO VACÍO (SIN PASES ACTIVOS) */
        <div className="bg-[#030910] border border-slate-900 rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto">
            <Ticket size={28} />
          </div>

          <div className="space-y-1">
            <h3 className="font-black text-white text-lg">No tienes pases activos hoy</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Explora el Radar o las ofertas Relámpago y desbloquea tu primer ticket de 3 horas sin intermediación bancaria.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              playTap();
              onExploreRadar();
            }}
            className="bg-emerald-950/60 hover:bg-emerald-900/60 text-[#00ffb2] font-black px-6 py-3 rounded-xl text-xs border border-emerald-500/40 transition cursor-pointer"
          >
            Explorar Radar Cumaná
          </button>
        </div>
      )}

      {/* 2. ACCESO DIRECTO A BILLETERA DE PROTECCIÓN */}
      <div className="bg-[#030910] border border-emerald-950/60 rounded-3xl p-5 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-[#00ffb2] flex items-center justify-center font-bold">
            <Wallet size={20} />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Billetera de Protección</div>
            <div className="text-xs text-slate-400">Candado de Confianza y Saldo a Favor</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playTap();
            onOpenWallet();
          }}
          className="cursor-pointer bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold transition"
        >
          Consultar
        </button>
      </div>

      {/* MODAL PAGO MÓVIL DIRECTO */}
      {showPagoMovilModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#030910] border border-indigo-950 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-black text-white text-base flex items-center gap-2">
              <Phone size={18} className="text-indigo-400" />
              <span>Pago Móvil Directo al Comercio</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Transfiere directamente de tu banco al banco de la tienda <strong className="text-white">{activeReservation?.store_name}</strong>. Al enviar el comprobante por WhatsApp, tu reserva se extiende a <strong>48 horas</strong> o se despacha por <strong>delivery</strong>.
            </p>

            <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-1 text-xs">
              <div className="text-slate-400 text-[10px]">BANCO DESTINO:</div>
              <div className="font-bold text-white">0102 Banco de Venezuela</div>
              <div className="text-slate-400 text-[10px] mt-2">TELÉFONO / PAGO MÓVIL:</div>
              <div className="font-mono font-bold text-teal-400">0414-798-1234</div>
            </div>

            <button
              type="button"
              onClick={() => setShowPagoMovilModal(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl text-xs transition cursor-pointer"
            >
              Listo, Comprendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

