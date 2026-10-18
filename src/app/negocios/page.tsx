'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock, Mail, Loader2, Store, Sparkles,
  ArrowRight, CheckCircle2, AlertCircle, HelpCircle,
  TrendingUp, ShieldCheck, Clock
} from 'lucide-react';

export default function OwnerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailConfirmHelp, setEmailConfirmHelp] = useState(false);

  // Detección automática si el usuario ya tiene sesión iniciada en el navegador
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, store_id')
        .eq('id', user.id)
        .maybeSingle();

      const { data: userStore } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      if (userStore?.id || profile?.store_id) {
        router.push('/negocios/dashboard');
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setEmailConfirmHelp(false);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (
          authError.message.toLowerCase().includes('email not confirmed') ||
          authError.message.toLowerCase().includes('email_not_confirmed') ||
          authError.message.toLowerCase().includes('confirm')
        ) {
          setEmailConfirmHelp(true);
          throw new Error('Tu correo aún no ha sido confirmado en Supabase.');
        }
        throw authError;
      }

      const user = authData.user;
      if (!user) throw new Error('No se pudo autenticar el usuario.');

      // 1. Consultar rol en profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, store_id')
        .eq('id', user.id)
        .maybeSingle();

      // 2. Si no tiene store_id, consultar en stores por owner_id
      let userStoreId = profile?.store_id;

      if (!userStoreId) {
        const { data: userStore } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle();

        if (userStore) {
          userStoreId = userStore.id;
          await supabase.from('profiles').upsert({
            id: user.id,
            role: 'owner',
            store_id: userStore.id,
            full_name: user.user_metadata?.full_name || 'Comerciante Aura'
          });
        }
      }

      // 3. Si es admin directo, mandarlo al master
      if (profile?.role === 'admin') {
        return router.push('/master');
      }

      // 4. Si tiene tienda vinculada o es owner, entrar al dashboard
      if (userStoreId || profile?.role === 'owner') {
        return router.push('/negocios/dashboard');
      }

      // 5. Si el usuario existe pero no tiene tienda, enviarlo a registrar su nueva tienda
      router.push('/negocios/registro');

    } catch (error: any) {
      setErrorMessage(error.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between">
      
      {/* HEADER SIMPLE */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
              A
            </div>
            <div>
              <span className="font-black tracking-tight text-white text-lg">AURA</span>
              <span className="ml-1.5 text-[10px] font-bold text-teal-400 uppercase bg-teal-950 border border-teal-800 px-2 py-0.5 rounded-full">
                Business Cumaná
              </span>
            </div>
          </Link>

          <Link
            href="/negocios/registro"
            className="text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 rounded-xl transition shadow-md shadow-teal-500/20 flex items-center gap-1.5"
          >
            <span>Afiliar mi Comercio</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-5xl mx-auto w-full px-4 py-8 md:py-16 flex flex-col lg:flex-row items-center gap-10 lg:gap-16 flex-1">
        
        {/* COLUMNA IZQUIERDA: PROPUESTA DE VALOR AURA BUSINESS */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} className="text-teal-400" />
            Vitrinas Físicas &amp; Reservas Inmediatas
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Control de Reservas y Ventas para Comerciantes de Cumaná
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
            Gestiona tu inventario con arquetipos dinámicos (Retail, Comida, Electrodomésticos, Ferretería y Vehículos), valida reservas en 3 horas en caja y conoce la demanda insatisfecha de tu tienda.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-start gap-3">
              <Clock className="text-teal-400 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="font-bold text-xs text-white">Semáforo de 3 Horas</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">El cliente asiste con boleto oficial y QR validable en mostrador.</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="text-teal-400 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="font-bold text-xs text-white">Cobro Directo en Caja</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Acepta Cashea, Punto de Venta, Efectivo $ o Pago Móvil.</p>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: TARJETA DE INICIO DE SESIÓN */}
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
          
          <div className="text-center mb-6">
            <div className="bg-slate-800 border border-slate-700 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Store className="text-teal-400" size={28} />
            </div>
            <h2 className="text-xl font-black text-white">Panel de Comercios</h2>
            <p className="text-slate-400 text-xs mt-1">Ingresa con tu correo y contraseña asignados</p>
          </div>

          {/* ALERTA DE ERROR */}
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-950/60 border border-red-800 rounded-2xl flex items-start gap-3 text-red-200 text-xs">
              <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">{errorMessage}</span>
                {emailConfirmHelp && (
                  <div className="text-[11px] text-amber-300 mt-2 p-2 bg-amber-950/50 rounded-xl border border-amber-800/60">
                    <p className="font-bold flex items-center gap-1">
                      <HelpCircle size={13} /> Solución en Supabase:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 mt-1 text-slate-200">
                      <li>Entra a tu consola de Supabase &gt; <strong>Authentication &gt; Users</strong>.</li>
                      <li>Haz clic en los tres puntos de tu usuario y selecciona <strong>&quot;Confirm email&quot;</strong>.</li>
                      <li>O desactiva <em>&quot;Confirm email&quot;</em> en <strong>Authentication &gt; Providers &gt; Email</strong> para evitar confirmaciones en desarrollo.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                <input
                  type="email"
                  required
                  className="w-full pl-10 p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-sm font-medium"
                  placeholder="dueño@tu-tienda.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-10 p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-sm font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer w-full bg-teal-500 hover:bg-teal-400 text-slate-950 py-4 rounded-xl font-black transition flex justify-center items-center gap-2 shadow-lg shadow-teal-500/20 active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Verificando Credenciales...</span>
                </>
              ) : (
                <>
                  <Store size={18} />
                  <span>Entrar a mi Tienda</span>
                </>
              )}
            </button>
          </form>

          {/* ENLACE DESTACADO PARA AFILIAR COMERCIO */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-2">
            <p className="text-xs text-slate-400">¿Todavía no has registrado tu tienda física?</p>
            <Link
              href="/negocios/registro"
              className="inline-flex items-center gap-1.5 text-xs font-black text-teal-400 hover:text-teal-300 underline underline-offset-4 transition"
            >
              <span>Afiliar mi comercio con 15 días gratis</span>
              <ArrowRight size={13} />
            </Link>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        Aura Cumaná • Panel de Comercios Aliados • Cumaná, Estado Sucre
      </footer>

    </div>
  );
}