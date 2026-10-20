'use client';

import { useState } from 'react';
import { Product, Store } from '@/types';
import TopHUD from './TopHUD';
import BottomDock, { GameMode } from './BottomDock';
import SmokeTransition from './SmokeTransition';
import RadarMode from './modes/RadarMode';
import RelampagoMode from './modes/RelampagoMode';
import ManadasMode from './modes/ManadasMode';
import PasesMode from './modes/PasesMode';
import ProductBottomSheet from './ProductBottomSheet';
import WalletModal from '../WalletModal';
import AuroraParticles from './AuroraParticles';
import { useReservations } from '@/store/useReservations';

interface Props {
  initialProducts: Product[];
  initialStores: Store[];
  initialTasa?: number;
}

export default function AuraGameShell({
  initialProducts,
  initialStores,
  initialTasa = 500.0,
}: Props) {
  const { activeReservation } = useReservations();

  // Modo de navegación activo (Radar, Relámpago, Manadas, Pases)
  const [activeMode, setActiveMode] = useState<GameMode>('radar');

  // Estado del producto seleccionado para el Bottom Sheet
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Estado del Modal de Billetera
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  // Saldo a favor (USD)
  const [walletCredit, setWalletCredit] = useState(0.0);

  // Ciudad seleccionada
  const [selectedCity, setSelectedCity] = useState('Cumaná');

  // Trigger para ráfaga de partículas de celebración en canvas
  const [burstTrigger, setBurstTrigger] = useState(0);

  const handleSuccessUnlock = () => {
    // Disparar ráfaga de 35 partículas luminosas
    setBurstTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#020508] text-white flex flex-col font-sans relative selection:bg-[#00ffb2] selection:text-black">
      
      {/* 1. LUZ AMBIENTAL DE FONDO: AURORA BOREAL EN CIELO NOCTURNO */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Luz Verde Esmeralda Boreal */}
        <div className="absolute top-[-10%] right-[10%] w-[38rem] h-[38rem] rounded-full bg-emerald-500/10 blur-[130px]" />
        {/* Luz Violeta / Índigo Cósmica */}
        <div className="absolute top-[25%] left-[-15%] w-[42rem] h-[42rem] rounded-full bg-purple-900/12 blur-[150px]" />
        {/* Luz Azul Glaciar */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-cyan-600/8 blur-[140px]" />
      </div>

      {/* RÁFAGA DE CELEBRACIÓN GLOBAL */}
      <AuroraParticles burstTrigger={burstTrigger} count={0} />

      {/* 2. TOP HUD: BARRA DE ESTADO DEL USUARIO FIJA ARRIBA */}
      <TopHUD
        onOpenWallet={() => setIsWalletOpen(true)}
        walletCreditUSD={walletCredit}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        tasa={initialTasa}
      />

      {/* 3. ÁREA CENTRAL CON TRANSICIÓN DE HUMO / MATERIALIZACIÓN */}
      <main className="relative z-10 flex-1 pt-18 sm:pt-20 max-w-6xl mx-auto w-full">
        <SmokeTransition modeKey={activeMode}>
          {activeMode === 'radar' ? (
            <RadarMode
              products={initialProducts}
              stores={initialStores}
              onSelectProduct={(p) => setSelectedProduct(p)}
            />
          ) : activeMode === 'relampago' ? (
            <RelampagoMode
              products={initialProducts}
              onSelectProduct={(p) => setSelectedProduct(p)}
            />
          ) : activeMode === 'manadas' ? (
            <ManadasMode
              products={initialProducts}
              onSelectProduct={(p) => setSelectedProduct(p)}
            />
          ) : (
            <PasesMode
              onOpenWallet={() => setIsWalletOpen(true)}
              onExploreRadar={() => setActiveMode('radar')}
            />
          )}
        </SmokeTransition>
      </main>

      {/* 4. BOTTOM DOCK: BARRA INFERIOR FIJA CON 4 MODOS DE JUEGO */}
      <BottomDock
        activeMode={activeMode}
        onChangeMode={setActiveMode}
        hasActiveTicket={!!activeReservation}
      />

      {/* 5. BOTTOM SHEET MODAL (AL TOCAR CUALQUIER TARJETA) */}
      <ProductBottomSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSuccessUnlock={handleSuccessUnlock}
        stores={initialStores}
      />

      {/* 6. MODAL DE BILLETERA DE SALDO A FAVOR */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
      />

    </div>
  );
}

