'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getProfileWalletCredit } from '@/lib/monetization';
import WalletWidget from './WalletWidget';
import { X, Wallet } from 'lucide-react';
import { useGameSound } from '@/hooks/useGameSound';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: Props) {
  const { playTap } = useGameSound();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#030910] rounded-3xl shadow-2xl overflow-hidden border border-emerald-950/80 animate-in zoom-in-95 duration-200 text-white">
        
        {/* Cabecera del Modal */}
        <div className="flex justify-between items-center p-6 border-b border-emerald-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-[#00ffb2]">
              <Wallet size={16} />
            </div>
            <h2 className="font-black text-white text-lg tracking-tight">Mi Perfil y Billetera Aura</h2>
          </div>
          <button
            onClick={() => {
              playTap();
              onClose();
            }}
            className="cursor-pointer p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <WalletWidget
            walletCreditUSD={credit}
            trustScore={trustScore}
            isVip={isVip}
          />

          <button
            type="button"
            onClick={() => {
              playTap();
              onClose();
            }}
            className="w-full mt-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-[#00ffb2] font-black py-3 rounded-xl text-xs border border-emerald-800/40 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
