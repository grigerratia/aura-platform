'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  Wallet,
  Star,
  RefreshCw,
  Phone,
  CreditCard,
  Check,
  X,
  UserX,
  UserCheck,
  ExternalLink,
  Crown
} from 'lucide-react';

interface UserProfile {
  id: string;
  full_name?: string;
  id_doc?: string;
  phone?: string;
  role?: string;
  trust_score?: number;
  wallet_credit_usd?: number;
  is_blocked?: boolean;
  block_reason?: string;
  blocked_at?: string;
  is_vip?: boolean;
  created_at?: string;
  stores?: { name: string } | null;
}

const PRESET_BLOCK_REASONS = [
  'Incumplimiento de apartado de 7 días (no liquidó el 70% restante ni retiró el producto)',
  'Comprobante de Pago Móvil falso o transferencia bancaria no acreditada',
  'Inasistencia reiterada a reservas confirmadas con congelamiento de stock',
  'Comportamiento fraudulento o sospecha de suplantación de identidad',
  'Solicitud directa del comercio por impago en mostrador',
];

export default function TabUsers({ profilesList = [], onRefresh }: { profilesList?: any[]; onRefresh?: () => void }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'blocked'>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'client' | 'owner'>('all');

  // Modal de Bloqueo
  const [blockingUser, setBlockingUser] = useState<UserProfile | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_BLOCK_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  // Cargar usuarios frescos de Supabase
  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, stores(name)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching profiles in TabUsers:', error);
      }
      if (data) {
        setUsers(data);
      } else if (profilesList.length > 0) {
        setUsers(profilesList);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Bloquear usuario
  const handleConfirmBlock = async () => {
    if (!blockingUser) return;
    setIsSubmittingBlock(true);

    const reason = customReason.trim() ? customReason.trim() : selectedReason;
    const now = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: true,
          block_reason: reason,
          blocked_at: now,
        })
        .eq('id', blockingUser.id);

      if (error) {
        console.warn('Error actualizando perfil en Supabase:', error);
      }

      setUsers(prev =>
        prev.map(u =>
          u.id === blockingUser.id
            ? { ...u, is_blocked: true, block_reason: reason, blocked_at: now }
            : u
        )
      );

      setBlockingUser(null);
      setCustomReason('');
    } catch (err) {
      console.error('Error bloqueando usuario:', err);
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  // Desbloquear usuario
  const handleUnblockUser = async (user: UserProfile) => {
    if (!confirm(`¿Estás seguro de reactivar la cuenta de ${user.full_name || 'este usuario'}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: false,
          block_reason: null,
          blocked_at: null,
        })
        .eq('id', user.id);

      if (error) {
        console.warn('Error desbloqueando perfil:', error);
      }

      setUsers(prev =>
        prev.map(u =>
          u.id === user.id
            ? { ...u, is_blocked: false, block_reason: undefined, blocked_at: undefined }
            : u
        )
      );
    } catch (err) {
      console.error('Error desbloqueando usuario:', err);
    }
  };

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Filtro de bloqueo
      if (filterStatus === 'active' && u.is_blocked) return false;
      if (filterStatus === 'blocked' && !u.is_blocked) return false;

      // Filtro de rol
      if (filterRole === 'client' && u.role === 'owner') return false;
      if (filterRole === 'owner' && u.role !== 'owner') return false;

      // Búsqueda
      if (search.trim()) {
        const query = search.toLowerCase();
        const name = (u.full_name || '').toLowerCase();
        const cedula = (u.id_doc || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        const store = (u.stores?.name || '').toLowerCase();

        return (
          name.includes(query) ||
          cedula.includes(query) ||
          phone.includes(query) ||
          store.includes(query)
        );
      }

      return true;
    });
  }, [users, filterStatus, filterRole, search]);

  // Métricas del Directorio de Clientes
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const blockedCount = users.filter(u => u.is_blocked).length;
    const activeCount = totalUsers - blockedCount;
    const totalWallet = users.reduce((acc, u) => acc + (Number(u.wallet_credit_usd) || 0), 0);
    const highTrustCount = users.filter(u => (u.trust_score ?? 100) >= 80).length;

    return {
      totalUsers,
      blockedCount,
      activeCount,
      totalWallet: Number(totalWallet.toFixed(2)),
      highTrustCount,
    };
  }, [users]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Encabezado Corporativo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
              Control de Riesgo & Reputación
            </span>
            <span className="text-xs text-slate-400">• Dirección de Cumplimiento HQ</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Users size={26} className="text-blue-600" />
            Gestión Integral de Usuarios y Control de Impago
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitorea el Score de Confianza, cédulas venezolanas, saldo en billetera y suspende usuarios por mora en apartados.
          </p>
        </div>

        <button
          onClick={loadUsers}
          disabled={loading}
          className="cursor-pointer self-start md:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
          <span>Refrescar Directorio</span>
        </button>
      </div>

      {/* Tarjetas de Métricas de Riesgo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Usuarios */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Directorio Total
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {stats.totalUsers}
            </span>
            <span className="text-[11px] text-emerald-600 font-bold mt-0.5 block">
              {stats.activeCount} Cuentas Habilitadas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={22} />
          </div>
        </div>

        {/* Cuentas Bloqueadas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Sancionados por Impago
            </span>
            <span className="text-2xl font-black text-red-600 mt-1 block">
              {stats.blockedCount}
            </span>
            <span className="text-[11px] text-red-700/80 font-bold mt-0.5 block">
              {stats.totalUsers > 0 ? ((stats.blockedCount / stats.totalUsers) * 100).toFixed(1) : 0}% índice de mora
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <ShieldAlert size={22} />
          </div>
        </div>

        {/* Clientes Alta Confianza */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Score Óptimo (80+ Pts)
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">
              {stats.highTrustCount}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Cumplimiento impecable
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Star size={22} />
          </div>
        </div>

        {/* Saldo en Billetera Aura */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Custodia en Billeteras
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              ${stats.totalWallet.toFixed(2)} USD
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Saldo a favor de usuarios
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Wallet size={22} />
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Campo de búsqueda */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Nombre, Cédula (V-...), Teléfono o Tienda..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Filtro de Estado de Cuenta */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({users.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                filterStatus === 'active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Activos ({stats.activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('blocked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                filterStatus === 'blocked'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Bloqueados por Impago ({stats.blockedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw size={28} className="animate-spin mx-auto text-blue-600" />
            <p className="text-xs font-bold">Consultando registros de usuarios en Aura Central...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No se encontraron usuarios</p>
            <p className="text-xs text-slate-400">Verifica el término de búsqueda o limpia los filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Usuario / Identidad</th>
                  <th className="p-3.5">Cédula (V / E)</th>
                  <th className="p-3.5">WhatsApp / Contacto</th>
                  <th className="p-3.5 text-center">Trust Score</th>
                  <th className="p-3.5 text-right">Saldo Billetera</th>
                  <th className="p-3.5 text-center">Estado de Riesgo</th>
                  <th className="p-3.5 text-center">Acciones de Seguridad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map(u => {
                  const trustScore = u.trust_score ?? 100;
                  const isBlocked = Boolean(u.is_blocked);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Usuario */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-900">
                            {u.full_name || 'Sin Nombre Registrado'}
                          </div>
                          {u.is_vip && (
                            <span className="p-0.5 rounded bg-amber-100 text-amber-700" title="Membresía VIP">
                              <Crown size={12} />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          ID: {u.id.slice(0, 12)}...
                        </span>
                        {u.stores?.name && (
                          <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
                            Afiliado: {u.stores.name}
                          </span>
                        )}
                      </td>

                      {/* Cédula */}
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {u.id_doc || 'No Registrada'}
                        </span>
                      </td>

                      {/* Teléfono */}
                      <td className="p-3.5">
                        <div className="font-mono text-slate-700 flex items-center gap-1">
                          <Phone size={12} className="text-slate-400" />
                          <span>{u.phone || 'Sin número'}</span>
                        </div>
                      </td>

                      {/* Trust Score */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1 font-black">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] ${
                              trustScore >= 80
                                ? 'bg-emerald-100 text-emerald-800'
                                : trustScore >= 50
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {trustScore} pts
                          </span>
                        </div>
                      </td>

                      {/* Saldo en Billetera */}
                      <td className="p-3.5 text-right font-black text-slate-800">
                        ${(Number(u.wallet_credit_usd) || 0).toFixed(2)} USD
                      </td>

                      {/* Estado de Riesgo */}
                      <td className="p-3.5 text-center">
                        {isBlocked ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                              <Lock size={10} />
                              Bloqueado
                            </span>
                            {u.block_reason && (
                              <span className="text-[10px] text-red-700/80 max-w-[150px] truncate mt-0.5" title={u.block_reason}>
                                {u.block_reason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <ShieldCheck size={10} />
                            Habilitado
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="p-3.5 text-center">
                        {isBlocked ? (
                          <button
                            onClick={() => handleUnblockUser(u)}
                            className="cursor-pointer px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition active:scale-95 inline-flex items-center gap-1"
                          >
                            <Unlock size={12} />
                            <span>Desbloquear</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setBlockingUser(u);
                              setSelectedReason(PRESET_BLOCK_REASONS[0]);
                              setCustomReason('');
                            }}
                            className="cursor-pointer px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[11px] transition active:scale-95 inline-flex items-center gap-1"
                          >
                            <Lock size={12} />
                            <span>Bloquear por Impago</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Bloqueo por Impago */}
      {blockingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Bloquear Cuenta por Impago / Mora
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sanción ejecutiva para {blockingUser.full_name || 'este usuario'}.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setBlockingUser(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <div className="flex items-center gap-1 font-bold">
                <AlertTriangle size={14} className="text-red-600 shrink-0" />
                <span>Efectos de la sanción en la plataforma:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-red-700">
                <li>El usuario no podrá solicitar verificación de stock en Radar.</li>
                <li>Se bloquearán nuevas reservas o tickets digitales de 3 horas.</li>
                <li>No podrá realizar apartados de 7 o 15 días en ningún comercio afiliado.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Selecciona el Motivo de la Sanción:
              </label>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {PRESET_BLOCK_REASONS.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedReason(r);
                      setCustomReason('');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                      selectedReason === r && !customReason
                        ? 'bg-red-50 border-red-400 text-red-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  O escribe un motivo personalizado:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Incumplimiento reiterado de pagos en tienda física..."
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-red-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBlockingUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingBlock}
                onClick={handleConfirmBlock}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                {isSubmittingBlock ? 'Aplicando Sanción...' : 'Confirmar Bloqueo por Impago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
