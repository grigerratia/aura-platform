'use client';

import { useState, useEffect } from 'react';
import { Product, Store } from '@/types';
import { useReservations } from '@/store/useReservations';
import { createReservation } from '@/lib/reservations';
import { calculateSplitPayment, getProfileWalletCredit } from '@/lib/monetization';
import { supabase } from '@/lib/supabase';
import SplitPaymentBreakdownCard from './SplitPaymentBreakdownCard';
import { X, Clock, ShieldCheck, Sparkles, Loader2, Wallet, Check, Zap } from 'lucide-react';

interface Props {
  product: Product;
  store: Store;
  tasa: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReserveProductModal({ product, store, tasa, isOpen, onClose }: Props) {
  const { setActiveReservation } = useReservations();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Variantes seleccionadas { [label]: option }
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  
  // Saldo de billetera
  const [userWalletCredit, setUserWalletCredit] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  // Inicializar variantes por defecto
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      const initial: Record<string, string> = {};
      product.variants.forEach((vg) => {
        if (vg.options && vg.options.length > 0) {
          initial[vg.label] = vg.options[0];
        }
      });
      setSelectedVariants(initial);
    } else if (product.sizes && product.sizes.length > 0) {
      setSelectedVariants({ Talla: product.sizes[0] });
    }
  }, [product]);

  // Consultar crédito de billetera si el usuario está autenticado
  useEffect(() => {
    const fetchUserCredit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const info = await getProfileWalletCredit(user.id);
        setUserWalletCredit(info.credit);
        if (info.credit > 0) {
          setUseWallet(true);
        }
      }
    };
    fetchUserCredit();
  }, [isOpen]);

  if (!isOpen) return null;

  const split = calculateSplitPayment(product);
  const isAutoConfirm = Boolean(product.auto_confirm_stock && (product.stock_quota === undefined || product.stock_quota > 0));

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Por favor ingresa tu nombre y número de contacto.');
      return;
    }

    setLoading(true);
    try {
      const primaryVariantValue = Object.values(selectedVariants)[0] || 'Única';

      const reservation = await createReservation({
        storeId: store.id || product.store_id || '',
        storeName: store.name || 'Tienda Oficial',
        storeWhatsapp: (store.whatsapp || store.owner_whatsapp || '').toString(),
        storeAddress: store.address || store.zone || 'Cumaná',
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl || product.image_url,
        selectedSize: primaryVariantValue,
        selectedVariant: selectedVariants,
        categoryArchetype: product.category_archetype || 'RETAIL_STANDARD',
        priceUsd: split.auraPriceUSD,
        regularPriceUsd: split.regularPriceUSD,
        unlockFeeUsd: split.unlockFeeUSD,
        storePayBalanceUsd: split.storePayBalanceUSD,
        paidWithWallet: useWallet && userWalletCredit >= split.unlockFeeUSD,
        autoConfirmStock: isAutoConfirm,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-4 animate-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-indigo-950 via-purple-900 to-teal-900 p-5 sm:p-6 text-white flex justify-between items-start">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-400/20 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2 border border-teal-400/30">
              <Sparkles size={14} /> Reserva con Precio Congelado
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              Apartar en {store.name}
            </h2>
            <p className="text-xs text-white/80 mt-0.5">
              {isAutoConfirm ? '⚡ Confirmación Instantánea de Cupo' : 'Verificación rápida en tienda física'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Desglose de Split Payment */}
        <div className="p-4 sm:p-6 pb-2">
          <SplitPaymentBreakdownCard product={product} tasa={tasa} />
        </div>

        {/* Formulario */}
        <form onSubmit={handleConfirmReservation} className="p-4 sm:p-6 pt-2 space-y-4">
          
          {/* Variantes Dinámicas JSONB (o tallas) */}
          {product.variants && product.variants.length > 0 ? (
            <div className="space-y-3">
              {product.variants.map((group) => (
                <div key={group.label} className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    {group.label}:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((opt) => {
                      const isSelected = selectedVariants[group.label] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSelectedVariants({ ...selectedVariants, [group.label]: opt })}
                          className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : product.sizes && product.sizes.length > 0 ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Selecciona tu Talla:
              </label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((sz) => {
                  const isSelected = selectedVariants['Talla'] === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedVariants({ Talla: sz })}
                      className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold border transition ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Opción de Pago con Billetera de Saldo a Favor */}
          {split.unlockFeeUSD > 0 && userWalletCredit > 0 && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-teal-700" />
                <div>
                  <span className="font-bold text-teal-950 block">Pagar anticipo con Billetera Aura</span>
                  <span className="text-[11px] text-teal-700">Saldo disponible: ${userWalletCredit.toFixed(2)} USD</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={useWallet}
                onChange={(e) => setUseWallet(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
              />
            </div>
          )}

          {/* Datos del Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Tu Nombre Completo
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Carlos Silva"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-xs sm:text-sm font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Teléfono / WhatsApp
              </label>
              <input
                type="tel"
                required
                placeholder="Ej: 0412 1234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-xs sm:text-sm font-medium"
              />
            </div>
          </div>

          {/* Alerta de Autoconfirmación si aplica */}
          {isAutoConfirm && (
            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 flex items-center gap-2 text-xs text-amber-900">
              <Zap size={16} className="text-amber-600 shrink-0" />
              <span><strong>Cupo de Hoy Asegurado:</strong> Este combo tiene reserva directa sin esperas.</span>
            </div>
          )}

          {/* Botón Principal */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white py-3.5 sm:py-4 rounded-2xl font-black text-sm sm:text-base shadow-xl shadow-teal-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Clock size={18} />
                {isAutoConfirm ? 'Generar Ticket de Consumo Hoy' : 'Confirmar Reserva en Tienda'}
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
