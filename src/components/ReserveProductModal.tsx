'use client';

import { useState } from 'react';
import { Product, Store } from '@/types';
import { useReservations } from '@/store/useReservations';
import { createReservation } from '@/lib/reservations';
import { X, Clock, ShieldCheck, Sparkles, Loader2, Tag } from 'lucide-react';

interface Props {
  product: Product;
  store: Store;
  tasa: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReserveProductModal({ product, store, tasa, isOpen, onClose }: Props) {
  const { setActiveReservation } = useReservations();
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Cálculo de precio
  const finalPriceUSD = product.sale_price && product.sale_price < product.price
    ? product.sale_price
    : product.discount_percent && product.discount_percent > 0
    ? product.price * (1 - product.discount_percent / 100)
    : product.price;

  const finalPriceVES = (finalPriceUSD * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 });

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Por favor ingresa tu nombre y número de contacto.');
      return;
    }

    setLoading(true);
    try {
      const reservation = await createReservation({
        storeId: store.id || product.store_id || '',
        storeName: store.name || 'Tienda Oficial',
        storeWhatsapp: (store.whatsapp || store.owner_whatsapp || '').toString(),
        storeAddress: store.address || store.zone || 'Cumaná',
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl || product.image_url,
        selectedSize: selectedSize || undefined,
        priceUsd: finalPriceUSD,
        tasa,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim()
      });

      setActiveReservation(reservation);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      alert('Hubo un problema al crear tu reserva. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const sizesList = product.sizes && product.sizes.length > 0 ? product.sizes : ['Única'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-6 text-white flex justify-between items-start">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-400/20 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2 border border-teal-400/30">
              <Sparkles size={14} /> Reserva con Precio Congelado
            </span>
            <h2 className="text-2xl font-black tracking-tight">Apartar en {store.name}</h2>
            <p className="text-xs text-white/80 mt-1">Cero comisiones. Paga directo en el local al retirar.</p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumen del Producto */}
        <div className="p-6 bg-slate-50 border-b border-slate-200/60 flex items-center gap-4">
          <img
            src={product.imageUrl || product.image_url || '/placeholder.png'}
            alt={product.name}
            className="w-20 h-20 object-contain rounded-2xl bg-white p-2 border border-slate-200 shrink-0 shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
              {product.name}
            </h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-indigo-950">${finalPriceUSD.toFixed(2)} USD</span>
              <span className="text-xs font-bold text-emerald-600">Bs. {finalPriceVES}</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">Tasa oficial BCV: {tasa} Bs.</span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleConfirmReservation} className="p-6 space-y-4">
          
          {/* Selector de Talla/Variante */}
          {sizesList.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Selecciona tu Talla o Variante
              </label>
              <div className="flex flex-wrap gap-2">
                {sizesList.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-bold border transition ${
                      selectedSize === sz
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Datos del Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Tu Nombre
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Carlos Silva"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Teléfono / WhatsApp
              </label>
              <input
                type="tel"
                required
                placeholder="Ej: 0412 1234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
              />
            </div>
          </div>

          {/* Garantía y Confianza */}
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-start gap-3 text-xs text-emerald-900">
            <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Reserva 100% Gratuita</strong>
              <span>Tu producto se reserva por 3 horas con precio congelado. Pagas directo en la tienda al retirar con Efectivo, Punto, Pago Móvil o Cashea.</span>
            </div>
          </div>

          {/* Botón Principal */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-teal-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Clock size={20} />
                Confirmar y Congelar por 3 Horas
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

