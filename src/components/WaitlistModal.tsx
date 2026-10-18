'use client';

import { useState } from 'react';
import { Product, Store } from '@/types';
import { joinProductWaitlist } from '@/lib/reservations';
import { X, Users, Clock, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  product: Product;
  store?: Store;
  isOpen: boolean;
  onClose: () => void;
}

export default function WaitlistModal({ product, store, isOpen, onClose }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || 'Única');
  const [loading, setLoading] = useState(false);
  const [successPosition, setSuccessPosition] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Por favor ingresa tu nombre y WhatsApp para avisarte.');
      return;
    }

    setLoading(true);
    try {
      const item = await joinProductWaitlist({
        productId: product.id,
        productName: product.name,
        storeId: product.store_id || store?.id || '',
        storeName: store?.name || 'Tienda Aliada',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        selectedSize,
      });

      setSuccessPosition(item.position);
    } catch {
      alert('Hubo un inconveniente. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-5 sm:p-6 text-white flex justify-between items-start">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-2 border border-white/20">
              <Users size={13} /> Fila de Espera en Vivo
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Turno Prioritario</h2>
            <p className="text-xs text-amber-100 mt-1">
              Si el comprador actual no concreta en 3h, el turno pasa a ti sin aumento de precio.
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido */}
        {successPosition !== null ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">¡Estás en la Fila!</h3>
              <p className="text-xs text-slate-600 mt-1">
                Tu posición en lista de espera: <strong>#{successPosition}</strong> para {product.name} ({selectedSize}).
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 text-left space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Clock size={15} className="text-amber-600" />
                ¿Qué pasa ahora?
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                El comprador actual tiene una cuenta regresiva de 3 horas. Si no se presenta en la tienda física de Cumaná, te contactaremos de inmediato por WhatsApp con el precio congelado.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Entendido, volver a la tienda
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="p-6 space-y-4 text-xs">
            {/* Resumen producto */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <img
                src={product.imageUrl || product.image_url || '/placeholder.png'}
                alt={product.name}
                className="w-12 h-12 object-contain rounded-xl bg-white p-1 border border-slate-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 text-xs truncate">{product.name}</div>
                <div className="text-amber-700 font-semibold text-[11px] flex items-center gap-1 mt-0.5">
                  <Clock size={12} /> En Reserva Temporal (Última Unidad)
                </div>
              </div>
            </div>

            {/* Selector de Talla */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Talla que buscas:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        selectedSize === sz
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Datos */}
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Tu Nombre y Apellido:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Daniel Gómez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  WhatsApp para avisarte si se libera:
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 0412 8765432"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 text-xs font-medium"
                />
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                Cero sobreprecios: respetamos exactamente el mismo precio congelado si el turno se libera.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white py-3.5 rounded-xl font-black text-xs shadow-lg shadow-amber-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <Users size={16} />
                  Anotarme en la Fila de Espera
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

