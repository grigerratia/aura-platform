'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Mail, Lock, Phone, MapPin, Sparkles,
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2,
  ShieldCheck, Wallet, Eye, EyeOff, Tag, Heart, Store, HelpCircle,
  ShoppingBag, Check, Building2, Utensils, Smartphone, Wrench, Pill, Car, BookOpen, Armchair
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
  'Zona Industrial / El Peñón',
  'Otra Zona de Cumaná'
];

const AVAILABLE_CATEGORIES = [
  { id: 'comida', label: 'Comida & Restaurantes', icon: Utensils },
  { id: 'tecnologia', label: 'Tecnología & Electro', icon: Smartphone },
  { id: 'moda', label: 'Calzado & Moda', icon: Tag },
  { id: 'ferreteria', label: 'Ferretería & Repuestos', icon: Wrench },
  { id: 'farmacia', label: 'Farmacia & Salud', icon: Pill },
  { id: 'vehiculos', label: 'Vehículos & Motos', icon: Car },
  { id: 'libreria', label: 'Librería & Papelería', icon: BookOpen },
  { id: 'hogar', label: 'Mueblería & Hogar', icon: Armchair },
];

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successRegistration, setSuccessRegistration] = useState(false);
  const [canSubmitStep3, setCanSubmitStep3] = useState(false);

  // Form State Universal
  const [formData, setFormData] = useState({
    // Paso 1: Identidad Oficial y Acceso
    full_name: '',
    id_doc_type: 'V', // 'V', 'E', 'J'
    id_doc_number: '',
    email: '',
    password: '',

    // Paso 2: Contacto Operativo & Canales de Reserva
    phone: '',
    phone_alt: '',

    // Paso 3: Logística en Cumaná & Multi-Rubro Universal
    favorite_zone: '',
    delivery_address: '',
    preferred_categories: ['comida', 'tecnologia', 'moda'] as string[],
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

  // Validación y cambio de paso
  const handleNextStep = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!formData.full_name.trim() || formData.full_name.trim().length < 3) {
        return setErrorMsg('Por favor ingresa tu nombre y apellido completo.');
      }
      
      const cleanId = formData.id_doc_number.replace(/\D/g, '');
      if (!cleanId || cleanId.length < 6) {
        return setErrorMsg('La Cédula de Identidad es obligatoria para validar compras y retiros en tienda (mínimo 6 dígitos).');
      }

      if (!formData.email.trim() || !formData.email.includes('@')) {
        return setErrorMsg('Ingresa un correo electrónico válido para enviarte tus tickets.');
      }
      if (!formData.password || formData.password.length < 6) {
        return setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      }
    } else if (step === 2) {
      if (!formData.phone.trim()) {
        return setErrorMsg('El número de WhatsApp es obligatorio para que el comercio te confirme el stock.');
      }
      const clean = formData.phone.replace(/\D/g, '');
      if (clean.length < 10) {
        return setErrorMsg('Ingresa un número de WhatsApp válido de Venezuela (ej: 04141234567 o 04121234567).');
      }
    }
    setStep((prev) => Math.min(prev + 1, 3) as any);
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setStep((prev) => Math.max(prev - 1, 1) as any);
  };

  const toggleCategory = (catId: string) => {
    setFormData((prev) => {
      const exists = prev.preferred_categories.includes(catId);
      if (exists) {
        return { ...prev, preferred_categories: prev.preferred_categories.filter((c) => c !== catId) };
      } else {
        return { ...prev, preferred_categories: [...prev.preferred_categories, catId] };
      }
    });
  };

  // Creación final voluntaria
  const handleFinalRegister = async () => {
    if (!canSubmitStep3) return;
    setErrorMsg(null);

    // 1. Validaciones integrales
    if (!formData.full_name.trim()) {
      setStep(1);
      return setErrorMsg('Ingresa tu nombre y apellido.');
    }
    const cleanId = formData.id_doc_number.replace(/\D/g, '');
    if (!cleanId || cleanId.length < 6) {
      setStep(1);
      return setErrorMsg('La Cédula de Identidad es obligatoria.');
    }
    if (!formData.phone.trim()) {
      setStep(2);
      return setErrorMsg('Ingresa tu número de WhatsApp para reservas.');
    }
    if (!formData.favorite_zone) {
      return setErrorMsg('Por favor selecciona tu zona comercial habitual en Cumaná.');
    }
    if (!formData.delivery_address.trim() || formData.delivery_address.trim().length < 5) {
      return setErrorMsg('Por favor ingresa una dirección o punto de referencia en Cumaná (calle, sector o punto cercano).');
    }

    setLoading(true);

    try {
      const fullIdDoc = `${formData.id_doc_type}-${cleanId}`;
      const cleanPhone = formData.phone.replace(/\D/g, '');
      const cleanPhoneAlt = formData.phone_alt ? formData.phone_alt.replace(/\D/g, '') : null;

      // 1. Crear el usuario en Supabase Auth con toda la metadata comercial
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name.trim(),
            id_doc: fullIdDoc,
            phone: cleanPhone,
            phone_alt: cleanPhoneAlt,
            role: 'customer',
            favorite_zone: formData.favorite_zone,
            delivery_address: formData.delivery_address.trim(),
            preferred_categories: formData.preferred_categories,
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
            throw new Error(`Este correo ya está registrado en Aura. Por favor inicia sesión.`);
          }
          userId = signInData.user.id;
        } else {
          throw authError;
        }
      }

      if (!userId) {
        throw new Error('No se pudo completar el registro. Intenta nuevamente.');
      }

      // 2. Crear o actualizar perfil en la tabla `profiles`
      const profilePayload: any = {
        id: userId,
        full_name: formData.full_name.trim(),
        phone: cleanPhone,
        role: 'customer',
        wallet_credit_usd: 0.00,
        trust_score: 100,
      };

      // Intentamos adjuntar los campos extendidos si la tabla ya los tiene
      try {
        await supabase
          .from('profiles')
          .upsert({
            ...profilePayload,
            id_doc: fullIdDoc,
            zone: formData.favorite_zone,
            delivery_address: formData.delivery_address.trim(),
            phone_alt: cleanPhoneAlt,
            preferred_categories: formData.preferred_categories
          });
      } catch (e) {
        // Fallback seguro a campos estándar
        await supabase
          .from('profiles')
          .upsert(profilePayload);
      }

      setSuccessRegistration(true);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al crear la cuenta. Verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  const formattedIdDoc = `${formData.id_doc_type}-${formData.id_doc_number.replace(/\D/g, '')}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between">
      
      {/* HEADER */}
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
              Hola <strong className="text-teal-400">{formData.full_name}</strong>, tu cuenta de comprador inteligente en Cumaná ha sido activada con éxito.
            </p>

            {/* RESUMEN DE TU CUENTA ACTIVADA */}
            <div className="my-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-2 flex justify-between">
                <span>Ficha Oficial de Comprador</span>
                <span className="text-emerald-400 font-bold">Verificado</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">CÉDULA DE IDENTIDAD:</span>
                  <span className="font-black text-white block">{formattedIdDoc}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">WHATSAPP RESERVAS:</span>
                  <span className="font-semibold text-teal-400 block">{formData.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ZONA COMERCIAL:</span>
                  <span className="font-semibold text-slate-200 block">{formData.favorite_zone || 'Centro de Cumaná'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">BILLETERA DE PROTECCIÓN:</span>
                  <span className="font-black text-emerald-400 block">$0.00 USD (Activa)</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block text-[10px]">DIRECCIÓN / REFERENCIA DELIVERY:</span>
                  <span className="font-semibold text-slate-300 block truncate">{formData.delivery_address}</span>
                </div>
              </div>
            </div>

            {/* BENEFICIOS ACTIVADOS */}
            <div className="p-3.5 bg-teal-950/40 border border-teal-800/50 rounded-2xl text-xs text-teal-200 text-left flex items-start gap-2.5 mb-6">
              <ShieldCheck size={20} className="text-teal-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                Tus compras en tiendas físicas cuentan con <strong>Candado de Confianza</strong>. Si un producto no cumple tus expectativas al retirarlo en mostrador, tu dinero queda resguardado en tu Billetera Aura para usarlo en cualquier otro comercio.
              </div>
            </div>

            {/* BOTONES DE ENTRADA Y PERFIL */}
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

              <button
                type="button"
                onClick={() => router.push('/perfil')}
                className="w-full cursor-pointer bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <User size={15} className="text-teal-400" />
                <span>Ir a Mi Perfil (Configurar Tallas y Preferencias)</span>
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
                Compra y Aparta en Cumaná con Confianza
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
                Conecta directamente con tiendas locales de comida, tecnología, moda, repuestos, farmacias y más.
              </p>
            </div>

            {/* BARRA DE PROGRESO DE 3 PASOS */}
            <div className="mb-6 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2 px-1">
                <span className={step >= 1 ? 'text-teal-400 font-black' : ''}>1. Identidad Oficial</span>
                <span className={step >= 2 ? 'text-teal-400 font-black' : ''}>2. Contacto Directo</span>
                <span className={step >= 3 ? 'text-teal-400 font-black' : ''}>3. Ubicación & Intereses</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-teal-500 to-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* TARJETA PRINCIPAL (SIN FORM ELEMENT PARA EVITAR ENVÍOS NATIVOS INVOLUNTARIOS) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
              
              {/* ALERTA DE ERROR */}
              {errorMsg && (
                <div className="mb-5 p-4 bg-red-950/60 border border-red-800 rounded-2xl flex items-start gap-3 text-red-200 text-xs animate-in fade-in">
                  <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{errorMsg}</span>
                </div>
              )}

              <div className="space-y-6">

                {/* PASO 1: IDENTIDAD OFICIAL Y ACCESO */}
                {step === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-white">Identidad del Comprador</h3>
                      <p className="text-xs text-slate-400">
                        Los datos oficiales son requeridos para facturación, comprobantes de pago móvil y retiro en mostrador físico.
                      </p>
                    </div>

                    {/* Nombre y Apellido */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                        Nombre y Apellido Completo *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                        <input
                          type="text"
                          placeholder="Ej: Carlos Eduardo Salazar"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="w-full pl-10 p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-sm font-medium"
                        />
                      </div>
                    </div>

                    {/* Cédula de Identidad (OBLIGATORIA) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-teal-400 ml-1 flex items-center justify-between">
                        <span>Cédula de Identidad * (Obligatoria)</span>
                        <span className="text-[10px] text-slate-400 font-normal">Para retiro seguro en tienda</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={formData.id_doc_type}
                          onChange={(e) => setFormData({ ...formData, id_doc_type: e.target.value })}
                          className="w-20 p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-sm font-bold text-center cursor-pointer shrink-0"
                        >
                          <option value="V">V-</option>
                          <option value="E">E-</option>
                          <option value="J">J-</option>
                        </select>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Número de cédula (Ej: 18456789)"
                          value={formData.id_doc_number}
                          onChange={(e) => setFormData({ ...formData, id_doc_number: e.target.value.replace(/\D/g, '') })}
                          className="flex-1 p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-sm font-medium"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 ml-1">
                        Evita fraudes y asegura que solo tú puedas retirar o recibir tu producto en el mostrador.
                      </p>
                    </div>

                    {/* Correo Electrónico */}
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

                    {/* Contraseña */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                        Contraseña de Acceso (mínimo 6 car.) *
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

                {/* PASO 2: CONTACTO OPERATIVO Y RESERVAS */}
                {step === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-white">Canales de Reserva y Notificación</h3>
                      <p className="text-xs text-slate-400">
                        La comunicación con las tiendas de Cumaná es directa para confirmar existencias y apartados.
                      </p>
                    </div>

                    {/* WhatsApp Móvil Obligatorio */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-teal-400 ml-1">
                        Número de WhatsApp Móvil * (Obligatorio)
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
                      <p className="text-[11px] text-slate-400 font-medium ml-1">
                        ✓ Te notificaremos al WhatsApp cuando el comercio presione el semáforo verde de stock.
                      </p>
                    </div>

                    {/* Teléfono Secundario / Respaldo Opcional */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                        Teléfono Secundario o Fijo de Respaldo (Opcional)
                      </label>
                      <input
                        type="tel"
                        placeholder="Ej: 02934312345 o 04249876543"
                        value={formData.phone_alt}
                        onChange={(e) => setFormData({ ...formData, phone_alt: e.target.value })}
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-sm font-medium"
                      />
                      <span className="text-[10px] text-slate-500 ml-1">
                        Útil si te quedas sin batería o sin datos móviles al momento de la entrega.
                      </span>
                    </div>

                    <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/50 rounded-2xl flex items-center gap-3">
                      <ShieldCheck className="text-indigo-400 shrink-0" size={20} />
                      <p className="text-xs text-slate-300">
                        Aura nunca vende tu información. Tus datos de contacto son usados únicamente para la operativa de tus reservas con tiendas verificadas.
                      </p>
                    </div>
                  </div>
                )}

                {/* PASO 3: LOGÍSTICA EN CUMANÁ Y PREFERENCIAS MULTI-RUBRO */}
                {step === 3 && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-white">Logística Local y Tus Intereses</h3>
                      <p className="text-xs text-slate-400">
                        Configura tu zona habitual y dirección de referencia para envíos por delivery y retiros rápidos.
                      </p>
                    </div>

                    {/* Zona Comercial en Cumaná */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1 flex items-center justify-between">
                        <span>Tu Zona Comercial Habitual en Cumaná *</span>
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

                    {/* Dirección de Residencia o Referencia para Envíos */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                        Dirección o Punto de Referencia en Cumaná *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Av. Gran Mariscal, Edif. Sucre, Apto 3B / Cerca de la panadería"
                        value={formData.delivery_address}
                        onChange={(e) => {
                          setFormData({ ...formData, delivery_address: e.target.value });
                          setErrorMsg(null);
                        }}
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-white text-sm font-medium"
                      />
                      <span className="text-[10px] text-slate-500 ml-1">
                        Facilita la cotización de delivery y la coordinación de entregas a domicilio en Cumaná.
                      </span>
                    </div>

                    {/* Rubros de Mayor Interés Comercial */}
                    <div className="space-y-2 pt-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1 block">
                        ¿Qué rubros comerciales te interesa encontrar en Aura?
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {AVAILABLE_CATEGORIES.map((cat) => {
                          const Icon = cat.icon;
                          const selected = formData.preferred_categories.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => toggleCategory(cat.id)}
                              className={`cursor-pointer p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 text-center ${
                                selected
                                  ? 'bg-teal-500/15 border-teal-500 text-teal-300 shadow-sm'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <Icon size={16} className={selected ? 'text-teal-400' : 'text-slate-500'} />
                              <span className="text-[11px] leading-tight">{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Nota informativa de Tallas de Calzado y Ropa */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-start gap-2.5 text-xs text-slate-400">
                      <Tag size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <strong className="text-slate-300">¿Compras ropa o calzado?</strong> Podrás configurar tus tallas exactas voluntariamente en tu <strong className="text-teal-400">Página de Perfil</strong> una vez creada tu cuenta para activar las alertas del <em>Cazador de Tallas</em>.
                      </div>
                    </div>

                    {/* Tarjeta de Beneficios Activados */}
                    <div className="p-4 bg-gradient-to-br from-teal-950/60 to-slate-950 border border-teal-800/60 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Wallet className="text-teal-400" size={16} />
                        <h4 className="font-bold text-xs text-white">Beneficios al Crear tu Cuenta:</h4>
                      </div>
                      <ul className="text-[11px] text-slate-300 space-y-1 pl-1">
                        <li className="flex items-center gap-1.5">
                          <span className="text-teal-400">✓</span> Billetera de Protección con Saldo a Favor ($0.00 inicial).
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="text-teal-400">✓</span> Semáforo de Verificación de Stock en 3 Horas.
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="text-teal-400">✓</span> Posibilidad de Apartados y Delivery coordinado con tiendas locales.
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
