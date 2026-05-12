import React from 'react';
import { LayoutDashboard, Store, Users, CreditCard, LogOut, Plus } from 'lucide-react';

function SidebarItem({ icon, label, isActive, onClick }: any) {
  return (
    <button onClick={onClick} className={`cursor-pointer flex items-center gap-3 w-full p-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white text-slate-400 font-medium'}`}>
      {icon} <span>{label}</span>
    </button>
  );
}

export default function MasterSidebar({ activeTab, setActiveTab, handleLogout }: any) {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight">Servicios Kraken</h1>
        <p className="text-xs text-slate-500 mt-1">Cumaná, Venezuela</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <SidebarItem icon={<LayoutDashboard />} label="Resumen" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <SidebarItem icon={<Plus />} label="Nueva Tienda + Dueño" isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} />
        <SidebarItem icon={<Store />} label="Ver Tiendas" isActive={activeTab === 'stores'} onClick={() => setActiveTab('stores')} />
        <SidebarItem icon={<Users />} label="Ver Usuarios" isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} />
        <SidebarItem icon={<CreditCard />} label="Suscripciones" isActive={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button onClick={handleLogout} className="cursor-pointer flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-900/30 hover:text-red-400 transition">
          <LogOut size={20} /> <span className="font-medium">Salir</span>
        </button>
      </div>
    </aside>
  );
}