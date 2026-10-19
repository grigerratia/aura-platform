'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Mail, Lock, Phone, MapPin, Sparkles,
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2,
  ShieldCheck, Wallet, Eye, EyeOff, Tag, Heart, Store, HelpCircle,
  ShoppingBag, Check
} from 'lucide-react';

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
  'Otra Zona de Cumaná'
];

const SHOE_SIZES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successRegistration, setSuccessRegistration] = useState(false);
  // Bloqueo temporal para evitar que toques residuales de "Siguiente" activen el botón final
  const [canSubmitStep3, setCanSubmitStep3] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Paso 1: Cuenta y Acceso
    full_name: '',
    email: '',
    password: '',

    // Paso 2: Contacto & Notificaciones de Reserva
    phone: '',
    id_doc: '',

    // Paso 3: Preferencias en Cumaná
    favorite_zone: '',
    shoe_size: '',
    clothing_size: '',
  });

  // Enfriamiento de 400ms al entrar al Paso 3 para evitar activación accidental por doble toque
  useEffect(() => {
    if (step === 3) {
      setCanSubmitStep3(false);
      const timer = setTimeout(() => {
        setCanSubmitStep3(true);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setCanSubmitStep3(false);
    }
  }, [step]);

  // Medidor de seguridad de contraseña
  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 6) score += 1;
    if (p.length >= 8) score += 1;
    if (/[A-Z]/.test(p) || /[0-9]/.test(p)) score += 1;
    return score;
  };

  const strength = getPasswordStrength();

  const handleNextStep = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!formData.full_name.trim()) {
        return setErrorMsg('Por favor ingresa tu nombre y apellido.');
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        return setErrorMsg('Ingresa un correo electrónico válido.');
      }
      if (!formData.password || formData.password.length < 6) {
        return setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      }
    } else if (step === 2) {
      if (!formData.phone.trim()) {
        return setErrorMsg('Por favor ingresa tu número de WhatsApp para notificarte tus reservas.');
      }
      const clean = formData.phone.replace(/\D/g, '');
      if (clean.length < 10) {
        return setErrorMsg('Ingresa un número telefónico válido (ej: 04141234567).');
      }
    }
    setStep((prev) => Math.min(prev + 1, 3) as any);
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setStep((prev) => Math.max(prev - 1, 1) as any);
  };

  // Disparado EXCLUSIVAMENTE al presionar de forma intencional el botón "Crear mi Cuenta Gratis"
  const handleFinalRegister = async () => {
    if (!canSubmitStep3) return; // Evita clics fantasma o dobles toques
    setErrorMsg(null);

    // Verificaciones integrales de seguridad
    if (!formData.full_name.trim()) {
      setStep(1);
      return setErrorMsg('Por favor ingresa tu nombre y apellido.');
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setStep(1);
      return setErrorMsg('Ingresa un correo electrónico válido.');
    }
    if (!formData.password || formData.password.length < 6) {
      setStep(1);
      return setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
    }
    if (!formData.phone.trim()) {
      setStep(2);
      return setErrorMsg('Por favor ingresa tu número de WhatsApp para reservas.');
    }
    if (!formData.favorite_zone) {
      return setErrorMsg('Por favor selecciona tu zona comercial habitual en Cumaná.');
    }

    setLoading(true);

    try {
      const cleanPhone = formData.phone.replace(/\D/g, '');

      // 1. Crear el usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name.trim(),
            phone: cleanPhone,
            role: 'customer',
            id_doc: formData.id_doc.trim() || null,
            favorite_zone: formData.favorite_zone,
            preferred_shoe_size: formData.shoe_size || 'N/A',
            preferred_clothing_size: formData.clothing_size || 'N/A',
          }
        }
      });

      let userId = authData?.user?.id;

      if (authError) {
        if (
          authError.message.toLowerCase().includes('already registered') ||
          authError.message.toLowerCase().includes('already exists') ||
          authError.message.toLowerCase().includes('registered')
        ) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email.trim(),
            password: formData.password
          });
          if (signInError) {
            throw new Error(`Este correo ya está registrado en Aura. Por favor inicia sesión en la pantalla de login.`);
          }
          userId = signInData.user.id;
        } else {
          throw authError;
        }
      }

      if (!userId) {
        throw new Error('No se pudo completar el registro. Por favor intenta nuevamente.');
      }

      // 2. Crear o actualizar perfil en la tabla `profiles`
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: formData.full_name.trim(),
          phone: cleanPhone,
          role: 'customer',
          wallet_credit_usd: 0.00
        });

      if (profileError) {
        console.warn('Aviso en perfil de cliente:', profileError);
      }

      // Mostrar pantalla de éxito amigable
      setSuccessRegistration(true);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al crear la cuenta. Verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between">
      
      {/* HEADER SIMPLE */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-400 to-indigo-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-md group-hover:scale-105 transition-transform">
              A
            </div>
            <div>
              <span className="font-black tracking-tight text-white text-lg">AURA</span>
              <span className="ml-1.5 text-[10px] font-bold text-teal-400 uppercase bg-teal-950 border border-teal-800 px-2 py-0.5 rounded-full">
                Cumaná
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline text-slate-400">¿Ya tienes cuenta?</span>
            <Link
              href="/login"
              className="font-bold text-teal-400 hover:text-teal-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-1.5 rounded-xl transition shadow-xs"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 md:py-12 flex-1 flex flex-col justify-center">

        {/* PANTALLA DE ÉXITO */}
        {successRegistration ? (
          <div className="max-w-lg mx-auto w-full bg-slate-900 border border-teal-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 size={38} />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white">¡Bienvenido a Aura!</h2>
            <p className="text-slate-300 text-sm mt-2 max-w-sm mx-auto">
              Hola <strong className="text-teal-400">{formData.full_name}</strong>, tu cuenta de comprador inteligente en Cumaná ha sido creada con éxito.
            </p>

            {/* RESUMEN DE TU CUENTA ACTIVADA */}
            <div className="my-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-2">
                Resumen de tu Perfil Activado
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">CORREO DE ACCESO:</span>
                  <span className="font-semibold text-slate-200 truncate block">{formData.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">WHATSAPP PARA RESERVAS:</span>
                  <span className="font-semibold text-teal-400 block">{formData.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ZONA DE COMPRA:</span>
                  <span className="font-semibold text-slate-200 block">{formData.favorite_zone || 'Centro de Cumaná'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">BILLETERA DE PROTECCIÓN:</span>
                  <span className="font-black text-emerald-400 block">$0.00 USD (Activa)</span>
                </div>
              </div>
            </div>

            {/* BENEFICIOS ACTIVADOS */}
            <div className="p-3.5 bg-teal-950/40 border border-teal-800/50 rounded-2xl text-xs text-teal-200 text-left flex items-start gap-2.5 mb-6">
              <ShieldCheck size={20} className="text-teal-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                Tus reservas en tiendas físicas cuentan con <strong>Candado de Confianza</strong>. Si un producto reservado no te sirve al probarlo en el mostrador, tu dinero queda respaldado en tu Billetera Aura.
              </div>
            </div>

            {/* BOTÓN DE ENTRADA A LA APP */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full cursor-pointer bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-slate-950 font-black py-4 px-6 rounded-2xl text-sm transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 active:scale-95"
              >
                <ShoppingBag size={18} />
                <span>Explorar Vitrinas de Cumaná</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-xl mx-auto w-full">
            
            {/* ENCABEZADO Y VALOR */}
            <div className="text-center mb-6 space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-950/80 border border-teal-800/60 text-teal-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles size={14} className="text-teal-400" />
                Cuenta Gratuita de Comprador
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Aparta tus compras en Cumaná con 1 Clic
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
                Accede al Semáforo de 3 Horas, Cazador de Tallas por Tienda y Billetera de Saldo a Favor protegida.
              </p>
            </div>

            {/* BARRA DE PROGRESO DE 3 PASOS */}
            <div className="mb-6 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2 px-1">
                <span className={step >= 1 ? 'text-teal-400 font-black' : ''}>1. Tu Cuenta</span>
                <span className={step >= 2 ? 'text-teal-400 font-black' : ''}>2. Contacto</span>
                <span className={step >= 3 ? 'text-teal-400 font-black' : ''}>3. Preferencias</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-teal-500 to-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* TARJETA PRINCIPAL (SIN ELEMENTO FORM PARA EVITAR ENVÍOS ACCIDENTALES) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
              
              {/* ALERTA DE ERROR */}
              {errorMsg && (
                <div className="mb-5 p-4 bg-red-950/60 border border-red-800 rounded-2xl flex items-start gap-3 text-red-200 text-xs animate-in fade-in">
                  <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{errorMsg}</span>
                </div>
              )}

              <div className="space-y-6">

                {/* PASO 1: TU CUENTA */}
                {step === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-white">Datos de Acceso</h3>
                      <p className="text-xs text-slate-400">Tu nombre aparecerá en tu boleto QR al retirar en tienda.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                        Nombre y Apellido *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                        <input
                          type="text"
                          placeholder="Ej: Carlos Salazar"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="w-full pl-10 p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                        Correo Electrónico *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                        <input
                          type="email"
                          placeholder="tu-correo@gmail.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-10 p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                        Contraseña (mínimo 6 car.) *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-10 pr-10 p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-sm font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="cursor-pointer absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {/* Medidor visual de contraseña */}
                      {formData.password && (
                        <div className="flex items-center gap-1.5 pt-1 px-1">
                          <div className={`h-1 flex-1 rounded-full ${strength >= 1 ? 'bg-amber-500' : 'bg-slate-800'}`} />
                          <div className={`h-1 flex-1 rounded-full ${strength >= 2 ? 'bg-teal-500' : 'bg-slate-800'}`} />
                          <div className={`h-1 flex-1 rounded-full ${strength >= 3 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                          <span className="text-[10px] text-slate-400 ml-2 font-bold">
                            {strength === 1 ? 'Básica' : strength === 2 ? 'Buena' : strength >= 3 ? 'Segura' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PASO 2: CONTACTO & RESERVAS */}
                {step === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-white">Canales de Reserva</h3>
                      <p className="text-xs text-slate-400">
                        Las tiendas de Cumaná usan tu WhatsApp para avisarte cuando tu pedido esté listo para retirar.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                        Número de WhatsApp Móvil *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                        <input
                          type="tel"
                          placeholder="Ej: 04141234567 o 04121234567"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-10 p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-sm font-medium"
                        />
                      </div>
                      <p className="text-[11px] text-teal-400 font-medium ml-1">
                        ✓ Nunca compartimos tu número con terceros ni enviamos spam.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                        Cédula de Identidad (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: V-18456789"
                        value={formData.id_doc}
                        onChange={(e) => setFormData({ ...formData, id_doc: e.target.value })}
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-sm font-medium"
                      />
                      <span className="text-[10px] text-slate-500 ml-1">
                        Útil para agilizar el retiro de productos de alto valor en caja.
                      </span>
                    </div>

                    <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/50 rounded-2xl flex items-center gap-3">
                      <ShieldCheck className="text-indigo-400 shrink-0" size={20} />
                      <p className="text-xs text-slate-300">
                        Tus datos están protegidos bajo el protocolo de compras seguras de Aura Cumaná.
                      </p>
                    </div>
                  </div>
                )}

                {/* PASO 3: PREFERENCIAS LOCALES */}
                {step === 3 && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-white">Tu Experiencia Local en Cumaná</h3>
                      <p className="text-xs text-slate-400">
                        Configura tu zona para ver vitrinas cercanas y activa el Cazador de Tallas si compras calzado o ropa.
                      </p>
                    </div>

                    {/* Zona en Cumaná */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1 flex items-center justify-between">
                        <span>Tu Zona Habitual de Compras *</span>
                        {formData.favorite_zone && (
                          <span className="text-[10px] text-teal-400 font-bold flex items-center gap-1">
                            <Check size={12} /> Seleccionada
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                        <select
                          value={formData.favorite_zone}
                          onChange={(e) => {
                            setFormData({ ...formData, favorite_zone: e.target.value });
                            setErrorMsg(null);
                          }}
                          className="w-full pl-10 p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-sm font-medium cursor-pointer"
                        >
                          <option value="">-- Elige tu zona comercial principal --</option>
                          {CUMANA_ZONES.map((zone) => (
                            <option key={zone} value={zone} className="bg-slate-900 text-white">
                              {zone}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Talla de Calzado */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Talla de Calzado Habitual (Opcional)
                        </label>
                        {formData.shoe_size && (
                          <button
                            key="btn-clear-shoe"
                            type="button"
                            onClick={() => setFormData({ ...formData, shoe_size: '' })}
                            className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {SHOE_SIZES.map((sz) => (
                          <button
                            key={`shoe-${sz}`}
                            type="button"
                            onClick={() => setFormData({ ...formData, shoe_size: formData.shoe_size === sz ? '' : sz })}
                            className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                              formData.shoe_size === sz
                                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500 ml-1">
                        Te avisaremos cuando una zapatería de tu zona publique remates en tu talla.
                      </p>
                    </div>

                    {/* Talla de Ropa */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Talla de Ropa Habitual (Opcional)
                        </label>
                        {formData.clothing_size && (
                          <button
                            key="btn-clear-clothing"
                            type="button"
                            onClick={() => setFormData({ ...formData, clothing_size: '' })}
                            className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {CLOTHING_SIZES.map((sz) => (
                          <button
                            key={`clothing-${sz}`}
                            type="button"
                            onClick={() => setFormData({ ...formData, clothing_size: formData.clothing_size === sz ? '' : sz })}
                            className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                              formData.clothing_size === sz
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tarjeta de Beneficios Activados */}
                    <div className="p-4 bg-gradient-to-br from-teal-950/60 to-slate-950 border border-teal-800/60 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Wallet className="text-teal-400" size={16} />
                        <h4 className="font-bold text-xs text-white">Beneficios Activados al Crear tu Cuenta:</h4>
                      </div>
                      <ul className="text-[11px] text-slate-300 space-y-1 pl-1">
                        <li className="flex items-center gap-1.5">
                          <span className="text-teal-400">✓</span> Billetera de Protección con Saldo a Favor ($0.00 inicial).
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="text-teal-400">✓</span> Acceso al Semáforo de Reservas en tiempo real (3 Horas).
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="text-teal-400">✓</span> Posibilidad de Apartado de 15 Días pagando en caja.
                        </li>
                      </ul>
                    </div>

                  </div>
                )}

                {/* BOTONES DE NAVEGACIÓN TOTALMENTE INDEPENDIENTES CON KEYS ÚNICAS */}
                <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between gap-3">
                  {step > 1 ? (
                    <button
                      key="btn-nav-prev"
                      type="button"
                      onClick={handlePrevStep}
                      className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl transition"
                    >
                      <ArrowLeft size={14} />
                      <span>Anterior</span>
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="text-xs font-bold text-slate-500 hover:text-slate-300"
                    >
                      Ya tengo cuenta
                    </Link>
                  )}

                  {step < 3 ? (
                    <button
                      key="btn-nav-next"
                      type="button"
                      onClick={handleNextStep}
                      className="cursor-pointer ml-auto bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-6 py-3 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-teal-500/20 active:scale-95"
                    >
                      <span>Siguiente</span>
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      key="btn-nav-finish-submit"
                      type="button"
                      onClick={handleFinalRegister}
                      disabled={loading || !canSubmitStep3}
                      className="cursor-pointer ml-auto bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-slate-950 font-black px-7 py-3.5 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-teal-500/20 active:scale-95 disabled:opacity-40"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          <span>Activando Cuenta...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>Crear mi Cuenta Gratis</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>

            </div>

            {/* ENLACE PARA COMERCIOS */}
            <div className="mt-8 text-center space-y-2">
              <p className="text-xs text-slate-400">¿Eres dueño o encargado de una tienda física en Cumaná?</p>
              <Link
                href="/negocios/registro"
                className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-400 hover:text-indigo-300 underline underline-offset-4 transition"
              >
                <Store size={14} />
                <span>Afiliar mi comercio con 15 días gratis &rarr;</span>
              </Link>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        Aura Cumaná • Plataforma de Vitrinas Físicas y Reservas Locales • Cumaná, Estado Sucre
      </footer>

    </div>
  );
}
