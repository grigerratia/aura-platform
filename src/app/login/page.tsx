'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Lock, Mail, Loader2, Store, Sparkles,
  ArrowRight, AlertCircle, Eye, EyeOff, User,
  CheckCircle2, ShieldCheck
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Si ya tiene sesión activa, redirigir inteligentemente
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      if (redirectUrl) {
        router.push(redirectUrl);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, store_id')
        .eq('id', user.id)
        .maybeSingle();

      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      if (profile?.role === 'admin') {
        router.push('/master');
      } else if (profile?.role === 'owner' || store?.id || profile?.store_id) {
        router.push('/negocios/dashboard');
      } else {
        router.push('/');
      }
    });
  }, [router, redirectUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Correo o contraseña incorrectos. Verifica tus datos.');
        }
        if (error.message.toLowerCase().includes('email not confirmed')) {
          throw new Error('Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o spam.');
        }
        throw error;
      }

      if (!data.user) throw new Error('No se pudo iniciar sesión.');

      // Si había una URL de redirección previa (ej. checkout o producto)
      if (redirectUrl) {
        router.push(redirectUrl);
        return;
      }

      // Consultamos rol para redirigir al panel correspondiente
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, store_id')
        .eq('id', data.user.id)
        .maybeSingle();

      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', data.user.id)
        .limit(1)
        .maybeSingle();

      if (profile?.role === 'admin') {
        router.push('/master');
      } else if (profile?.role === 'owner' || store?.id || profile?.store_id) {
        router.push('/negocios/dashboard');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between">
      {/* HEADER */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-md group-hover:scale-105 transition-transform">
              A
            </div>
            <div>
              <span className="font-black tracking-tight text-white text-lg">AURA</span>
              <span className="ml-1.5 text-[10px] font-bold text-teal-400 uppercase bg-teal-950 border border-teal-800 px-2 py-0.5 rounded-full">
                Cumaná
              </span>
            </div>
          </Link>

          <Link
            href="/registro"
            className="text-xs font-bold text-teal-400 hover:text-teal-300 transition flex items-center gap-1.5"
          >
            <span>Crear cuenta gratis</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 md:py-14 flex flex-col md:flex-row items-center gap-8 md:gap-12 flex-1">
        
        {/* COLUMNA IZQUIERDA: MENSAJE DE MARCA */}
        <div className="flex-1 space-y-5 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold">
            <Sparkles size={14} className="text-teal-400" />
            <span>Acceso Inteligente a Comercios de Cumaná</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Ingresa a tu cuenta en <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400">Aura</span>
          </h1>

          <p className="text-slate-400 text-sm leading-relaxed max-w-md">
            Gestiona tus reservas de 3 horas, consulta tu saldo de Billetera con Candado de Confianza y accede a ofertas exclusivas en tiendas locales.
          </p>

          <div className="space-y-3 pt-2 text-xs text-slate-300 max-w-md">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
              <span>Reserva y congela stock real sin intermediarios bancarios.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
              <span>Billetera de Saldo a Favor protegida si el producto no te sirve.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
              <span>Cazador de últimas tallas y liquidaciones del comercio físico.</span>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-xl font-black text-white">Iniciar Sesión</h2>
            <p className="text-xs text-slate-400 mt-1">
              Ingresa con el correo y contraseña registrados
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in duration-200">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-slate-500" size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-slate-500" size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu clave secreta"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-slate-950 font-black py-3.5 px-4 rounded-xl text-sm transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Entrar a Aura</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* ACCESOS DIRECTOS */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-3">
            <div className="text-center">
              <span className="text-xs text-slate-400">¿Aún no tienes cuenta? </span>
              <Link
                href="/registro"
                className="text-xs font-bold text-teal-400 hover:text-teal-300 underline underline-offset-2 ml-1"
              >
                Regístrate gratis
              </Link>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Store size={18} className="text-indigo-400 shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold text-white">¿Eres comerciante?</div>
                  <div className="text-[11px] text-slate-400">Portal exclusivo de tiendas</div>
                </div>
              </div>
              <Link
                href="/negocios"
                className="text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition"
              >
                Acceder
              </Link>
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-600">
        Aura Commerce Cumaná &copy; {new Date().getFullYear()} — Plataforma de Conexión Local y Reserva Rápida.
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020508] flex items-center justify-center">
          <Loader2 className="animate-spin text-[#00ffb2]" size={32} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}