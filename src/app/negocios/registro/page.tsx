'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Store, Building2, MapPin, CreditCard, ShieldCheck,
  CheckCircle2, ArrowRight, ArrowLeft, Loader2, Sparkles,
  Phone, Mail, Lock, User, Clock, Check, HelpCircle,
  Truck, AlertCircle
} from 'lucide-react';
import { CategoryArchetype, StorePlanTier } from '@/types';

// Opciones de zonas reales en Cumaná
const CUMANA_ZONES = [
  'Centro de Cumaná',
  'Av. Bermúdez',
  'C.C. Cumaná Plaza',
  'C.C. Marina Plaza',
  'Av. Perimetral',
  'Av. Gran Mariscal',
  'Av. Cancamure',
  'Tres Picos',
  'El Salado / San Juan',
  'Zona Industrial',
  'Otra Zona de Cumaná'
];

export default function BusinessRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successPendingConfirm, setSuccessPendingConfirm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Paso 1: Identidad
    store_name: '',
    rif: '',
    category_archetype: 'RETAIL_STANDARD' as CategoryArchetype,
    category_label: 'Calzado y Moda',
    slug: '',
    description: '',

    // Paso 2: Ubicación
    zone: 'Centro de Cumaná',
    address: '',
    reference_point: '',
    schedule: 'Lunes a Sábado de 8:30 AM a 5:30 PM',

    // Paso 3: Métodos de Pago & Operatividad
    accepts_cashea: true,
    accepts_pos: true,
    accepts_pago_movil: true,
    accepts_usd_cash: true,
    accepts_zelle: false,
    has_delivery: false,
    // Pago móvil para reservas directas
    pm_bank: '0102 Banco de Venezuela',
    pm_phone: '',
    pm_id: '',

    // Paso 4: Representante, Acceso & Plan
    owner_name: '',
    owner_id_doc: '',
    owner_whatsapp: '',
    email: '',
    password: '',
    plan_tier: 'VITRINA_20' as StorePlanTier,
  });

  // Generar slug automático al tipear el nombre
  const handleStoreNameChange = (name: string) => {
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData(prev => ({
      ...prev,
      store_name: name,
      slug: generatedSlug
    }));
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!formData.store_name.trim()) return setErrorMsg('Por favor ingresa el nombre comercial de tu tienda.');
      if (!formData.slug.trim()) return setErrorMsg('Por favor define el enlace público (slug) para tu vitrina.');
    } else if (step === 2) {
      if (!formData.address.trim()) return setErrorMsg('Por favor ingresa la dirección física de la tienda para los retiros.');
    } else if (step === 3) {
      // Validaciones opcionales de pagos
    }
    setStep((prev) => Math.min(prev + 1, 4) as any);
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setStep((prev) => Math.max(prev - 1, 1) as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.owner_name.trim()) return setErrorMsg('Ingresa el nombre del responsable.');
    if (!formData.owner_whatsapp.trim()) return setErrorMsg('Ingresa el número de WhatsApp comercial.');
    if (!formData.email.trim()) return setErrorMsg('Ingresa el correo electrónico.');
    if (!formData.password || formData.password.length < 6) {
      return setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
    }

    setLoading(true);

    try {
      // 1. Limpieza de números de teléfono
      const cleanPhone = formData.owner_whatsapp.replace(/\D/g, '');

      // 2. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.owner_name.trim(),
            phone: cleanPhone,
            role: 'owner',
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) {
        throw new Error('No se pudo crear la cuenta de usuario. Por favor intenta nuevamente.');
      }

      const userId = authData.user.id;

      // 3. Compilar Insignias de Pago / Badges
      const badges: string[] = [];
      if (formData.accepts_cashea) badges.push('Acepta Cashea');
      if (formData.accepts_pos) badges.push('Punto de Venta');
      if (formData.accepts_pago_movil) badges.push('Pago Móvil');
      if (formData.accepts_usd_cash) badges.push('Efectivo Divisas');
      if (formData.accepts_zelle) badges.push('Zelle');
      if (formData.has_delivery) badges.push('Delivery Cumaná');

      // 4. Crear la Tienda en la tabla `stores`
      const { data: newStore, error: storeError } = await supabase
        .from('stores')
        .insert([{
          name: formData.store_name.trim(),
          slug: formData.slug.trim(),
          owner_id: userId,
          owner_whatsapp: cleanPhone,
          whatsapp: cleanPhone,
          description: formData.description.trim() || `Vitrina comercial de ${formData.store_name} en Cumaná.`,
          zone: formData.zone,
          address: formData.address.trim(),
          rif: formData.rif.trim() || null,
          schedule: formData.schedule.trim(),
          badges: badges,
          plan_tier: formData.plan_tier,
          subscription_status: 'TRIAL',
          pago_movil_info: {
            bank_name: formData.pm_bank,
            phone: formData.pm_phone.trim(),
            id_doc: formData.pm_id.trim(),
            account_holder: formData.store_name.trim()
          },
          verification_status: 'DRAFT_UNVERIFIED',
          cashier_access_pin: '1234',
          rif_or_id_number: formData.rif.trim() || formData.owner_id_doc.trim() || null,
          is_active: true
        }])
        .select()
        .single();

      if (storeError) {
        console.error('Error insertando tienda:', storeError);
        throw new Error('Error al registrar la tienda: ' + storeError.message);
      }

      // 5. Crear o actualizar el perfil en `profiles`
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          role: 'owner',
          full_name: formData.owner_name.trim(),
          phone: cleanPhone,
          store_id: newStore.id,
          wallet_credit_usd: 0,
          trust_score: 100
        });

      if (profileError) {
        console.warn('Aviso en perfiles (posible RLS):', profileError);
      }

      // 6. Verificar si el usuario ya tiene sesión activa (Confirm email apagado o confirmado)
      if (authData.session) {
        // Redirección inmediata al dashboard
        router.push('/negocios/dashboard');
      } else {
        // Supabase requiere confirmación de correo
        setSuccessPendingConfirm(true);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocurrió un error inesperado al afiliar el comercio.');
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de Confirmación de Correo (si Supabase la tiene activada)
  if (successPendingConfirm) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
            <CheckCircle2 size={36} className="text-slate-950" />
          </div>

          <div>
            <span className="text-teal-400 text-xs font-black uppercase tracking-wider">¡Registro Completado!</span>
            <h1 className="text-2xl font-black text-white mt-1">Tu comercio ha sido afiliado a Aura</h1>
            <p className="text-slate-400 text-sm mt-2">
              Se ha creado tu tienda <strong>{formData.store_name}</strong> con 15 días gratis de Vitrina Activa.
            </p>
          </div>

          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 text-left text-xs space-y-2">
            <p className="font-bold text-amber-300 flex items-center gap-1.5">
              <Mail size={16} /> Verificación de Correo en Supabase
            </p>
            <p className="text-slate-300 leading-relaxed">
              Si tu proyecto de Supabase tiene activa la confirmación de email, revisa la bandeja de entrada de <strong>{formData.email}</strong> para activar tu cuenta.
            </p>
            <div className="pt-2 border-t border-slate-700 text-[11px] text-slate-400">
              💡 <strong>Tip para Desarrollo:</strong> En tu consola de Supabase ve a <em>Authentication &gt; Users</em> y pulsa los tres puntos al lado de tu usuario para presionar <em>&quot;Confirm email&quot;</em> y entrar al instante.
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/negocios"
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-2 transition"
            >
              <span>Ir a Iniciar Sesión en Aura Business</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between">
      
      {/* HEADER DE AFILIACIÓN */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
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

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400 hidden sm:inline">¿Ya tienes cuenta de negocio?</span>
            <Link
              href="/negocios"
              className="font-bold text-teal-400 hover:text-teal-300 underline underline-offset-4 transition"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 md:py-12 flex-1">
        
        {/* ENCABEZADO Y PROGRESO */}
        <div className="mb-8 text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles size={14} className="text-teal-400" />
            Afiliación de Comercio Aliado (Estilo Cashea)
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Pon tu tienda física en la vitrina digital de Cumaná
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Llena los datos de tu negocio en 4 simples pasos. Sin comisiones sorpresa, cobras el 100% directo en tu caja.
          </p>

          {/* INDICADOR DE PASOS */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-6">
            {[
              { num: 1, label: 'Identidad' },
              { num: 2, label: 'Ubicación' },
              { num: 3, label: 'Cobro & Cashea' },
              { num: 4, label: 'Acceso & Plan' }
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition ${
                    step === s.num
                      ? 'bg-teal-500 text-slate-950 ring-4 ring-teal-500/20'
                      : step > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {step > s.num ? <Check size={14} /> : s.num}
                </div>
                <span className={`text-xs font-bold hidden sm:inline ${step === s.num ? 'text-white' : 'text-slate-500'}`}>
                  {s.label}
                </span>
                {s.num < 4 && <div className="w-4 sm:w-8 h-[2px] bg-slate-800" />}
              </div>
            ))}
          </div>
        </div>

        {/* MENSAJE DE ERROR */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-950/60 border border-red-800 rounded-2xl flex items-center gap-3 text-red-200 text-xs">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* CONTENEDOR DEL FORMULARIO */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          
          <form onSubmit={step === 4 ? handleSubmit : (e) => { e.preventDefault(); handleNextStep(); }}>
            
            {/* PASO 1: IDENTIDAD COMERCIAL */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Building2 className="text-teal-400" size={22} />
                    Paso 1: Identidad de tu Negocio
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Información comercial básica que verán los clientes en la vitrina de Aura.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Nombre Comercial de la Tienda *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Inversiones Calzados Cumaná"
                      value={formData.store_name}
                      onChange={(e) => handleStoreNameChange(e.target.value)}
                      className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      RIF o Documento Fiscal (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: J-40123456-7"
                      value={formData.rif}
                      onChange={(e) => setFormData({ ...formData, rif: e.target.value })}
                      className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>
                </div>

                {/* Rubro Comercial / Arquetipo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Rubro Comercial Principal *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { arch: 'RETAIL_STANDARD', label: '🛍️ Calzado, Ropa y Accesorios', desc: 'Manejo de tallas y colores' },
                      { arch: 'GASTRO_FLASH', label: '🍽️ Restaurante o Comida', desc: 'Cupos diarios hoy, en mesa o delivery' },
                      { arch: 'HIGH_TICKET', label: '📺 Electrodomésticos & Hogar', desc: 'Apartado y productos de alto valor' },
                      { arch: 'URGENT_SEARCH', label: '🔧 Ferretería, Farmacia o Repuestos', desc: 'Búsqueda inmediata por cercanía' },
                      { arch: 'VEHICLES_CLASSIFIED', label: '🚗 Vehículos & Motos', desc: 'Agendamiento de citas y concesionarios' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.arch}
                        onClick={() => setFormData({
                          ...formData,
                          category_archetype: item.arch as CategoryArchetype,
                          category_label: item.label
                        })}
                        className={`cursor-pointer p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                          formData.category_archetype === item.arch
                            ? 'bg-teal-950/60 border-teal-500 text-white ring-2 ring-teal-500/20'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-bold text-sm text-white mb-1">{item.label}</span>
                        <span className="text-[11px] text-slate-400">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slug de la Vitrina con Live Preview */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Enlace Público para tu Vitrina (Slug) *
                  </label>
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm">
                    <span className="text-slate-500 font-mono text-xs">aura.lat/</span>
                    <input
                      type="text"
                      required
                      placeholder="tu-tienda"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="flex-1 bg-transparent border-none outline-none text-teal-400 font-mono text-sm font-bold ml-1"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Este será el enlace directo que podrás colocar en tu biografía de Instagram o estados de WhatsApp.
                  </p>
                </div>

                {/* Breve descripción */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Descripción Corta de la Tienda
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Calzado deportivo, sandalias y ropa casual para damas y caballeros con la mejor atención de Cumaná."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            {/* PASO 2: UBICACIÓN Y HORARIOS (CUMANÁ) */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <MapPin className="text-teal-400" size={22} />
                    Paso 2: Ubicación Física en Cumaná
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Los compradores de Aura van a retirar directamente en tu local. Indícales cómo llegar.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selector de Zonas */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Zona o Sector Comercial *
                    </label>
                    <select
                      value={formData.zone}
                      onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                      className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {CUMANA_ZONES.map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>

                  {/* Horario de Atención */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Horario de Atención en Tienda *
                    </label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-3.5 top-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="Ej: Lunes a Sábado de 8:30 AM a 5:30 PM"
                        value={formData.schedule}
                        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                        className="w-full pl-10 p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Dirección Exacta */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Dirección Exacta de la Tienda *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Calle Mariño, Edif. Colonial, Local PB-3"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Punto de Referencia */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Punto de Referencia Conocido
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Frente a la Plaza Miranda, diagonal a la farmacia principal"
                    value={formData.reference_point}
                    onChange={(e) => setFormData({ ...formData, reference_point: e.target.value })}
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            {/* PASO 3: MÉTODOS DE PAGO & CASHEA */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <CreditCard className="text-teal-400" size={22} />
                    Paso 3: Métodos de Cobro y Operatividad
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Indica cómo pueden pagarte los clientes al retirar en tu caja física.
                  </p>
                </div>

                {/* Checkboxes de Métodos */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Métodos de Pago que Aceptas en tu Tienda
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Acepta Cashea */}
                    <label className={`cursor-pointer p-4 rounded-2xl border flex items-center gap-3 transition ${
                      formData.accepts_cashea ? 'bg-amber-950/40 border-amber-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.accepts_cashea}
                        onChange={(e) => setFormData({ ...formData, accepts_cashea: e.target.checked })}
                        className="w-5 h-5 accent-amber-500 rounded"
                      />
                      <div>
                        <span className="font-bold text-sm text-amber-300 block">✨ Acepto Cashea</span>
                        <span className="text-[11px] text-slate-400">Insignia dorada visible en el buscador</span>
                      </div>
                    </label>

                    {/* Punto de Venta */}
                    <label className={`cursor-pointer p-4 rounded-2xl border flex items-center gap-3 transition ${
                      formData.accepts_pos ? 'bg-slate-800/80 border-teal-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.accepts_pos}
                        onChange={(e) => setFormData({ ...formData, accepts_pos: e.target.checked })}
                        className="w-5 h-5 accent-teal-500 rounded"
                      />
                      <div>
                        <span className="font-bold text-sm block">💳 Punto de Venta</span>
                        <span className="text-[11px] text-slate-400">Tarjetas de Débito y Crédito</span>
                      </div>
                    </label>

                    {/* Pago Móvil en Mostrador */}
                    <label className={`cursor-pointer p-4 rounded-2xl border flex items-center gap-3 transition ${
                      formData.accepts_pago_movil ? 'bg-slate-800/80 border-teal-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.accepts_pago_movil}
                        onChange={(e) => setFormData({ ...formData, accepts_pago_movil: e.target.checked })}
                        className="w-5 h-5 accent-teal-500 rounded"
                      />
                      <div>
                        <span className="font-bold text-sm block">📱 Pago Móvil</span>
                        <span className="text-[11px] text-slate-400">Transferencias instantáneas</span>
                      </div>
                    </label>

                    {/* Efectivo Divisas */}
                    <label className={`cursor-pointer p-4 rounded-2xl border flex items-center gap-3 transition ${
                      formData.accepts_usd_cash ? 'bg-slate-800/80 border-teal-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.accepts_usd_cash}
                        onChange={(e) => setFormData({ ...formData, accepts_usd_cash: e.target.checked })}
                        className="w-5 h-5 accent-teal-500 rounded"
                      />
                      <div>
                        <span className="font-bold text-sm block">💵 Divisas en Efectivo ($ / €)</span>
                        <span className="text-[11px] text-slate-400">Pagos al momento del retiro</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Delivery */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck size={20} className="text-teal-400" />
                    <div>
                      <span className="font-bold text-sm text-white block">¿Ofreces Delivery propio en Cumaná?</span>
                      <span className="text-xs text-slate-400">Para clientes que aseguren con Pago Móvil directo</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.has_delivery}
                    onChange={(e) => setFormData({ ...formData, has_delivery: e.target.checked })}
                    className="w-6 h-6 accent-teal-500 rounded"
                  />
                </div>

                {/* Datos de Pago Móvil para Reservas Directas */}
                <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-teal-400 block">
                    Datos de Pago Móvil del Comercio (Opcional pero Recomendado)
                  </span>
                  <p className="text-xs text-slate-400">
                    Se mostrarán solo cuando un cliente decida extender su reserva a 48h o solicitar delivery.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Banco (ej: 0102 Bco Venezuela)"
                      value={formData.pm_bank}
                      onChange={(e) => setFormData({ ...formData, pm_bank: e.target.value })}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <input
                      type="text"
                      placeholder="Teléfono Pago Móvil"
                      value={formData.pm_phone}
                      onChange={(e) => setFormData({ ...formData, pm_phone: e.target.value })}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <input
                      type="text"
                      placeholder="Cédula / RIF"
                      value={formData.pm_id}
                      onChange={(e) => setFormData({ ...formData, pm_id: e.target.value })}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PASO 4: DATOS DE ACCESO Y PLAN */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <ShieldCheck className="text-teal-400" size={22} />
                    Paso 4: Cuenta de Acceso y Plan Comercial
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Crea tu usuario para gestionar inventario, confirmar stock y validar QRs.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre del Responsable */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Nombre y Apellido del Encargado *
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="Ej: Carlos Silva"
                        value={formData.owner_name}
                        onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                        className="w-full pl-10 p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  {/* WhatsApp Comercial */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      WhatsApp Comercial para Reservas *
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-4 text-slate-500" />
                      <input
                        type="tel"
                        required
                        placeholder="Ej: 04141234567 o 584141234567"
                        value={formData.owner_whatsapp}
                        onChange={(e) => setFormData({ ...formData, owner_whatsapp: e.target.value })}
                        className="w-full pl-10 p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Correo de Acceso */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Correo Electrónico de Acceso *
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="tu-tienda@gmail.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  {/* Contraseña */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Contraseña de Acceso (mínimo 6 car.) *
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* SELECTOR DE PLAN B2B */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Selecciona tu Plan Inicial (Comienza con 15 días gratis)
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Plan Vitrina */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, plan_tier: 'VITRINA_20' })}
                      className={`cursor-pointer p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                        formData.plan_tier === 'VITRINA_20'
                          ? 'bg-teal-950/60 border-teal-500 text-white ring-2 ring-teal-500/20'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase text-teal-400 bg-teal-950 px-2 py-0.5 rounded-full border border-teal-800 inline-block mb-1">
                          Prueba de 15 Días Gratis
                        </span>
                        <h4 className="font-black text-sm text-white">Plan Vitrina</h4>
                        <p className="text-xs text-slate-400 mt-1">Hasta 30 productos y reservas con QR.</p>
                      </div>
                      <span className="text-lg font-black text-teal-400 mt-3">$20<span className="text-xs text-slate-400 font-normal">/mes</span></span>
                    </button>

                    {/* Plan Acelerador */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, plan_tier: 'ACELERADOR_45' })}
                      className={`cursor-pointer p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                        formData.plan_tier === 'ACELERADOR_45'
                          ? 'bg-indigo-950/60 border-indigo-500 text-white ring-2 ring-indigo-500/20'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-800 inline-block mb-1">
                          Más Popular
                        </span>
                        <h4 className="font-black text-sm text-white">Acelerador</h4>
                        <p className="text-xs text-slate-400 mt-1">Inventario ilimitado, Remates Flash y Demanda Perdida.</p>
                      </div>
                      <span className="text-lg font-black text-indigo-400 mt-3">$45<span className="text-xs text-slate-400 font-normal">/mes</span></span>
                    </button>

                    {/* Plan Dominio */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, plan_tier: 'DOMINIO_80' })}
                      className={`cursor-pointer p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                        formData.plan_tier === 'DOMINIO_80'
                          ? 'bg-purple-950/60 border-purple-500 text-white ring-2 ring-purple-500/20'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase text-purple-400 bg-purple-950 px-2 py-0.5 rounded-full border border-purple-800 inline-block mb-1">
                          Máximo Alcance
                        </span>
                        <h4 className="font-black text-sm text-white">Dominio</h4>
                        <p className="text-xs text-slate-400 mt-1">Multi-sucursal, prioridad y créditos Aura Ads.</p>
                      </div>
                      <span className="text-lg font-black text-purple-400 mt-3">$80<span className="text-xs text-slate-400 font-normal">/mes</span></span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* BOTONES DE NAVEGACIÓN ENTRE PASOS */}
            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="cursor-pointer px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition"
                >
                  <ArrowLeft size={16} /> Anterior
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="cursor-pointer px-7 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-2 transition shadow-lg shadow-teal-500/20"
                >
                  Continuar <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer px-8 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm flex items-center gap-2 transition shadow-xl shadow-teal-500/25 active:scale-98 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Creando tu Vitrina...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Afiliar mi Comercio en Aura</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </form>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        Aura Cumaná • Plataforma de Vitrinas Físicas y Reserva Inmediata • Cumaná, Estado Sucre
      </footer>

    </div>
  );
}

