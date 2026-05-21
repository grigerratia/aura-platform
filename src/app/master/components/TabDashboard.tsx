import React from 'react';
import { Activity } from 'lucide-react';
import MetricCard from './MetricCard';

export default function TabDashboard({ stats }: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Estado de la Red Aura</h2>
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm">
          <Activity size={16} /> Online
        </span>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Tiendas Registradas" value={stats.stores} />
        <MetricCard title="Dueños / Clientes" value={stats.users} />
        <MetricCard title="Ingresos Estimados" value={`$${stats.mrr}`} />
      </div>
    </div>
  );
}