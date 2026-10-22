'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Layers,
  CheckCircle2
} from 'lucide-react';

import MasterSidebar from './components/MasterSidebar';
import TabDashboard from './components/TabDashboard';
import TabPayments from './components/TabPayments';
import TabUsers from './components/TabUsers';
import TabLostDemand from './components/TabLostDemand';
import TabCreate from './components/TabCreate';
import TabStores from './components/TabStores';

// Constantes de Seguridad de la Bóveda Master Aura
const DEFAULT_MASTER_KEY = process.env.NEXT_PUBLIC_AURA_MASTER_VAULT_KEY || 'AURA-HQ-2026-CUMANA-MASTER-KEY';
const DEFAULT_MASTER_PIN = process.env.NEXT_PUBLIC_AURA_MASTER_PIN || '882026';
const SESSION_STORAGE_KEY = 'aura_master_vault_session';
const LOCKOUT_STORAGE_KEY = 'aura_master_vault_lockout';
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutos de inactividad

export default function MasterDashboard() {
  const router = useRouter();

  // Estados de Autenticación de Bóveda
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [vaultKeyInput, setVaultKeyInput] = useState<string>('');
  const [vaultPinInput, setVaultPinInput] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // Estados de Navegación y Datos
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(false);

  // Estados para métricas y listas
  const [stats, setStats] = useState({
    stores: 0,
    users: 0,
    mrr: 0,
    totalGMV: 0,
    pendingPaymentsCount: 0,
    pendingPaymentsUSD: 0,
    blockedUsersCount: 0,
  });
  const [storesList, setStoresList] = useState<any[]>([]);
  const [profilesList, setProfilesList] = useState<any[]>([]);
  const [plansList, setPlansList] = useState<any[]>([]);

  // Formulario de Tienda Nueva
  const [formData, setFormData] = useState({
    store_name: '',
    slug: '',
    owner_whatsapp: '',
    description: '',
    aura_plan_id: '',
    special_plan: '',
    logo_url: '',
    banner_url: '',
    owner_mode: 'existing',
    existing_owner_id: '',
    owner_full_name: '',
    owner_email: '',
    owner_password: '',
    owner_phone: '',
  });

  // Temporizador de inactividad
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (isAuthenticated) {
      inactivityTimerRef.current = setTimeout(() => {
        handleLockVault('Sesión cerrada automáticamente por inactividad de 20 minutos.');
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleUserActivity = () => resetInactivityTimer();
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  // Verificar sesión existente en sessionStorage
  useEffect(() => {
    try {
      // Verificar lockout previo
      const storedLockout = localStorage.getItem(LOCKOUT_STORAGE_KEY);
      if (storedLockout) {
        const lockoutTime = Number(storedLockout);
        const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
        if (remaining > 0) {
          setIsLockedOut(true);
          setLockoutSeconds(remaining);
        } else {
          localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        }
      }

      // Verificar token en sessionStorage
      const session = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed?.authenticated && parsed.expiresAt > Date.now()) {
          setIsAuthenticated(true);
        } else {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch {
      // Ignorar errores de parsing
    } finally {
      setAuthChecking(false);
    }
  }, []);

  // Contador de bloqueo anti-fuerza bruta
  useEffect(() => {
    if (lockoutSeconds <= 0) {
      setIsLockedOut(false);
      return;
    }
    const timer = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          localStorage.removeItem(LOCKOUT_STORAGE_KEY);
          setIsLockedOut(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Manejar autenticación en la Bóveda
  const handleVaultUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    setAuthError('');
    const cleanKey = vaultKeyInput.trim();
    const cleanPin = vaultPinInput.trim();

    if (cleanKey === DEFAULT_MASTER_KEY && cleanPin === DEFAULT_MASTER_PIN) {
      // Éxito: Crear sesión efímera válida por 8 horas
      const sessionData = {
        authenticated: true,
        unlockedAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      setIsAuthenticated(true);
      setFailedAttempts(0);
      setVaultKeyInput('');
      setVaultPinInput('');
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= 3) {
        // Bloquear por 5 minutos
        const lockoutUntil = Date.now() + 5 * 60 * 1000;
        localStorage.setItem(LOCKOUT_STORAGE_KEY, lockoutUntil.toString());
        setIsLockedOut(true);
        setLockoutSeconds(300);
        setAuthError('Demasiados intentos fallidos. Terminal bloqueada por 5 minutos para proteger la plataforma.');
      } else {
        setAuthError(`Credenciales incorrectas. Intentos restantes: ${3 - nextAttempts}`);
      }
    }
  };

  // Bloquear bóveda
  const handleLockVault = (reason?: string) => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setIsAuthenticated(false);
    if (reason) setAuthError(reason);
  };

  // Carga de datos del Dashboard
  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Tiendas
      const { count: sCount, data: storesData } = await supabase
        .from('stores')
        .select('*, aura_plans(price)', { count: 'exact' })
        .order('created_at', { ascending: false });

      // 2. Perfiles de Usuarios
      const { count: uCount, data: profilesData } = await supabase
        .from('profiles')
        .select('*, stores(name)', { count: 'exact' })
        .order('created_at', { ascending: false });

      // 3. Planes
      const { data: plansData } = await supabase
        .from('aura_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      // 4. Reservaciones para cálculo de comisiones e ingresos
      const { data: reservationsData } = await supabase
        .from('reservations')
        .select('*');

      // Cálculo de MRR e Ingresos Directos
      const subscriptionRevenue = storesData?.reduce((acc, store) => {
        const price = store.aura_plans?.price || 0;
        return acc + Number(price);
      }, 0) || 0;

      let auraFeesUSD = 0;
      let pendingFeesCount = 0;
      let pendingFeesUSD = 0;
      let totalGMV = 0;

      if (reservationsData) {
        reservationsData.forEach((r: any) => {
          const price = Number(r.price_usd || 0);
          totalGMV += price;

          const fee = Number(r.unlock_fee_usd) || (price > 0 ? Number((price * 0.05).toFixed(2)) : 0);

          if (r.aura_fee_status === 'approved' || r.status === 'completed' || r.status === 'entregada') {
            auraFeesUSD += fee;
          } else if (r.aura_fee_status === 'pending' || r.payment_type?.includes('apartado')) {
            pendingFeesCount += 1;
            pendingFeesUSD += fee;
          }
        });
      }

      const blockedUsers = profilesData?.filter((u: any) => Boolean(u.is_blocked)).length || 0;

      setStats({
        stores: sCount || 0,
        users: uCount || 0,
        mrr: Number((subscriptionRevenue + auraFeesUSD).toFixed(2)),
        totalGMV: Number(totalGMV.toFixed(2)),
        pendingPaymentsCount: pendingFeesCount,
        pendingPaymentsUSD: Number(pendingFeesUSD.toFixed(2)),
        blockedUsersCount: blockedUsers,
      });

      if (storesData) setStoresList(storesData);
      if (profilesData) setProfilesList(profilesData);
      if (plansData) setPlansList(plansData);
    } catch (err) {
      console.warn('Error loading master dashboard data:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, isAuthenticated, activeTab]);

  // Crear tienda
  const handleCreateEverything = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalOwnerId = formData.existing_owner_id;

      if (formData.owner_mode === 'new') {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.owner_email,
          password: formData.owner_password,
          options: {
            data: {
              full_name: formData.owner_full_name,
              phone: formData.owner_phone,
              role: 'owner',
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('No se pudo crear el usuario administrador.');
        finalOwnerId = authData.user.id;
      } else {
        if (!finalOwnerId) throw new Error('Debes seleccionar un dueño existente para la tienda.');
      }

      const { error: storeError } = await supabase
        .from('stores')
        .insert([{
          name: formData.store_name,
          slug: formData.slug,
          owner_whatsapp: Number(formData.owner_whatsapp),
          description: formData.description,
          aura_plan_id: formData.aura_plan_id || null,
          special_plan: formData.special_plan ? Number(formData.special_plan) : null,
          logo_url: formData.logo_url || null,
          banner_url: formData.banner_url || null,
          owner_id: finalOwnerId,
        }]);

      if (storeError) throw storeError;

      alert(`Éxito: Tienda "${formData.store_name}" registrada y vinculada correctamente.`);
      setFormData({
        store_name: '', slug: '', owner_whatsapp: '', description: '', aura_plan_id: '', special_plan: '', logo_url: '', banner_url: '',
        owner_mode: 'existing', existing_owner_id: '', owner_full_name: '', owner_email: '', owner_password: '', owner_phone: ''
      });
      setActiveTab('stores');
    } catch (error: any) {
      alert('Error en el proceso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. CARGA INICIAL
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-widest uppercase">Verificando Credenciales de Bóveda...</span>
        </div>
      </div>
    );
  }

  // 2. PUERTA DE ACCESO DE SEGURIDAD (VAULT GATE - SIN CORREO)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#030812] to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Luces y Efectos de Fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
          {/* Insignia de Bóveda */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-[#00ffb2] mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(0,255,178,0.25)]">
              <Shield size={32} />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              Aura Central Operations
            </h1>
            <p className="text-xs text-slate-400">
              Terminal de Control Ejecutivo y Bóveda de Liquidación
            </p>
          </div>

          {/* Advertencia de Seguridad */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <KeyRound size={13} />
              <span>Acceso de Alta Seguridad (Non-Email Gate)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Esta consola no utiliza autenticación por correo electrónico para prevenir ataques de phishing y toma de bandejas. Requiere la Llave Maestra Criptográfica y el PIN de Bóveda de 6 Dígitos.
            </p>
          </div>

          {/* Formulario de Desbloqueo */}
          <form onSubmit={handleVaultUnlock} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2 animate-shake">
                <AlertTriangle size={16} className="text-red-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Llave Maestra */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Llave Criptográfica HQ (Master Vault Key)
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  disabled={isLockedOut}
                  required
                  placeholder="AURA-HQ-2026-..."
                  value={vaultKeyInput}
                  onChange={e => setVaultKeyInput(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* PIN de Bóveda */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                PIN de Bóveda de 6 Dígitos (Executive PIN)
              </label>
              <input
                type="password"
                maxLength={6}
                disabled={isLockedOut}
                required
                placeholder="••••••"
                value={vaultPinInput}
                onChange={e => setVaultPinInput(e.target.value.replace(/\D/g, ''))}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-lg tracking-[0.5em] text-white placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono disabled:opacity-50"
              />
            </div>

            {/* Botón de Entrada */}
            <button
              type="submit"
              disabled={isLockedOut || !vaultKeyInput || vaultPinInput.length !== 6}
              className="w-full cursor-pointer py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLockedOut ? (
                <>
                  <Clock size={16} />
                  <span>Bloqueado ({lockoutSeconds}s)</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Desbloquear Bóveda Central</span>
                </>
              )}
            </button>
          </form>

          {/* Indicación para administradores */}
          <div className="text-center pt-2 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-500">
              Protección anti-intrusión activa • Cierre automático tras 20m de inactividad
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. DASHBOARD MASTER DESBLOQUEADO
  return (
    <div className="min-h-screen bg-slate-100 flex">
      <MasterSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleLogout={() => handleLockVault('Sesión cerrada correctamente.')}
        pendingPaymentsCount={stats.pendingPaymentsCount}
      />

      <main className="flex-1 p-6 lg:p-8 w-full overflow-y-auto">
        {activeTab === 'dashboard' && (
          <TabDashboard stats={stats} onNavigateTab={setActiveTab} />
        )}

        {activeTab === 'payments' && (
          <TabPayments />
        )}

        {activeTab === 'users' && (
          <TabUsers profilesList={profilesList} onRefresh={fetchDashboardData} />
        )}

        {activeTab === 'lost-demand' && (
          <TabLostDemand />
        )}

        {activeTab === 'create' && (
          <TabCreate
            formData={formData}
            setFormData={setFormData}
            handleCreateEverything={handleCreateEverything}
            loading={loading}
            plansList={plansList}
            profilesList={profilesList}
          />
        )}

        {activeTab === 'stores' && <TabStores storesList={storesList} />}
      </main>
    </div>
  );
}
