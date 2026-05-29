// import React from 'react';
// import { LayoutDashboard, Store, Users, CreditCard, LogOut, Plus } from 'lucide-react';

// function SidebarItem({ icon, label, isActive, onClick }: any) {
//   return (
//     <button onClick={onClick} className={`cursor-pointer flex items-center gap-3 w-full p-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white text-slate-400 font-medium'}`}>
//       {icon} <span>{label}</span>
//     </button>
//   );
// }

// export default function MasterSidebar({ activeTab, setActiveTab, handleLogout }: any) {
//   return (
//     <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
//       <div className="p-6 border-b border-slate-800">
//         <h1 className="text-xl font-bold text-white tracking-tight">Aura SaaS</h1>
//         <p className="text-xs text-slate-500 mt-1">Cumaná, Venezuela</p>
//       </div>
//       <nav className="flex-1 p-4 space-y-2">
//         <SidebarItem icon={<LayoutDashboard />} label="Resumen" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
//         <SidebarItem icon={<Plus />} label="Nueva Tienda + Dueño" isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} />
//         <SidebarItem icon={<Store />} label="Ver Tiendas" isActive={activeTab === 'stores'} onClick={() => setActiveTab('stores')} />
//         <SidebarItem icon={<Users />} label="Ver Usuarios" isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} />
//         <SidebarItem icon={<CreditCard />} label="Suscripciones" isActive={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
//       </nav>
//       <div className="p-4 border-t border-slate-800">
//         <button onClick={handleLogout} className="cursor-pointer flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-900/30 hover:text-red-400 transition">
//           <LogOut size={20} /> <span className="font-medium">Salir</span>
//         </button>
//       </div>
//     </aside>
//   );
// }

import React, { useState } from 'react';
import { LayoutDashboard, Store, Users, CreditCard, LogOut, Plus, Menu, X } from 'lucide-react';

function SidebarItem({ icon, label, isActive, onClick }: any) {
  return (
    <button onClick={onClick} className={`cursor-pointer flex items-center gap-3 w-full p-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white text-slate-400 font-medium'}`}>
      {icon} <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

export default function MasterSidebar({ activeTab, setActiveTab, handleLogout }: any) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setIsOpen(false);
  };

  return (
    <>
      {/* Botón Flotante para Móvil (Oculto estrictamente en md en adelante) */}
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

      {/* Sidebar Adaptativo con shrink-0 anti-deformación */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-40 md:z-10 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out md:static shrink-0`}>
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-tight whitespace-nowrap">Aura SaaS</h1>
          <p className="text-xs text-slate-500 mt-1">Cumaná, Venezuela</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Resumen" isActive={activeTab === 'dashboard'} onClick={() => handleNavClick('dashboard')} />
          <SidebarItem icon={<Plus size={20} />} label="Nueva Tienda + Dueño" isActive={activeTab === 'create'} onClick={() => handleNavClick('create')} />
          <SidebarItem icon={<Store size={20} />} label="Ver Tiendas" isActive={activeTab === 'stores'} onClick={() => handleNavClick('stores')} />
          <SidebarItem icon={<Users size={20} />} label="Ver Usuarios" isActive={activeTab === 'users'} onClick={() => handleNavClick('users')} />
          <SidebarItem icon={<CreditCard size={20} />} label="Suscripciones" isActive={activeTab === 'billing'} onClick={() => handleNavClick('billing')} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="cursor-pointer flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-900/30 hover:text-red-400 transition text-slate-400">
            <LogOut size={20} /> <span className="font-medium">Salir</span>
          </button>
        </div>
      </aside>
    </>
  );
}