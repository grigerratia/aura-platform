'use client';

import { useState, useEffect } from 'react';
import { useReservations } from '@/store/useReservations';
import { getCustomerWhatsAppLink } from '@/lib/reservations';
import { X, Clock, MapPin, CheckCircle, MessageCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function ReservationTicketModal() {
  const { activeReservation, isOpenTicketModal, setOpenTicketModal, clearActiveReservation } = useReservations();
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    hours: 3,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    if (!activeReservation) return;

    const updateTimer = () => {
      const difference = new Date(activeReservation.expires_at).getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeReservation]);

  if (!isOpenTicketModal || !activeReservation) return null;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const waLink = getCustomerWhatsAppLink(activeReservation);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Cabecera del Ticket */}
        <div className="relative bg-gradient-to-r from-indigo-900 via-purple-900 to-teal-800 p-6 text-white text-center overflow-hidden">
          <button
            onClick={() => setOpenTicketModal(false)}
            className="cursor-pointer absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-white"
          >
            <X size={18} />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-400/20 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2 border border-teal-400/30">
            <Sparkles size={14} /> Ticket de Reserva Garantizada
          </div>

          <h2 className="text-2xl font-black tracking-tight">¡Apartado con Éxito!</h2>
          <p className="text-xs text-white/80 mt-1">Precio congelado por 3 horas para retirar en tienda</p>
        </div>

        {/* Temporizador Regresivo */}
        <div className="bg-amber-500/10 border-y border-amber-500/20 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase">
            <Clock size={16} className="text-amber-600 animate-pulse" />
            {timeLeft.isExpired ? 'Reserva Expirada' : 'Tiempo para Retirar:'}
          </div>
          <div className="font-mono text-lg font-black text-amber-900 tracking-wider">
            {timeLeft.isExpired ? '00:00:00' : `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`}
          </div>
        </div>

        {/* Cuerpo del Ticket */}
        <div className="p-6 space-y-5">
          {/* PIN DE RETIRO EN CAJA */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 text-center shadow-inner relative">
            <span className="text-[10px] uppercase font-bold tracking-widest text-teal-400 block mb-1">
              Código PIN para Retirar en Caja
            </span>
            <div className="text-4xl font-black font-mono tracking-widest text-white">
              #{activeReservation.pin}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Muestra este código al vendedor cuando llegues al local
            </p>
          </div>

          {/* DETALLES DEL PRODUCTO */}
          <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {activeReservation.product_image ? (
              <img
                src={activeReservation.product_image}
                alt={activeReservation.product_name}
                className="w-16 h-16 object-contain rounded-xl bg-white p-1 border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0">
                AURA
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">
                {activeReservation.product_name}
              </h3>
              {activeReservation.selected_size && (
                <span className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                  Talla / Variante: {activeReservation.selected_size}
                </span>
              )}
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-base font-black text-slate-900">
                  ${activeReservation.price_usd.toFixed(2)} USD
                </span>
                <span className="text-xs font-semibold text-emerald-600">
                  Bs. {activeReservation.price_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* INFORMACIÓN DE LA TIENDA Y DIRECCIÓN */}
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2 text-slate-600">
              <MapPin size={16} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-bold text-sm">{activeReservation.store_name}</strong>
                <span>{activeReservation.store_address || 'Cumaná, Estado Sucre'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <CheckCircle size={16} className="text-teal-600 shrink-0" />
              <span>Pagas directamente en el local: <strong>Efectivo, Punto, Pago Móvil o Cashea</strong>.</span>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="space-y-2.5 pt-2">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 text-sm text-center"
            >
              <MessageCircle size={18} />
              Avisar a la Tienda por WhatsApp
            </a>

            <div className="flex gap-2">
              <button
                onClick={() => setOpenTicketModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-semibold text-xs transition"
              >
                Cerrar y seguir explorando
              </button>
              <button
                onClick={() => {
                  if (confirm('¿Deseas cancelar esta reserva?')) {
                    clearActiveReservation();
                  }
                }}
                className="px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl font-semibold text-xs transition"
              >
                Cancelar Reserva
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

