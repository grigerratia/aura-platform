'use client';

import { useState } from 'react';
import { Product, Store } from '@/types';
import { useGameSound } from '@/hooks/useGameSound';
import { useReservations } from '@/store/useReservations';
import {
  X, Unlock, Clock, ShieldCheck, MapPin, Check,
  Sparkles, Store as StoreIcon, AlertCircle, Loader2, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface Props {
  product: Product | null;
  onClose: () => void;
  onSuccessUnlock: () => void;
  stores?: Store[];
}

export default function ProductBottomSheet({
  product,
  onClose,
  onSuccessUnlock,
  stores = [],
}: Props) {
  const { playTap, playUnlockSuccess } = useGameSound();
  const { setActiveReservation } = useReservations();

  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [successMode, setSuccessMode] = useState(false);
  const [generatedPin, setGeneratedPin] = useState('');

  if (!product) return null;

  const auraPrice = product.aura_price_usd || product.price;
  const regularPrice = product.regular_price_usd || product.price;
  const unlockFee =
    product.unlock_fee_usd !== undefined && product.unlock_fee_usd !== null
      ? product.unlock_fee_usd
      : Number((auraPrice * 0.1).toFixed(2));
  const storeBalance = Number((auraPrice - unlockFee).toFixed(2));

  // Tienda asociada
  const store = stores.find((s) => s.id === product.storeId || s.id === product.store_id);
  const storeName = store?.name || 'Tienda Física Cumaná';
  const storeZone = store?.zone || 'Centro de Cumaná';

  // Variantes disponibles
  const variantGroup = product.variants?.[0];
  const variantOptions = variantGroup?.options || product.sizes || [];

  const handleConfirmReservation = async () => {
    playTap();
    setLoading(true);

    try {
      // Simular generación y verificación en microsegundos
      await new Promise((r) => setTimeout(r, 600));

      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

      const reservationPayload: any = {
        id: `res-${Date.now()}`,
        pin: pin,
        pin_code: pin,
        store_id: product.store_id || product.storeId || 'store-cumana',
        store_name: storeName,
        store_address: storeZone,
        product_id: product.id,
        product_name: product.name,
        product_image: product.imageUrl || product.image_url,
        selected_size: selectedVariant || variantOptions[0] || 'Estándar',
        price_usd: auraPrice,
        unlock_fee_usd: unlockFee,
        store_pay_balance_usd: storeBalance,
        price_ves: Math.round(auraPrice * 500),
        tasa: 500,
        customer_name: 'Cliente Aura',
        customer_phone: '04140000000',
        status: product.auto_confirm_stock ? 'VERIFIED' : 'PENDING_STORE_VERIFICATION',
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      };

      setActiveReservation(reservationPayload);
      setGeneratedPin(pin);
      setSuccessMode(true);

      // Disparar sonido de éxito y celebración
      playUnlockSuccess();
      onSuccessUnlock();

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
        
        {/* BACKDROP BLURRED */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* BOTTOM SHEET CONTENT */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative w-full max-w-lg bg-[#03080e] border-t border-emerald-950/80 rounded-t-3xl sm:rounded-t-[2.5rem] shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto no-scrollbar z-10"
        >
          {/* DRAG HANDLE */}
          <div className="w-12 h-1 rounded-full bg-slate-700/80 mx-auto mb-4" />

          {/* BOTÓN CERRAR */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white bg-slate-900/60 rounded-full transition cursor-pointer"
          >
            <X size={18} />
          </button>

          {successMode ? (
            /* PANTALLA DE ÉXITO Y TICKET GENERADO */
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-950/60 border border-emerald-500/60 text-[#00ffb2] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(0,255,178,0.35)]">
                <Check size={36} />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                  {product.auto_confirm_stock ? 'Stock Autoconfirmado' : 'Reserva Solicitada al Comercio'}
                </span>
                <h3 className="text-2xl font-black text-white">¡Pase #{generatedPin} Desbloqueado!</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Tu reserva ha sido generada. La tienda {storeName} ({storeZone}) te espera.
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-emerald-950 rounded-2xl flex items-center justify-around text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">PAGO POR ADELANTADO:</span>
                  <span className="font-black text-[#00ffb2] text-sm">${unlockFee.toFixed(2)} USD</span>
                </div>
                <div className="w-px h-8 bg-slate-800" />
                <div>
                  <span className="text-slate-500 block text-[10px]">SALDO EN CAJA:</span>
                  <span className="font-black text-white text-sm">${storeBalance.toFixed(2)} USD</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black py-4 rounded-2xl text-xs transition shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
              >
                Ver Mi Pase en el Dock
              </button>
            </div>
          ) : (
            /* DETALLES DEL PRODUCTO Y SELECCIÓN */
            <div className="space-y-5">
              
              {/* IMAGEN Y CABECERA */}
              <div className="flex gap-4 items-center">
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                  {product.imageUrl || product.image_url ? (
                    <Image
                      src={product.imageUrl || product.image_url || ''}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">Aura</div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                    <StoreIcon size={13} />
                    <span className="truncate">{storeName}</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white truncate">
                    {product.name}
                  </h2>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <MapPin size={12} className="text-slate-500" />
                    <span>{storeZone}</span>
                  </div>
                </div>
              </div>

              {/* SELECTOR DE VARIANTE O TALLA (SI APLICA) */}
              {variantOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-300">
                      Elige {variantGroup?.label || 'Opción / Talla'}:
                    </span>
                    <span className="text-[11px] text-[#00ffb2] font-semibold">
                      {selectedVariant || 'Toca para elegir'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {variantOptions.map((opt) => {
                      const isSel = selectedVariant === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            playTap();
                            setSelectedVariant(opt);
                          }}
                          className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                            isSel
                              ? 'bg-emerald-950 text-[#00ffb2] border-[#00ffb2] shadow-[0_0_12px_-2px_rgba(0,255,178,0.4)] scale-105'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* DESGLOSE SPLIT-PAYMENT (10% - 90%) */}
              <div className="bg-slate-950/80 border border-slate-900 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-900">
                  <span className="text-slate-400">Precio Regular:</span>
                  <span className="line-through text-slate-500 font-bold">${regularPrice.toFixed(2)} USD</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-white block">Precio Especial Aura:</span>
                    <span className="text-[10px] text-emerald-400">Descuento aplicado en vitrina</span>
                  </div>
                  <span className="text-xl font-black text-[#00ffb2]">${auraPrice.toFixed(2)} USD</span>
                </div>

                {/* Split 10% vs 90% */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-900/40">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 block">
                      Pase de Desbloqueo (10%)
                    </span>
                    <span className="font-black text-white text-sm">${unlockFee.toFixed(2)} USD</span>
                    <span className="text-[9px] text-slate-400 block">Anticipo protegido Aura</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Saldo en Caja (90%)
                    </span>
                    <span className="font-black text-white text-sm">${storeBalance.toFixed(2)} USD</span>
                    <span className="text-[9px] text-slate-400 block">Pagas directo en la tienda</span>
                  </div>
                </div>
              </div>

              {/* CANDADO DE CONFIANZA & CRONÓMETRO 3H */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-300">
                <Clock size={16} className="text-indigo-400 shrink-0" />
                <span className="text-[11px] leading-tight">
                  Dispones de <strong>3 horas garantizadas</strong> para retirar en mostrador o extender a 48h con pago móvil.
                </span>
              </div>

              {/* BOTÓN PRINCIPAL DE DESBLOQUEO */}
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmReservation}
                className="game-sweep w-full cursor-pointer bg-gradient-to-r from-emerald-500 via-[#00ffb2] to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-4 px-6 rounded-2xl text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Verificando con el Comercio...</span>
                  </>
                ) : (
                  <>
                    <Unlock size={17} />
                    <span>Desbloquear Pase QR (${unlockFee.toFixed(2)} USD)</span>
                  </>
                )}
              </button>

            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}

