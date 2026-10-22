'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  TrendingDown,
  Store,
  Plus,
  Lock,
  Menu,
  X,
  CreditCard,
  Shield
} from 'lucide-react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: number | string | null;
  badgeColor?: string;
  isActive: boolean;
  onClick: () => void;
}

function SidebarItem({ icon, label, badge, badgeColor = 'bg-emerald-500', isActive, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer flex items-center justify-between w-full p-3 rounded-xl transition-all ${
        isActive
          ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
          : 'hover:bg-slate-800 hover:text-white text-slate-400 font-medium'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="whitespace-nowrap text-xs">{label}</span>
      </div>

      {badge !== undefined && badge !== null && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black text-white ${badgeColor}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export default function MasterSidebar({
  activeTab,
  setActiveTab,
  handleLogout,
  pendingPaymentsCount = 0
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleLogout: () => void;
  pendingPaymentsCount?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setIsOpen(false);
  };

  return (
    <>
      {/* Botón Flotante para Móvil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 shadow-2xl focus:outline-none active:scale-95 transition-transform"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Fondo oscuro traslúcido en móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Adaptativo */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-950 text-slate-300 flex flex-col shadow-2xl z-40 md:z-10 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out md:static shrink-0 border-r border-slate-800`}>
        {/* Cabecera Corporativa */}
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#00ffb2]">
              <Shield size={18} />
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight leading-tight">
                Aura Corporate
              </h1>
              <p className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase font-bold">
                Bóveda Master HQ
              </p>
            </div>
          </div>
        </div>

        {/* Navegación Principal */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Mando Central
          </div>

          <SidebarItem
            icon={<LayoutDashboard size={18} />}
            label="Resumen General"
            isActive={activeTab === 'dashboard'}
            onClick={() => handleNavClick('dashboard')}
          />

          <SidebarItem
            icon={<ShieldCheck size={18} />}
            label="Bóveda de Pagos"
            badge={pendingPaymentsCount > 0 ? pendingPaymentsCount : null}
            badgeColor="bg-amber-500"
            isActive={activeTab === 'payments'}
            onClick={() => handleNavClick('payments')}
          />

          <SidebarItem
            icon={<Users size={18} />}
            label="Usuarios & Riesgo"
            isActive={activeTab === 'users'}
            onClick={() => handleNavClick('users')}
          />

          <SidebarItem
            icon={<TrendingDown size={18} />}
            label="Demanda Perdida"
            isActive={activeTab === 'lost-demand'}
            onClick={() => handleNavClick('lost-demand')}
          />

          <div className="px-3 pt-4 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Ecosistema de Tiendas
          </div>

          <SidebarItem
            icon={<Store size={18} />}
            label="Tiendas Afiliadas"
            isActive={activeTab === 'stores'}
            onClick={() => handleNavClick('stores')}
          />

          <SidebarItem
            icon={<Plus size={18} />}
            label="Nueva Tienda + Dueño"
            isActive={activeTab === 'create'}
            onClick={() => handleNavClick('create')}
          />
        </nav>

        {/* Footer con Cierre de Sesión Seguro */}
        <div className="p-3.5 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="cursor-pointer flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-red-950/40 hover:text-red-400 transition text-slate-400 text-xs font-bold"
          >
            <Lock size={16} />
            <span>Bloquear Bóveda Master</span>
          </button>
        </div>
      </aside>
    </>
  );
}
