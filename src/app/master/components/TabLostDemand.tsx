'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TrendingDown,
  AlertOctagon,
  Search,
  Filter,
  RefreshCw,
  Store,
  Layers,
  Phone,
  Calendar,
  PackageX,
  FileSpreadsheet
} from 'lucide-react';

interface LostDemandItem {
  id: string;
  store_id?: string;
  store_name?: string;
  product_id?: string;
  product_name?: string;
  category?: string;
  selected_variant?: string;
  customer_phone?: string;
  reason?: string;
  created_at?: string;
}

export default function TabLostDemand() {
  const [logs, setLogs] = useState<LostDemandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLostDemand = async () => {
    setLoading(true);
    try {
      // 1. Consultar tabla de demanda perdida oficial
      const { data: lostData, error } = await supabase
        .from('lost_demand_logs')
        .select('*, stores(name)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Nota: lost_demand_logs:', error);
      }

      if (lostData && lostData.length > 0) {
        setLogs(
          lostData.map((l: any) => ({
            ...l,
            store_name: l.stores?.name || 'Tienda Afiliada',
          }))
        );
      } else {
        // Fallback: Si la tabla aún no tiene registros, recolectamos reservas canceladas por mostrador (Botón Rojo)
        const { data: resData } = await supabase
          .from('reservations')
          .select('*')
          .in('status', ['cancelled', 'rechazada', 'sin_stock'])
          .order('created_at', { ascending: false });

        if (resData) {
          const fallbackLogs: LostDemandItem[] = resData.map((r: any) => ({
            id: r.id,
            store_id: r.store_id,
            store_name: r.store_name,
            product_id: r.product_id,
            product_name: r.product_name,
            category: 'Radar',
            selected_variant: r.selected_size,
            customer_phone: r.customer_phone,
            reason: 'OUT_OF_STOCK (Botón Rojo)',
            created_at: r.created_at,
          }));
          setLogs(fallbackLogs);
        }
      }
    } catch (err) {
      console.error('Error fetching lost demand:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLostDemand();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (l.product_name || '').toLowerCase().includes(q) ||
        (l.store_name || '').toLowerCase().includes(q) ||
        (l.selected_variant || '').toLowerCase().includes(q) ||
        (l.customer_phone || '').toLowerCase().includes(q)
      );
    });
  }, [logs, search]);

  // Agrupación por productos más solicitados que estaban agotados
  const topMissedProducts = useMemo(() => {
    const map = new Map<string, { name: string; count: number; store: string }>();
    logs.forEach(l => {
      const name = l.product_name || 'Desconocido';
      const existing = map.get(name);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(name, { name, count: 1, store: l.store_name || 'Comercios Varios' });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [logs]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Encabezado Corporativo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
              Inteligencia de Mercado HQ
            </span>
            <span className="text-xs text-slate-400">• Telemetría de Demanda Perdida</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <TrendingDown size={26} className="text-rose-600" />
            Reporte de Demanda Perdida (Eventos Botón Rojo)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro automático de clientes que quisieron comprar pero el comercio marcó agotado en estante físico.
          </p>
        </div>

        <button
          onClick={fetchLostDemand}
          disabled={loading}
          className="cursor-pointer self-start md:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-rose-600' : ''} />
          <span>Actualizar Telemetría</span>
        </button>
      </div>

      {/* Tarjetas de Métricas de Demanda Insatisfecha */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Eventos de Desabastecimiento
            </span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">
              {logs.length}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Intentos de compra fallidos
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <PackageX size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Artículos Únicos Agotados
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {topMissedProducts.length}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Productos sin stock físico
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center">
            <AlertOctagon size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Top Artículos Más Buscados sin Stock
          </span>
          <div className="space-y-1.5">
            {topMissedProducts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay registros de desabastecimiento aún.</p>
            ) : (
              topMissedProducts.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-slate-800 font-bold truncate max-w-[180px]">{item.name}</span>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-black text-[10px]">
                    {item.count} búsquedas
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar demanda perdida por Producto, Variante, Tienda o Teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-rose-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw size={28} className="animate-spin mx-auto text-rose-600" />
            <p className="text-xs font-bold">Cargando registros de demanda insatisfecha...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <PackageX size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No hay registros de demanda perdida</p>
            <p className="text-xs text-slate-400">Los estantes físicos de los comercios cuentan con inventario óptimo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Fecha y Hora</th>
                  <th className="p-3.5">Producto Solicitado</th>
                  <th className="p-3.5">Variante / Opción</th>
                  <th className="p-3.5">Tienda en Falta</th>
                  <th className="p-3.5">Contacto Interesado</th>
                  <th className="p-3.5 text-center">Motivo Registrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                      {l.created_at ? new Date(l.created_at).toLocaleString('es-VE') : 'Reciente'}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">
                      {l.product_name || 'Producto No Especificado'}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                        {l.selected_variant || 'Estándar'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium">
                      {l.store_name}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">
                      {l.customer_phone || 'Comprador en app'}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                        {l.reason || 'Agotado (Botón Rojo)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
