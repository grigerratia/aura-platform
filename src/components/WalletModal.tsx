'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getProfileWalletCredit } from '@/lib/monetization';
import WalletWidget from './WalletWidget';
import { X, Wallet } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: Props) {
  const [credit, setCredit] = useState(0);
  const [trustScore, setTrustScore] = useState(100);
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const info = await getProfileWalletCredit(user.id);
        setCredit(info.credit);
        setTrustScore(info.trustScore);
        setIsVip(info.isVip);
      }
    };
    loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Wallet size={20} className="text-teal-600" />
            <h2 className="font-black text-slate-900 text-lg">Mi Perfil y Billetera Aura</h2>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <WalletWidget
            walletCreditUSD={credit}
            trustScore={trustScore}
            isVip={isVip}
          />

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

