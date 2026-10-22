'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Mail, Phone, MapPin, Tag, ShieldCheck, Wallet,
  LogOut, Save, ArrowLeft, CheckCircle2, AlertCircle, Loader2,
  Sparkles, Check, Crown, HelpCircle
} from 'lucide-react';
import Header from '@/components/Header';

const CUMANA_ZONES = [
  'Centro de Cumaná',
  'Av. Bermúdez',
  'C.C. Cumaná Plaza',
  'C.C. Marina Plaza',
  'Av. Perimetral',
  'Av. Gran Mariscal',
  'Av. Cancamure',
  'Tres Picos',
  'Los Chaimas / Cantarrana',
  'El Salado / San Juan',
  'Zona Industrial / El Peñón',
  'Otra Zona de Cumaná'
];

const SHOE_SIZES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    full_name: '',
    id_doc: '',
    phone: '',
    phone_alt: '',
    zone: 'Centro de Cumaná',
    delivery_address: '',
    shoe_size: '',
    clothing_size: '',
    wallet_credit_usd: 0,
    trust_score: 100,
    is_vip: false,
    role: 'customer'
  });

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let activeUser = session?.user || null;

        if (!activeUser) {
          const { data: userData } = await supabase.auth.getUser();
          activeUser = userData?.user || null;
        }

        if (!isMounted) return;

        if (!activeUser) {
          router.push('/login?redirect=/perfil');
          return;
        }

        setUser(activeUser);

        // Cargar datos de la tabla profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeUser.id)
          .maybeSingle();

        if (!isMounted) return;

        const meta = activeUser.user_metadata || {};

        setProfile({
          full_name: profileData?.full_name || meta.full_name || '',
          id_doc: profileData?.id_doc || meta.id_doc || '',
          phone: profileData?.phone || meta.phone || '',
          phone_alt: profileData?.phone_alt || meta.phone_alt || '',
          zone: profileData?.zone || meta.favorite_zone || 'Centro de Cumaná',
          delivery_address: profileData?.delivery_address || meta.delivery_address || '',
          shoe_size: profileData?.shoe_size || meta.preferred_shoe_size || '',
          clothing_size: profileData?.clothing_size || meta.preferred_clothing_size || '',
          wallet_credit_usd: profileData?.wallet_credit_usd ?? 0,
          trust_score: profileData?.trust_score ?? 100,
          is_vip: profileData?.is_vip ?? false,
          role: profileData?.role || 'customer'
        });
      } catch (err) {
        console.error('Error cargando perfil:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const cleanPhone = profile.phone.replace(/\D/g, '');
      const cleanPhoneAlt = profile.phone_alt ? profile.phone_alt.replace(/\D/g, '') : null;

      // 1. Actualizar metadata de auth
      await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name.trim(),
          id_doc: profile.id_doc.trim(),
          phone: cleanPhone,
          phone_alt: cleanPhoneAlt,
          favorite_zone: profile.zone,
          delivery_address: profile.delivery_address.trim(),
          preferred_shoe_size: profile.shoe_size,
          preferred_clothing_size: profile.clothing_size,
        }
      });

      // 2. Actualizar tabla profiles
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name.trim(),
          phone: cleanPhone,
          id_doc: profile.id_doc.trim(),
          zone: profile.zone,
          delivery_address: profile.delivery_address.trim(),
          phone_alt: cleanPhoneAlt,
          shoe_size: profile.shoe_size,
          clothing_size: profile.clothing_size,
        });

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error cerrando sesión en perfil:', err);
    }
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-teal-400" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between">
      <Header />

      <main className="max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 flex-1 space-y-6">
        
        {/* NAVEGACIÓN Y ENCABEZADO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-400 transition mb-1"
            >
              <ArrowLeft size={14} />
              <span>Volver a la tienda</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Mi Perfil y Preferencias
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Administra tus datos de contacto, dirección para delivery y preferencias del Cazador de Tallas.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto text-xs font-bold text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-600 border border-rose-800/60 hover:border-rose-600 px-4 py-2.5 rounded-xl transition"
          >
            <LogOut size={15} />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        {/* ALERTA DE GUARDADO O ERROR */}
        {saveSuccess && (
          <div className="p-4 bg-emerald-950/70 border border-emerald-500/50 rounded-2xl flex items-center gap-3 text-emerald-200 text-xs animate-in fade-in">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="font-bold">¡Tus datos y preferencias han sido actualizados con éxito!</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-950/70 border border-rose-500/50 rounded-2xl flex items-center gap-3 text-rose-200 text-xs animate-in fade-in">
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TARJETAS RESUMEN DE BILLETERA & CONFIANZA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Saldo a Favor */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Billetera de Protección
            </span>
            <div className="text-2xl font-black text-white">
              ${profile.wallet_credit_usd.toFixed(2)} <span className="text-xs text-slate-500">USD</span>
            </div>
            <span className="text-[11px] text-teal-400 font-semibold block">
              {profile.wallet_credit_usd > 0 ? '✓ Saldo disponible para compras' : 'Sin saldo pendiente'}
            </span>
          </div>

          {/* Reputación de Asistencia */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Reputación de Asistencia
            </span>
            <div className="text-2xl font-black text-white flex items-center gap-2">
              <ShieldCheck size={22} className="text-indigo-400" />
              <span>{profile.trust_score} / 100</span>
            </div>
            <span className="text-[11px] text-indigo-400 font-semibold block">
              {profile.trust_score >= 90 ? '🌟 Cliente Confiable' : 'Puntaje Regular'}
            </span>
          </div>

          {/* Tipo de Usuario */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Rol de Cuenta
            </span>
            <div className="text-2xl font-black text-white flex items-center gap-2">
              <Crown size={22} className={profile.is_vip ? 'text-amber-400' : 'text-slate-500'} />
              <span>{profile.is_vip ? 'Aura VIP' : 'Comprador'}</span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              {profile.role === 'owner' ? 'Comerciante Afiliado' : 'Cumaná, Sucre'}
            </span>
          </div>
        </div>

        {/* FORMULARIO DE EDICIÓN DEL PERFIL */}
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* SECCIÓN 1: DATOS PERSONALES */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="border-b border-slate-800/80 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User size={18} className="text-teal-400" />
                <span>Datos Personales e Identidad Oficial</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Datos requeridos por los comercios físicos para validar el retiro en caja y pagos móviles.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Nombre y Apellido Completo *
                </label>
                <input
                  type="text"
                  required
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Cédula de Identidad * (Obligatoria)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: V-18456789"
                  value={profile.id_doc}
                  onChange={(e) => setProfile({ ...profile, id_doc: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Correo Electrónico (Solo Lectura)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-slate-950/60 border border-slate-800/60 rounded-xl px-4 py-3 text-sm text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  WhatsApp Móvil para Reservas *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 04141234567"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Teléfono Secundario de Respaldo (Opcional)
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 02934312345 o 04249876543"
                  value={profile.phone_alt}
                  onChange={(e) => setProfile({ ...profile, phone_alt: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: UBICACIÓN Y LOGÍSTICA EN CUMANÁ */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="border-b border-slate-800/80 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin size={18} className="text-teal-400" />
                <span>Ubicación y Entregas en Cumaná</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Permite priorizar las vitrinas más cercanas a ti y coordinar envíos por delivery.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Zona Comercial Habitual en Cumaná *
                </label>
                <select
                  value={profile.zone}
                  onChange={(e) => setProfile({ ...profile, zone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition cursor-pointer"
                >
                  {CUMANA_ZONES.map((zone) => (
                    <option key={zone} value={zone} className="bg-slate-900 text-white">
                      {zone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Dirección de Residencia o Referencia Delivery *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Av. Gran Mariscal, Edif. Sucre, Apto 3B"
                  value={profile.delivery_address}
                  onChange={(e) => setProfile({ ...profile, delivery_address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: CAZADOR DE TALLAS (CALZADO Y ROPA - OPCIONAL) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="border-b border-slate-800/80 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Tag size={18} className="text-indigo-400" />
                  <span>Cazador de Últimos Pares y Tallas (Opcional)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Si compras ropa o calzado, define tus medidas para que Aura te avise en tiempo real de remates en tu talla.
                </p>
              </div>

              {(profile.shoe_size || profile.clothing_size) && (
                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, shoe_size: '', clothing_size: '' })}
                  className="text-xs text-rose-400 hover:underline self-start sm:self-auto cursor-pointer"
                >
                  Restablecer tallas
                </button>
              )}
            </div>

            {/* Selector de Calzado */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Talla de Calzado Habitual
                </label>
                {profile.shoe_size && (
                  <span className="text-[11px] font-bold text-teal-400">
                    Talla elegida: {profile.shoe_size}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {SHOE_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setProfile({ ...profile, shoe_size: profile.shoe_size === sz ? '' : sz })}
                    className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                      profile.shoe_size === sz
                        ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de Ropa */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Talla de Ropa Habitual
                </label>
                {profile.clothing_size && (
                  <span className="text-[11px] font-bold text-indigo-400">
                    Talla elegida: {profile.clothing_size}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {CLOTHING_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setProfile({ ...profile, clothing_size: profile.clothing_size === sz ? '' : sz })}
                    className={`cursor-pointer px-4 py-1.5 rounded-xl text-xs font-bold transition border ${
                      profile.clothing_size === sz
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* BOTÓN DE GUARDAR CAMBIOS */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-slate-950 font-black px-8 py-4 rounded-xl text-sm transition shadow-lg shadow-teal-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>

        </form>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        Aura Cumaná • Plataforma de Comercio y Reservas Locales • Cumaná, Estado Sucre
      </footer>
    </div>
  );
}

