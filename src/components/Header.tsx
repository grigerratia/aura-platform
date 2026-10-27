'use client';

import { useState } from 'react';
import { Store } from '@/types';
import TopHUD from './game/TopHUD';
import WalletModal from './WalletModal';

interface Props {
  stores?: Store[];
  initialTasa?: number;
}

/**
 * Header unificado de la plataforma Aura (TopHUD + WalletModal).
 * Reemplaza el header antiguo y unifica la experiencia visual en todas las vistas.
 */
export default function Header({ initialTasa = 500.0 }: Props) {
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  return (
    <>
      <TopHUD
        onOpenWallet={() => setIsWalletOpen(true)}
        tasa={initialTasa}
      />
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
      />
    </>
  );
}
