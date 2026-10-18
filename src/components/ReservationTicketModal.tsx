'use client';

import { useState, useEffect } from 'react';
import { useReservations } from '@/store/useReservations';
import { getCustomerWhatsAppLink, attachPagoMovilToReservation } from '@/lib/reservations';
import { PaymentOption } from '@/types';
import { 
  X, Clock, MapPin, CheckCircle, MessageCircle, 
  ShieldCheck, Sparkles, Smartphone, Truck, Calendar,
  CreditCard, Copy, Check, ArrowRight, AlertCircle, ChevronDown
} from 'lucide-react';

export default function ReservationTicketModal() {
  const { activeReservation, isOpenTicketModal, setOpenTicketModal, clearActiveReservation, setActiveReservation } = useReservations();
  
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    hours: 3,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  // Estado para el acordeón de Doble Cierre (Pago Móvil Directo)
  const [showPagoMovil, setShowPagoMovil] = useState(false);
  const [selectedOption, setSelectedOption] = useState<PaymentOption>('reserva_48h');
  const [refInput, setRefInput] = useState('');
  const [bankInput, setBankInput] = useState('Banesco');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [copiedBank, setCopiedBank] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    if (!activeReservation) return;

    const updateTimer = () => {
      const difference = new Date(activeReservation.expires_at).getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)));
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

  // Teléfono de la tienda para Pago Móvil
  const storePhone = (activeReservation.store_whatsapp || '04121234567').replace(/[^0-9]/g, '');
  const cleanPhone = storePhone.startsWith('58') ? '0' + storePhone.slice(2) : storePhone;

  // Monto a transferir según opción seleccionada
  const totalBs = activeReservation.price_ves;
  const initialDepositBs = Number((totalBs * 0.30).toFixed(2));
  const amountToPayBs = selectedOption === 'apartado_15d' ? initialDepositBs : totalBs;
  const amountToPayUSD = selectedOption === 'apartado_15d' ? (activeReservation.price_usd * 0.30) : activeReservation.price_usd;

  const handleCopyPaymentData = () => {
    const text = `Pago Móvil: Banesco (0134) | Teléfono: ${cleanPhone} | RIF: J-40812345-0 | Monto: Bs. ${amountToPayBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
    navigator.clipboard.writeText(text);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  const handleConfirmPagoMovil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refInput.trim()) {
      alert('Por favor ingresa los dígitos de la referencia de tu Pago Móvil.');
      return;
    }
    if (selectedOption === 'delivery' && !deliveryAddress.trim()) {
      alert('Por favor ingresa la dirección de entrega en Cumaná.');
      return;
    }

    setSubmittingPayment(true);
    const updated: typeof activeReservation = {
      ...activeReservation,
      payment_method: 'pago_movil',
      payment_type: selectedOption,
      payment_reference: refInput.trim(),
      bank_origin: bankInput,
      delivery_address: deliveryAddress.trim() || undefined,
      initial_deposit: selectedOption === 'apartado_15d' ? amountToPayUSD : undefined,
    };

    await attachPagoMovilToReservation({
      reservationId: activeReservation.id,
      pin: activeReservation.pin,
      storeId: activeReservation.store_id,
      paymentType: selectedOption,
      paymentReference: refInput.trim(),
      bankOrigin: bankInput,
      deliveryAddress: deliveryAddress.trim() || undefined
    });

    setActiveReservation(updated);
    setSubmittingPayment(false);

    // Abrir WhatsApp con el comprobante de inmediato
    const newWaLink = getCustomerWhatsAppLink(updated);
    window.open(newWaLink, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-4 animate-in zoom-in-95 duration-200">
        
        {/* Cabecera del Ticket */}
        <div className="relative bg-gradient-to-r from-indigo-950 via-purple-900 to-teal-900 p-5 sm:p-6 text-white text-center">
          <button
            onClick={() => setOpenTicketModal(false)}
            className="cursor-pointer absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-white"
          >
            <X size={18} />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-400/20 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2 border border-teal-400/30">
            <Sparkles size={14} /> Ticket de Reserva Aura
          </div>

          <h2 className="text-2xl font-black tracking-tight">¡Producto Apartado!</h2>
          <p className="text-xs text-white/80 mt-1">Precio congelado a tasa oficial de Cumaná</p>
        </div>

        {/* Temporizador Regresivo */}
        <div className="bg-amber-500/10 border-y border-amber-500/20 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase">
            <Clock size={16} className="text-amber-600 animate-pulse" />
            {timeLeft.isExpired ? 'Reserva Expirada' : 'Tiempo de Reserva:'}
          </div>
          <div className="font-mono text-lg font-black text-amber-950 tracking-wider">
            {timeLeft.isExpired ? '00:00:00' : `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`}
          </div>
        </div>

        {/* Cuerpo del Ticket */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* PIN DE RETIRO EN CAJA */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 text-center shadow-inner relative">
            <span className="text-[10px] uppercase font-bold tracking-widest text-teal-400 block mb-1">
              Código PIN para Retirar en Tienda Física
            </span>
            <div className="text-4xl font-black font-mono tracking-widest text-white">
              #{activeReservation.pin}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Muestra este código al vendedor cuando llegues a caja
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
                  Talla / Medida: {activeReservation.selected_size}
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
          </div>

          {/* 🌟 DOBLE CIERRE POST-VERIFICACIÓN: DOS VÍAS CLARAS */}
          <div className="space-y-3 pt-1">
            
            {/* VÍA 1: RETIRO EN TIENDA EN 3 HORAS */}
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <CheckCircle size={15} className="text-teal-600" />
                Vía 1: Retiro Presencial en Tienda (Gratis)
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed pl-6">
                Tienes 3 horas para llegar al local y pagar en caja (Efectivo, Punto, Pago Móvil o Cashea).
              </p>
            </div>

            {/* VÍA 2: BOTÓN [ASEGURAR YA CON PAGO MÓVIL DIRECTO A LA TIENDA] */}
            {activeReservation.payment_reference ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <CheckCircle size={16} className="text-emerald-600" />
                  <span>Pago Móvil Directo Registrado</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-100 text-[11px] text-slate-700 space-y-1">
                  <div><strong>Referencia:</strong> #{activeReservation.payment_reference}</div>
                  <div><strong>Modalidad:</strong> {activeReservation.payment_type === 'reserva_48h' ? 'Reserva Extendida 48h' : activeReservation.payment_type === 'delivery' ? 'Delivery Inmediato' : 'Plan de Apartado 15 Días'}</div>
                  {activeReservation.delivery_address && <div><strong>Entrega:</strong> {activeReservation.delivery_address}</div>}
                </div>
                <p className="text-[10px] text-emerald-800">
                  La tienda está verificando tu transferencia. Te contactarán por WhatsApp en breves minutos.
                </p>
              </div>
            ) : (
              <div className="border border-indigo-200 rounded-2xl overflow-hidden bg-gradient-to-b from-indigo-50/50 to-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowPagoMovil(!showPagoMovil)}
                  className="w-full p-3.5 text-left flex items-center justify-between gap-2 cursor-pointer hover:bg-indigo-50/80 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Smartphone size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-indigo-950">
                        Vía 2: Asegurar Ya con Pago Móvil a la Tienda
                      </div>
                      <div className="text-[11px] text-indigo-700 font-medium">
                        Extiende a 48h, pide delivery o aparta con 30%
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={18} className={`text-indigo-600 transition-transform ${showPagoMovil ? 'rotate-180' : ''}`} />
                </button>

                {showPagoMovil && (
                  <div className="p-4 border-t border-indigo-100 space-y-4 text-xs animate-in fade-in duration-150">
                    
                    {/* Selector de Modalidad */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Elige cómo deseas asegurar tu compra:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOption('reserva_48h')}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                            selectedOption === 'reserva_48h'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold text-[11px] flex items-center gap-1">
                            <Clock size={12} /> Extender a 48h
                          </div>
                          <div className={`text-[10px] mt-0.5 ${selectedOption === 'reserva_48h' ? 'text-indigo-100' : 'text-slate-500'}`}>
                            Paga 100% y retira con calma
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedOption('delivery')}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                            selectedOption === 'delivery'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold text-[11px] flex items-center gap-1">
                            <Truck size={12} /> Delivery
                          </div>
                          <div className={`text-[10px] mt-0.5 ${selectedOption === 'delivery' ? 'text-indigo-100' : 'text-slate-500'}`}>
                            Envío directo en Cumaná
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedOption('apartado_15d')}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                            selectedOption === 'apartado_15d'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold text-[11px] flex items-center gap-1">
                            <Calendar size={12} /> Apartado 15 Días
                          </div>
                          <div className={`text-[10px] mt-0.5 ${selectedOption === 'apartado_15d' ? 'text-indigo-100' : 'text-slate-500'}`}>
                            Inicial 30% (Bs. {initialDepositBs.toLocaleString('es-VE')})
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Datos Bancarios de la Tienda */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800">
                          Datos de Pago Móvil de {activeReservation.store_name}:
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyPaymentData}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded-md border border-slate-200"
                        >
                          {copiedBank ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          {copiedBank ? '¡Copiado!' : 'Copiar datos'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                        <div><strong>Banco:</strong> Banesco (0134)</div>
                        <div><strong>Teléfono:</strong> {cleanPhone}</div>
                        <div><strong>C.I. / RIF:</strong> J-40812345-0</div>
                        <div>
                          <strong>Monto exacto:</strong>{' '}
                          <span className="text-emerald-700 font-bold">
                            Bs. {amountToPayBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </span>{' '}
                          (${amountToPayUSD.toFixed(2)} USD)
                        </div>
                      </div>
                    </div>

                    {/* Formulario de Comprobante */}
                    <form onSubmit={handleConfirmPagoMovil} className="space-y-3">
                      {selectedOption === 'delivery' && (
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Dirección de Entrega en Cumaná:
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Urb. Brasil, Calle 3, Casa #12 (o punto de referencia)"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Tu Banco Emisor:
                          </label>
                          <select
                            value={bankInput}
                            onChange={(e) => setBankInput(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                          >
                            <option value="Banesco">Banesco</option>
                            <option value="Banco de Venezuela">Banco de Venezuela (BDV)</option>
                            <option value="Mercantil">Mercantil</option>
                            <option value="Bancaribe">Bancaribe</option>
                            <option value="Provincial">BBVA Provincial</option>
                            <option value="BNC">BNC</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Nro. de Referencia (4 a 6 dígitos):
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: 589201"
                            value={refInput}
                            onChange={(e) => setRefInput(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-mono font-bold"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingPayment}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer text-xs"
                      >
                        <ShieldCheck size={16} />
                        {submittingPayment ? 'Registrando...' : 'Registrar Pago y Enviar por WhatsApp'}
                      </button>
                    </form>

                  </div>
                )}
              </div>
            )}

          </div>

          {/* BOTÓN GENERAL DE WHATSAPP */}
          <div className="space-y-2.5 pt-2">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 text-sm text-center"
            >
              <MessageCircle size={18} />
              {activeReservation.payment_reference 
                ? 'Enviar Comprobante por WhatsApp' 
                : 'Avisar a la Tienda por WhatsApp'}
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
