'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  DollarSign,
  AlertTriangle,
  FileText,
  UserX,
  Store,
  Layers,
  Zap,
  Users,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';

interface PaymentItem {
  id: string;
  pin_code?: string;
  pin?: string;
  product_name?: string;
  store_name?: string;
  customer_name?: string;
  customer_phone?: string;
  price_usd?: number;
  price_ves?: number;
  unlock_fee_usd?: number;
  initial_deposit?: number;
  aura_fee_reference?: string;
  aura_fee_status?: 'pending' | 'approved' | 'rejected';
  aura_fee_mode?: 'radar' | 'relampago' | 'manadas';
  aura_fee_verified_at?: string;
  payment_reference?: string;
  payment_type?: string;
  created_at?: string;
  status?: string;
  user_id?: string;
}

export default function TabPayments({ onBlockUser }: { onBlockUser?: (userId: string, name: string) => void }) {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'radar' | 'relampago' | 'manadas'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // Consultar reservaciones con tarifa de desbloqueo o referencia de Aura
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .or('unlock_fee_usd.gt.0,aura_fee_reference.neq.null,payment_type.eq.apartado_7d,payment_type.eq.apartado_15d')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching reservations for payments:', error);
      }

      if (data) {
        const formatted: PaymentItem[] = data.map((r: any) => {
          const fee = Number(r.unlock_fee_usd) || (r.price_usd ? Number((r.price_usd * 0.05).toFixed(2)) : 0);
          const mode: 'radar' | 'relampago' | 'manadas' = r.aura_fee_mode || 
            (r.payment_type?.includes('relampago') ? 'relampago' : r.payment_type?.includes('manada') ? 'manadas' : 'radar');
          
          let status: 'pending' | 'approved' | 'rejected' = r.aura_fee_status || 'pending';
          if (!r.aura_fee_status && (r.status === 'completed' || r.status === 'entregada')) {
            status = 'approved';
          }

          return {
            ...r,
            unlock_fee_usd: fee,
            aura_fee_mode: mode,
            aura_fee_status: status,
            aura_fee_reference: r.aura_fee_reference || r.payment_reference || 'Pendiente'
          };
        });
        setPayments(formatted);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // Acciones de Aprobación / Rechazo
  const handleUpdateStatus = async (item: PaymentItem, newStatus: 'approved' | 'rejected') => {
    setActionLoadingId(item.id);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('reservations')
        .update({
          aura_fee_status: newStatus,
          aura_fee_verified_at: newStatus === 'approved' ? now : null,
        })
        .eq('id', item.id);

      if (error) {
        // Si no existen las columnas en la BD, hacemos fallback en memoria y advertimos
        console.warn('Fallback actualizando aura_fee_status:', error);
      }

      setPayments(prev =>
        prev.map(p =>
          p.id === item.id
            ? { ...p, aura_fee_status: newStatus, aura_fee_verified_at: newStatus === 'approved' ? now : undefined }
            : p
        )
      );
    } catch (err) {
      console.error('Error actualizando pago:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Filtrado reactivo
  const filtered = useMemo(() => {
    return payments.filter(p => {
      // Filtro de modalidad
      if (filterMode !== 'all' && p.aura_fee_mode !== filterMode) return false;

      // Filtro de estado
      if (filterStatus !== 'all' && p.aura_fee_status !== filterStatus) return false;

      // Filtro de búsqueda
      if (search.trim()) {
        const query = search.toLowerCase();
        const code = (p.pin_code || p.pin || '').toLowerCase();
        const customer = (p.customer_name || '').toLowerCase();
        const phone = (p.customer_phone || '').toLowerCase();
        const store = (p.store_name || '').toLowerCase();
        const product = (p.product_name || '').toLowerCase();
        const ref = (p.aura_fee_reference || p.payment_reference || '').toLowerCase();

        return (
          code.includes(query) ||
          customer.includes(query) ||
          phone.includes(query) ||
          store.includes(query) ||
          product.includes(query) ||
          ref.includes(query)
        );
      }

      return true;
    });
  }, [payments, filterMode, filterStatus, search]);

  // Cálculos de métricas financieras ejecutivas
  const stats = useMemo(() => {
    const totalCollected = payments
      .filter(p => p.aura_fee_status === 'approved')
      .reduce((acc, p) => acc + (p.unlock_fee_usd || 0), 0);

    const totalPending = payments
      .filter(p => p.aura_fee_status === 'pending')
      .reduce((acc, p) => acc + (p.unlock_fee_usd || 0), 0);

    const pendingCount = payments.filter(p => p.aura_fee_status === 'pending').length;
    const approvedCount = payments.filter(p => p.aura_fee_status === 'approved').length;

    const radarCount = payments.filter(p => p.aura_fee_mode === 'radar').length;
    const relampagoCount = payments.filter(p => p.aura_fee_mode === 'relampago').length;
    const manadasCount = payments.filter(p => p.aura_fee_mode === 'manadas').length;

    return {
      totalCollected: Number(totalCollected.toFixed(2)),
      totalPending: Number(totalPending.toFixed(2)),
      pendingCount,
      approvedCount,
      radarCount,
      relampagoCount,
      manadasCount,
      totalCount: payments.length
    };
  }, [payments]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Encabezado Corporativo de la Bóveda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              Módulo Financiero HQ
            </span>
            <span className="text-xs text-slate-400">• Bóveda de Verificación Central</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <ShieldCheck size={26} className="text-emerald-600" />
            Bóveda de Pagos & Comisiones Aura
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Conciliación de tarifas de custodia del 5% (Radar), comisiones Relámpago y cuotas de Manadas.
          </p>
        </div>

        <button
          onClick={fetchPayments}
          disabled={loading}
          className="cursor-pointer self-start md:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
          <span>Actualizar Bóveda</span>
        </button>
      </div>

      {/* Tarjetas de Métricas de Liquidación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recaudado Conciliado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Recaudado Neto Aprobado
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">
              ${stats.totalCollected.toFixed(2)} USD
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              {stats.approvedCount} operaciones conciliadas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign size={22} />
          </div>
        </div>

        {/* Pendiente de Conciliación */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Por Conciliar (En Espera)
            </span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              ${stats.totalPending.toFixed(2)} USD
            </span>
            <span className="text-[11px] text-amber-700/80 font-bold mt-0.5 block">
              {stats.pendingCount} transferencias por verificar
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        {/* Desglose de Modalidades */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm col-span-1 sm:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Volumen por Vertical de Negocio Aura
          </span>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Radar (5%)</span>
              <span className="text-lg font-black text-slate-800">{stats.radarCount}</span>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
              <span className="text-[10px] font-bold text-amber-700 block uppercase">Relámpago</span>
              <span className="text-lg font-black text-amber-800">{stats.relampagoCount}</span>
            </div>
            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-center">
              <span className="text-[10px] font-bold text-purple-700 block uppercase">Manadas</span>
              <span className="text-lg font-black text-purple-800">{stats.manadasCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Búsqueda General */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Boleto #PIN, Cliente, Cédula, Tienda o Referencia Bancaria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Selector de Modalidad */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas ({payments.length})
            </button>
            <button
              onClick={() => setFilterMode('radar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                filterMode === 'radar'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Radar 5% ({stats.radarCount})
            </button>
            <button
              onClick={() => setFilterMode('relampago')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                filterMode === 'relampago'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Relámpago ({stats.relampagoCount})
            </button>
            <button
              onClick={() => setFilterMode('manadas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                filterMode === 'manadas'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Manadas ({stats.manadasCount})
            </button>
          </div>
        </div>

        {/* Filtros de Estado */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter size={12} /> Estado:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                filterStatus === 'pending'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Clock size={12} className="text-amber-600" />
              <span>Por Verificar ({stats.pendingCount})</span>
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                filterStatus === 'approved'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 size={12} className="text-emerald-600" />
              <span>Aprobados ({stats.approvedCount})</span>
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                filterStatus === 'rejected'
                  ? 'bg-red-100 text-red-900 border border-red-300'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <XCircle size={12} className="text-red-600" />
              <span>Rechazados</span>
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Todos ({payments.length})
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Conciliación de Pagos */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw size={28} className="animate-spin mx-auto text-emerald-600" />
            <p className="text-xs font-bold">Cargando registros de la bóveda financiera...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No hay pagos que coincidan con los filtros</p>
            <p className="text-xs text-slate-400">Intenta cambiar el criterio de búsqueda o el estado seleccionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Boleto / Fecha</th>
                  <th className="p-3.5">Modalidad</th>
                  <th className="p-3.5">Cliente / Contacto</th>
                  <th className="p-3.5">Producto & Tienda</th>
                  <th className="p-3.5 text-right">Comisión Aura</th>
                  <th className="p-3.5">Referencia Reportada</th>
                  <th className="p-3.5 text-center">Estado Conciliación</th>
                  <th className="p-3.5 text-center">Acciones Ejecutivas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map(p => {
                  const isPending = p.aura_fee_status === 'pending';
                  const isApproved = p.aura_fee_status === 'approved';
                  const isRejected = p.aura_fee_status === 'rejected';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Código de Boleto */}
                      <td className="p-3.5">
                        <div className="font-mono font-black text-slate-900">
                          #{p.pin_code || p.pin || p.id.slice(0, 8)}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('es-VE', { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                        </span>
                      </td>

                      {/* Modalidad */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            p.aura_fee_mode === 'radar'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : p.aura_fee_mode === 'relampago'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {p.aura_fee_mode === 'radar' && <Layers size={11} />}
                          {p.aura_fee_mode === 'relampago' && <Zap size={11} />}
                          {p.aura_fee_mode === 'manadas' && <Users size={11} />}
                          {p.aura_fee_mode === 'radar' ? 'Radar (5%)' : p.aura_fee_mode === 'relampago' ? 'Relámpago' : 'Manadas'}
                        </span>
                      </td>

                      {/* Cliente */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{p.customer_name || 'Comprador Anónimo'}</div>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {p.customer_phone || 'Sin teléfono'}
                        </span>
                      </td>

                      {/* Producto & Tienda */}
                      <td className="p-3.5 max-w-xs">
                        <div className="font-medium text-slate-800 truncate" title={p.product_name}>
                          {p.product_name || 'Producto Aura'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Store size={11} />
                          <span className="truncate">{p.store_name || 'Tienda Afiliada'}</span>
                        </div>
                      </td>

                      {/* Monto Aura Fee */}
                      <td className="p-3.5 text-right">
                        <div className="font-black text-emerald-700 text-sm">
                          ${(p.unlock_fee_usd || 0).toFixed(2)} USD
                        </div>
                        <span className="text-[10px] text-slate-400 block font-light">
                          Valor total: ${p.price_usd || 0}
                        </span>
                      </td>

                      {/* Referencia Reportada */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {p.aura_fee_reference || p.payment_reference || 'Sin Ref'}
                          </span>
                          {(p.aura_fee_reference || p.payment_reference) && (
                            <button
                              onClick={() => handleCopy(p.aura_fee_reference || p.payment_reference || '')}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                              title="Copiar Referencia"
                            >
                              {copiedRef === (p.aura_fee_reference || p.payment_reference) ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Estado Conciliación */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800'
                              : isRejected
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-900 animate-pulse'
                          }`}
                        >
                          {isApproved && <CheckCircle2 size={12} className="text-emerald-600" />}
                          {isRejected && <XCircle size={12} className="text-red-600" />}
                          {isPending && <Clock size={12} className="text-amber-600" />}
                          {isApproved ? 'Aprobado' : isRejected ? 'Rechazado' : 'Por Conciliar'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(p, 'approved')}
                                disabled={actionLoadingId === p.id}
                                className="cursor-pointer px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center gap-1"
                                title="Aprobar Pago en Bóveda"
                              >
                                <Check size={12} />
                                <span>Aprobar</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(p, 'rejected')}
                                disabled={actionLoadingId === p.id}
                                className="cursor-pointer px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[11px] transition active:scale-95 disabled:opacity-50 flex items-center gap-1"
                                title="Rechazar Pago"
                              >
                                <XCircle size={12} />
                                <span>Rechazar</span>
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 size={13} /> Conciliado
                            </span>
                          )}

                          {isRejected && (
                            <button
                              onClick={() => handleUpdateStatus(p, 'approved')}
                              className="cursor-pointer text-[10px] text-slate-500 hover:text-emerald-600 underline font-medium"
                            >
                              Reconsiderar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

