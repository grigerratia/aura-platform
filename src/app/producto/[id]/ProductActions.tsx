'use client';

import { useState, useEffect } from 'react';
import { Product, Store } from '@/types';
import { Clock, ShieldCheck, CheckCircle2, Users, Crown, Sparkles, Lock } from 'lucide-react';
import { checkVipEarlyAccess, getProfileWalletCredit } from '@/lib/monetization';
import { supabase } from '@/lib/supabase';
import ProductBottomSheet from '@/components/game/ProductBottomSheet';
import WaitlistModal from '@/components/WaitlistModal';
import SplitPaymentBreakdownCard from '@/components/SplitPaymentBreakdownCard';

interface Props {
  product: Product;
  store: Store;
  tasa: number;
}

export default function ProductActions({ product, store, tasa }: Props) {
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [isVipUser, setIsVipUser] = useState(false);

  useEffect(() => {
    const checkVip = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const info = await getProfileWalletCredit(user.id);
        setIsVipUser(info.isVip);
      }
    };
    checkVip();
  }, []);

  const vipAccess = checkVipEarlyAccess(product, isVipUser);
  const isOutOfStock = product.stock_status === 'sold_out' || (typeof product.stock === 'number' && product.stock <= 0);

  const productWithStore: Product = {
    ...product,
    store_id: product.store_id || store.id,
    storeId: product.storeId || store.id,
  };

  return (
    <div className="space-y-4">
      
      {/* Tarjeta de Ecuación Split-Payment */}
      <SplitPaymentBreakdownCard product={product} tasa={tasa} />

      {/* Acceso Anticipado VIP (30 minutos de exclusividad en Remates) */}
      {vipAccess.isLocked ? (
        <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-2xl text-xs space-y-2 text-white">
          <div className="flex items-center gap-2 font-black text-amber-400">
            <Crown size={18} className="text-amber-400 shrink-0" />
            <span>Acceso Anticipado VIP (Remate Exclusivo)</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Este producto fue publicado hace menos de 30 minutos. Se desbloquea para todo público en{' '}
            <strong className="font-mono text-amber-400 underline">{vipAccess.minutesRemaining} minutos</strong>.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => alert("Puedes activar tu membresía Aura VIP por $2/mes para apartar remates antes que nadie.")}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Crown size={14} /> Hazte VIP por $2/mes
            </button>
          </div>
        </div>
      ) : isOutOfStock ? (
        <div className="space-y-2">
          <div className="p-3 bg-amber-950/30 rounded-2xl border border-amber-900/50 text-xs text-amber-300 flex items-center gap-2">
            <Users size={16} className="text-amber-400 shrink-0" />
            <span>Este producto se encuentra en <strong>Reserva Temporal</strong> o agotado para hoy.</span>
          </div>

          <button
            onClick={() => setIsWaitlistModalOpen(true)}
            className="cursor-pointer w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-4 rounded-2xl font-black text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <Users size={18} />
            Anotarme en la Fila de Espera (Mismo Precio)
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsReserveModalOpen(true)}
          className="cursor-pointer w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-[#00ffb2] hover:brightness-110 text-black py-4 rounded-2xl font-black text-base shadow-[0_0_25px_rgba(0,255,178,0.25)] transition-all transform active:scale-98 flex items-center justify-center gap-2"
        >
          <Clock size={20} />
          Apartar Producto (Reserva Garantizada)
        </button>
      )}

      {/* Modal de Pago y Apartado Nativo de Aura */}
      <ProductBottomSheet
        product={isReserveModalOpen ? productWithStore : null}
        onClose={() => setIsReserveModalOpen(false)}
        onSuccessUnlock={() => {
          setIsReserveModalOpen(false);
        }}
        stores={[store]}
        tasa={tasa}
      />

      {/* Modal de Fila de Espera */}
      <WaitlistModal
        product={product}
        store={store}
        isOpen={isWaitlistModalOpen}
        onClose={() => setIsWaitlistModalOpen(false)}
      />
    </div>
  );
}