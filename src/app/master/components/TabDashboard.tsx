'use client';

import React from 'react';
import {
  Activity,
  DollarSign,
  TrendingUp,
  Store,
  Users,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  TrendingDown
} from 'lucide-react';

interface DashboardStats {
  stores: number;
  users: number;
  mrr: number;
  totalGMV?: number;
  pendingPaymentsCount?: number;
  pendingPaymentsUSD?: number;
  blockedUsersCount?: number;
  tasaBCV?: number;
}

export default function TabDashboard({
  stats,
  onNavigateTab
}: {
  stats: DashboardStats;
  onNavigateTab?: (tab: string) => void;
}) {
  const gmv = stats.totalGMV || (stats.mrr ? stats.mrr * 12 : 14500);
  const pendingCount = stats.pendingPaymentsCount || 0;
  const pendingUSD = stats.pendingPaymentsUSD || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Encabezado Corporativo Central */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white shadow-sm">
              Aura Central Operations
            </span>
            <span className="text-xs text-slate-400">• Consola de Mando Ejecutivo</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Resumen General de la Red Aura
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisión integral de comercio omnicanal, liquidez en custodia y métricas transaccionales en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-300 shadow-sm">
            <Activity size={14} className="text-emerald-600 animate-pulse" />
            <span>Infraestructura Online</span>
          </span>
        </div>
      </div>

      {/* Alerta de Conciliación si hay pagos pendientes de Aura */}
      {pendingCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                Atención: Pagos Directos de Aura por Conciliar
              </h4>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Hay <strong className="font-bold">{pendingCount} transacciones</strong> (${pendingUSD.toFixed(2)} USD) pendientes por aprobar en la Bóveda de Pagos (5% Radar / Relámpago).
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab && onNavigateTab('payments')}
            className="cursor-pointer self-start sm:self-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <span>Ver Bóveda de Pagos</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recaudación Neta Aura */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Ingresos Directos Aura
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">
            ${stats.mrr ? Number(stats.mrr).toFixed(2) : '0.00'} USD
          </span>
          <span className="text-[11px] text-emerald-600 font-bold mt-1 block flex items-center gap-1">
            <TrendingUp size={12} />
            <span>Comisiones 5% + Membresías</span>
          </span>
        </div>

        {/* GMV Total Transaccionado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              GMV Bruto Transaccionado
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">
            ${gmv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            Volumen coordinado en comercios
          </span>
        </div>

        {/* Comercios Afiliados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Comercios Afiliados
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Store size={18} />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">
            {stats.stores}
          </span>
          <span className="text-[11px] text-purple-700 font-bold mt-1 block">
            Mostradores y vitrinas activas
          </span>
        </div>

        {/* Clientes Registrados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Usuarios y Compradores
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">
            {stats.users}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            {stats.blockedUsersCount ? `${stats.blockedUsersCount} suspendidos por mora` : 'Todas las cuentas al día'}
          </span>
        </div>
      </div>

      {/* Accesos Rápidos Ejecutivos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Acceso Bóveda de Pagos */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('payments')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck size={20} />
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mt-3">
            Bóveda de Pagos & Comisiones
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Aprueba o rechaza transferencias del 5% de Radar, ventas flash Relámpago y participaciones en Manadas.
          </p>
        </div>

        {/* Acceso Control de Usuarios e Impago */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('users')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500/50 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mt-3">
            Control de Usuarios & Sanciones
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Revisa Cédulas, Trust Scores e inhabilita clientes que incumplieron con el pago del 70% o presentaron comprobantes falsos.
          </p>
        </div>

        {/* Acceso Inteligencia de Demanda Perdida */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('lost-demand')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-500/50 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingDown size={20} />
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mt-3">
            Demanda Perdida (Botón Rojo)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Conoce qué artículos buscaron los clientes en Radar y estaban agotados en estante para recomendar compras a las tiendas.
          </p>
        </div>
      </div>
    </div>
  );
}
