// import React, { useState } from 'react';
// import {
//   Store, ShieldCheck, Loader2, Plus,
//   Image as ImageIcon, Link2, Mail, Phone, Lock, User,
//   AlertCircle, Search
// } from 'lucide-react';

// // ⚠️ AJUSTA ESTA RUTA según dónde tengas configurado tu cliente de Supabase en tu proyecto
// import { supabase } from '@/lib/supabase';

// export default function TabCreate({ formData, setFormData, handleCreateEverything, loading, plansList, profilesList }: any) {

//   const [validationError, setValidationError] = useState<string | null>(null);
//   const [isChecking, setIsChecking] = useState(false);

//   const ownersList = profilesList?.filter((profile: any) => profile.role === 'owner') || [];

//   // Función asíncrona que intercepta el formulario para consultar a la BD
//   const handleLocalSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setValidationError(null);
//     setIsChecking(true);

//     const currentName = formData.store_name?.trim();
//     const currentSlug = formData.slug?.trim();
//     const currentPhone = formData.owner_whatsapp?.trim();

//     try {
//       // 1. Consultar a Supabase si el slug ya existe
//       const { data: existingSlug, error: slugError } = await supabase
//         .from('stores') // ⚠️ Asegúrate de que el nombre de tu tabla sea 'stores'
//         .select('id')
//         .eq('slug', currentSlug)
//         .maybeSingle();

//       if (existingSlug) {
//         setValidationError('La URL (Slug) ya está en uso por otra tienda. Por favor, elige una diferente.');
//         setIsChecking(false);
//         return;
//       }

//       // 2. Consultar a Supabase si el nombre ya existe (ignorando mayúsculas y minúsculas con ilike)
//       const { data: existingName, error: nameError } = await supabase
//         .from('stores')
//         .select('id')
//         .ilike('name', currentName)
//         .maybeSingle();

//       if (existingName) {
//         setValidationError('Ya existe un negocio registrado con este Nombre Comercial.');
//         setIsChecking(false);
//         return;
//       }

//       // 3. Consultar a Supabase si el teléfono/WhatsApp ya existe
//       if (currentPhone) {
//         const { data: existingPhone, error: phoneError } = await supabase
//           .from('stores')
//           .select('id')
//           .eq('owner_whatsapp', currentPhone) // ⚠️ Ajusta a 'whatsapp' o 'phone' si tu columna en la BD se llama diferente
//           .maybeSingle();

//         if (existingPhone) {
//           setValidationError('Ya existe un negocio registrado con este número de WhatsApp.');
//           setIsChecking(false);
//           return;
//         }
//       }

//       // Si las consultas a la BD confirman que no hay duplicados, creamos la tienda
//       handleCreateEverything(e);

//     } catch (error) {
//       console.error("Error de validación en Supabase:", error);
//       setValidationError('Error de conexión al verificar disponibilidad. Intenta nuevamente.');
//     } finally {
//       setIsChecking(false);
//     }
//   };

//   return (
//     <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 duration-500 pb-12">

//       {/* ================= ENCABEZADO ================= */}
//       <div className="text-center space-y-2">
//         <h2 className="text-3xl font-black text-slate-900 tracking-tight">Configuración de Nuevo Negocio</h2>
//         <p className="text-slate-500 text-sm md:text-base">Registra la tienda y vincúlala a la cuenta de su administrador principal.</p>
//       </div>

//       {/* ================= ALERTA DE ERROR ================= */}
//       {validationError && (
//         <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
//           <AlertCircle className="text-red-500 mt-0.5 min-w-[20px]" size={20} />
//           <div>
//             <h4 className="text-red-800 font-bold text-sm">Validación fallida</h4>
//             <p className="text-red-600 text-sm mt-0.5">{validationError}</p>
//           </div>
//         </div>
//       )}

//       {/* Formulario usando nuestra nueva función asíncrona */}
//       <form onSubmit={handleLocalSubmit} className="space-y-8">

//         {/* ================= SECCIÓN TIENDA ================= */}
//         <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-slate-200">

//           <h3 className="text-xl font-bold text-brand-primary mb-8 flex items-center gap-3">
//             <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
//               <Store size={22} />
//             </div>
//             Datos del Establecimiento
//           </h3>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

//             <div className="space-y-2">
//               <label className="text-sm font-semibold text-slate-700 ml-1">
//                 Nombre Comercial <span className="text-red-500">*</span>
//               </label>
//               <input type="text" required
//                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all text-slate-900"
//                 placeholder="Ej: Bodegón Cumaná"
//                 value={formData.store_name}
//                 onChange={(e) => {
//                   setFormData({ ...formData, store_name: e.target.value });
//                   if (validationError) setValidationError(null);
//                 }}
//               />
//             </div>

//             <div className="space-y-2">
//               <label className="text-sm font-semibold text-slate-700 ml-1">
//                 URL amigable (Slug) <span className="text-red-500">*</span>
//               </label>
//               <input type="text" required
//                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all text-slate-900"
//                 placeholder="ej: bodegon-cumana"
//                 value={formData.slug}
//                 onChange={(e) => {
//                   setFormData({ ...formData, slug: e.target.value.toLowerCase() });
//                   if (validationError) setValidationError(null);
//                 }}
//               />
//             </div>

//             <div className="space-y-2">
//               <label className="text-sm font-semibold text-slate-700 ml-1">
//                 WhatsApp de Ventas <span className="text-red-500">*</span>
//               </label>
//               <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-brand-primary transition-all overflow-hidden">
//                 <div className="pl-4 pr-2 text-slate-400">
//                   <Phone size={18} />
//                 </div>
//                 <input type="number" required
//                   className="w-full py-3 pr-4 bg-transparent outline-none text-slate-900"
//                   placeholder="584120000000"
//                   value={formData.owner_whatsapp}
//                   onChange={(e) => {
//                     setFormData({ ...formData, owner_whatsapp: e.target.value });
//                     if (validationError) setValidationError(null);
//                   }}
//                 />
//               </div>
//             </div>

//             <div className="space-y-2">
//               <label className="text-sm font-semibold text-slate-700 ml-1">Descripción Breve</label>
//               <input type="text"
//                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all text-slate-900"
//                 placeholder="Venta de víveres y licores"
//                 value={formData.description}
//                 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
//               />
//             </div>

//             <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
//               <label className="text-sm font-semibold text-slate-700 ml-1">Plan de Aura (Suscripción)</label>
//               <select
//                 className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all text-slate-900"
//                 value={formData.aura_plan_id}
//                 onChange={(e) => setFormData({ ...formData, aura_plan_id: e.target.value })}>
//                 <option value="">Ninguno / Plan Especial</option>
//                 {plansList?.map((plan: any) => (
//                   <option key={plan.id} value={plan.id}>{plan.name} - ${plan.price}/mes</option>
//                 ))}
//               </select>
//             </div>

//             <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
//               <label className="text-sm font-semibold text-slate-700 ml-1">Monto de Plan Especial (USD)</label>
//               <input type="number" step="0.01"
//                 className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
//                 placeholder="Ej: 15.00"
//                 value={formData.special_plan}
//                 onChange={(e) => setFormData({ ...formData, special_plan: e.target.value })}
//                 disabled={!!formData.aura_plan_id}
//                 title={formData.aura_plan_id ? "Desactiva el plan de Aura para usar una cuota especial" : ""}
//               />
//             </div>

//             <div className="space-y-2">
//               <label className="text-sm font-semibold text-slate-700 ml-1 flex items-center gap-2">
//                 Logo URL (Opcional)
//               </label>
//               <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-brand-primary transition-all overflow-hidden">
//                 <div className="pl-4 pr-2 text-slate-400"><ImageIcon size={18} /></div>
//                 <input type="url"
//                   className="w-full py-3 pr-4 bg-transparent outline-none text-slate-900"
//                   placeholder="https://ejemplo.com/logo.png"
//                   value={formData.logo_url}
//                   onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
//                 />
//               </div>
//             </div>

//             <div className="space-y-2">
//               <label className="text-sm font-semibold text-slate-700 ml-1 flex items-center gap-2">
//                 Banner URL (Opcional)
//               </label>
//               <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-brand-primary transition-all overflow-hidden">
//                 <div className="pl-4 pr-2 text-slate-400"><ImageIcon size={18} /></div>
//                 <input type="url"
//                   className="w-full py-3 pr-4 bg-transparent outline-none text-slate-900"
//                   placeholder="https://ejemplo.com/banner.jpg"
//                   value={formData.banner_url}
//                   onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
//                 />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* ================= SECCIÓN DUEÑO ================= */}
//         <div className="bg-slate-900 p-6 md:p-10 rounded-[2rem] shadow-xl border border-slate-800">

//           <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
//             <h3 className="text-xl font-bold text-blue-400 flex items-center gap-3">
//               <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
//                 <ShieldCheck size={22} />
//               </div>
//               Vinculación de Administrador
//             </h3>

//             <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700 w-fit">
//               <button type="button"
//                 onClick={() => setFormData({ ...formData, owner_mode: 'existing' })}
//                 className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${formData.owner_mode === 'existing' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
//                 Dueño Existente
//               </button>
//               <button type="button"
//                 onClick={() => setFormData({ ...formData, owner_mode: 'new' })}
//                 className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${formData.owner_mode === 'new' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
//                 Nuevo Dueño
//               </button>
//             </div>
//           </div>

//           <div>
//             {formData.owner_mode === 'existing' ? (

//               <div className="space-y-3 animate-in fade-in duration-300">
//                 <label className="text-sm font-semibold text-slate-300 ml-1 flex items-center gap-2">
//                   <Link2 size={16} /> Selecciona el perfil al que pertenecerá esta tienda
//                 </label>
//                 <select required
//                   className="w-full px-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
//                   value={formData.existing_owner_id}
//                   onChange={(e) => setFormData({ ...formData, existing_owner_id: e.target.value })}>
//                   <option value="" className="text-slate-400">-- Buscar dueño registrado --</option>
//                   {ownersList.map((owner: any) => (
//                     <option key={owner.id} value={owner.id}>
//                       {owner.full_name} ({owner.email || 'Sin correo'})
//                     </option>
//                   ))}
//                 </select>
//               </div>

//             ) : (

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-in fade-in duration-300">

//                 <div className="space-y-2">
//                   <label className="text-sm font-semibold text-slate-300 ml-1">
//                     Nombre Completo <span className="text-blue-400">*</span>
//                   </label>
//                   <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
//                     <div className="pl-4 pr-2 text-slate-500"><User size={18} /></div>
//                     <input type="text" required={formData.owner_mode === 'new'}
//                       className="w-full py-3 pr-4 bg-transparent outline-none text-white placeholder-slate-500"
//                       placeholder="Juan Pérez"
//                       value={formData.owner_full_name}
//                       onChange={(e) => setFormData({ ...formData, owner_full_name: e.target.value })}
//                     />
//                   </div>
//                 </div>

//                 <div className="space-y-2">
//                   <label className="text-sm font-semibold text-slate-300 ml-1">Teléfono Personal</label>
//                   <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
//                     <div className="pl-4 pr-2 text-slate-500"><Phone size={18} /></div>
//                     <input type="text"
//                       className="w-full py-3 pr-4 bg-transparent outline-none text-white placeholder-slate-500"
//                       placeholder="Opcional"
//                       value={formData.owner_phone}
//                       onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
//                     />
//                   </div>
//                 </div>

//                 <div className="space-y-2">
//                   <label className="text-sm font-semibold text-slate-300 ml-1">
//                     Correo de Acceso <span className="text-blue-400">*</span>
//                   </label>
//                   <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
//                     <div className="pl-4 pr-2 text-slate-500"><Mail size={18} /></div>
//                     <input type="email" required={formData.owner_mode === 'new'}
//                       className="w-full py-3 pr-4 bg-transparent outline-none text-white placeholder-slate-500"
//                       placeholder="admin@tienda.com"
//                       value={formData.owner_email}
//                       onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
//                     />
//                   </div>
//                 </div>

//                 <div className="space-y-2">
//                   <label className="text-sm font-semibold text-slate-300 ml-1">
//                     Contraseña Temporal <span className="text-blue-400">*</span>
//                   </label>
//                   <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
//                     <div className="pl-4 pr-2 text-slate-500"><Lock size={18} /></div>
//                     <input type="text" required={formData.owner_mode === 'new'}
//                       className="w-full py-3 pr-4 bg-transparent outline-none text-white placeholder-slate-500"
//                       placeholder="Mínimo 6 caracteres"
//                       value={formData.owner_password}
//                       onChange={(e) => setFormData({ ...formData, owner_password: e.target.value })}
//                     />
//                   </div>
//                 </div>

//               </div>
//             )}
//           </div>
//         </div>

//         {/* ================= BOTÓN DE SUBMIT ================= */}
//         <button type="submit" disabled={loading || isChecking}
//           className="w-full bg-brand-primary text-white p-6 rounded-2xl font-black text-lg hover:bg-brand-primary/90 transition-all duration-300 flex justify-center items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.2)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0">
//           {isChecking ? (
//             <>
//               <Search className="animate-pulse" size={24} />
//               <span>VERIFICANDO DISPONIBILIDAD...</span>
//             </>
//           ) : loading ? (
//             <>
//               <Loader2 className="animate-spin" size={24} />
//               <span>CREANDO NEGOCIO...</span>
//             </>
//           ) : (
//             <>
//               <Plus size={24} strokeWidth={3} />
//               <span>REGISTRAR NEGOCIO</span>
//             </>
//           )}
//         </button>

//       </form>
//     </div>
//   );
// }
import React, { useState } from 'react';
import {
  Store, ShieldCheck, Loader2, Plus,
  Image as ImageIcon, Link2, Mail, Phone, Lock, User,
  AlertCircle, Search
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

export default function TabCreate({ formData, setFormData, handleCreateEverything, loading, plansList, profilesList }: any) {

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const ownersList = profilesList?.filter((profile: any) => profile.role === 'owner') || [];

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsChecking(true);

    const currentName = formData.store_name?.trim();
    const currentSlug = formData.slug?.trim();
    const currentPhone = formData.owner_whatsapp?.trim();

    try {
      const { data: existingSlug } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', currentSlug)
        .maybeSingle();

      if (existingSlug) {
        setValidationError('La URL (Slug) ya está en uso por otra tienda. Por favor, elige una diferente.');
        setIsChecking(false);
        return;
      }

      const { data: existingName } = await supabase
        .from('stores')
        .select('id')
        .ilike('name', currentName)
        .maybeSingle();

      if (existingName) {
        setValidationError('Ya existe un negocio registrado con este Nombre Comercial.');
        setIsChecking(false);
        return;
      }

      if (currentPhone) {
        const { data: existingPhone } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_whatsapp', currentPhone)
          .maybeSingle();

        if (existingPhone) {
          setValidationError('Ya existe un negocio registrado con este número de WhatsApp.');
          setIsChecking(false);
          return;
        }
      }

      handleCreateEverything(e);

    } catch (error) {
      console.error("Error de validación en Supabase:", error);
      setValidationError('Error de conexión al verificar disponibilidad. Intenta nuevamente.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 duration-500 pb-12 px-4 md:px-0">

      {/* ================= ENCABEZADO ================= */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Configuración de Nuevo Negocio</h2>
        <p className="text-slate-500 text-xs md:text-sm">Registra la tienda y vincúlala a la cuenta de su administrador principal.</p>
      </div>

      {/* ================= ALERTA DE ERROR ================= */}
      {validationError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
          <div>
            <h4 className="text-red-800 font-bold text-sm">Validación fallida</h4>
            <p className="text-red-600 text-sm mt-0.5">{validationError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleLocalSubmit} className="space-y-8">

        {/* ================= SECCIÓN TIENDA ================= */}
        <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-slate-200">

          <h3 className="text-xl font-bold text-brand-primary mb-8 flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary shrink-0">
              <Store size={22} />
            </div>
            Datos del Establecimiento
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block ml-1">
                Nombre Comercial <span className="text-red-500">*</span>
              </label>
              <input type="text" required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all text-slate-900 text-sm"
                placeholder="Ej: Bodegón Cumaná"
                value={formData.store_name}
                onChange={(e) => {
                  setFormData({ ...formData, store_name: e.target.value });
                  if (validationError) setValidationError(null);
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block ml-1">
                URL amigable (Slug) <span className="text-red-500">*</span>
              </label>
              <input type="text" required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all text-slate-900 text-sm"
                placeholder="ej: bodegon-cumana"
                value={formData.slug}
                onChange={(e) => {
                  setFormData({ ...formData, slug: e.target.value.toLowerCase() });
                  if (validationError) setValidationError(null);
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block ml-1">
                WhatsApp de Ventas <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center h-12 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-brand-primary transition-all overflow-hidden">
                <div className="pl-4 pr-2 text-slate-400 shrink-0">
                  <Phone size={18} />
                </div>
                <input type="number" required
                  className="w-full h-full bg-transparent outline-none text-slate-900 text-sm pr-4"
                  placeholder="584120000000"
                  value={formData.owner_whatsapp}
                  onChange={(e) => {
                    setFormData({ ...formData, owner_whatsapp: e.target.value });
                    if (validationError) setValidationError(null);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block ml-1">Descripción Breve</label>
              <input type="text"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all text-slate-900 text-sm"
                placeholder="Venta de víveres y licores"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 block ml-1">Plan de Aura (Suscripción)</label>
              <select
                className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all text-slate-900 text-sm"
                value={formData.aura_plan_id}
                onChange={(e) => setFormData({ ...formData, aura_plan_id: e.target.value })}>
                <option value="">Ninguno / Plan Especial</option>
                {plansList?.map((plan: any) => (
                  <option key={plan.id} value={plan.id}>{plan.name} - ${plan.price}/mes</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 block ml-1">Monto de Plan Especial (USD)</label>
              <input type="number" step="0.01"
                className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all text-slate-900 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Ej: 15.00"
                value={formData.special_plan}
                onChange={(e) => setFormData({ ...formData, special_plan: e.target.value })}
                disabled={!!formData.aura_plan_id}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block ml-1">Logo URL (Opcional)</label>
              <div className="flex items-center h-12 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-brand-primary transition-all overflow-hidden">
                <div className="pl-4 pr-2 text-slate-400 shrink-0"><ImageIcon size={18} /></div>
                <input type="url"
                  className="w-full h-full bg-transparent outline-none text-slate-900 text-sm pr-4"
                  placeholder="https://ejemplo.com/logo.png"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block ml-1">Banner URL (Opcional)</label>
              <div className="flex items-center h-12 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-brand-primary transition-all overflow-hidden">
                <div className="pl-4 pr-2 text-slate-400 shrink-0"><ImageIcon size={18} /></div>
                <input type="url"
                  className="w-full h-full bg-transparent outline-none text-slate-900 text-sm pr-4"
                  placeholder="https://ejemplo.com/banner.jpg"
                  value={formData.banner_url}
                  onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= SECCIÓN DUEÑO ================= */}
        <div className="bg-slate-900 p-6 md:p-10 rounded-[2rem] shadow-xl border border-slate-800">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <h3 className="text-xl font-bold text-blue-400 flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
                <ShieldCheck size={22} />
              </div>
              Vinculación de Administrador
            </h3>

            <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700 w-full sm:w-auto shrink-0">
              <button type="button"
                onClick={() => setFormData({ ...formData, owner_mode: 'existing' })}
                className={`flex-1 sm:flex-initial px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 whitespace-nowrap ${formData.owner_mode === 'existing' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                Dueño Existente
              </button>
              <button type="button"
                onClick={() => setFormData({ ...formData, owner_mode: 'new' })}
                className={`flex-1 sm:flex-initial px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 whitespace-nowrap ${formData.owner_mode === 'new' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                Nuevo Dueño
              </button>
            </div>
          </div>

          <div>
            {formData.owner_mode === 'existing' ? (

              <div className="space-y-3 animate-in fade-in duration-300">
                <label className="text-sm font-semibold text-slate-300 block ml-1">
                  Selecciona el perfil al que pertenecerá esta tienda
                </label>
                <select required
                  className="w-full h-14 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  value={formData.existing_owner_id}
                  onChange={(e) => setFormData({ ...formData, existing_owner_id: e.target.value })}>
                  <option value="" className="text-slate-400">-- Buscar dueño registrado --</option>
                  {ownersList.map((owner: any) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.full_name} ({owner.email || 'Sin correo'})
                    </option>
                  ))}
                </select>
              </div>

            ) : (

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 block ml-1">
                    Nombre Completo <span className="text-blue-400">*</span>
                  </label>
                  <div className="flex items-center h-12 bg-slate-800 border border-slate-700 rounded-xl focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
                    <div className="pl-4 pr-2 text-slate-500 shrink-0"><User size={18} /></div>
                    <input type="text" required={formData.owner_mode === 'new'}
                      className="w-full h-full bg-transparent outline-none text-white text-sm placeholder-slate-500 pr-4"
                      placeholder="Juan Pérez"
                      value={formData.owner_full_name}
                      onChange={(e) => setFormData({ ...formData, owner_full_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 block ml-1">Teléfono Personal</label>
                  <div className="flex items-center h-12 bg-slate-800 border border-slate-700 rounded-xl focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
                    <div className="pl-4 pr-2 text-slate-500 shrink-0"><Phone size={18} /></div>
                    <input type="text"
                      className="w-full h-full bg-transparent outline-none text-white text-sm placeholder-slate-500 pr-4"
                      placeholder="Opcional"
                      value={formData.owner_phone}
                      onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 block ml-1">
                    Correo de Acceso <span className="text-blue-400">*</span>
                  </label>
                  <div className="flex items-center h-12 bg-slate-800 border border-slate-700 rounded-xl focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
                    <div className="pl-4 pr-2 text-slate-500 shrink-0"><Mail size={18} /></div>
                    <input type="email" required={formData.owner_mode === 'new'}
                      className="w-full h-full bg-transparent outline-none text-white text-sm placeholder-slate-500 pr-4"
                      placeholder="admin@tienda.com"
                      value={formData.owner_email}
                      onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 block ml-1">
                    Contraseña Temporal <span className="text-blue-400">*</span>
                  </label>
                  <div className="flex items-center h-12 bg-slate-800 border border-slate-700 rounded-xl focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
                    <div className="pl-4 pr-2 text-slate-500 shrink-0"><Lock size={18} /></div>
                    <input type="text" required={formData.owner_mode === 'new'}
                      className="w-full h-full bg-transparent outline-none text-white text-sm placeholder-slate-500 pr-4"
                      placeholder="Mínimo 6 caracteres"
                      value={formData.owner_password}
                      onChange={(e) => setFormData({ ...formData, owner_password: e.target.value })}
                    />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* ================= BOTÓN DE SUBMIT ================= */}
        <button type="submit" disabled={loading || isChecking}
          className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-base md:text-lg hover:bg-brand-primary/90 transition-all duration-300 flex justify-center items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed">
          {isChecking ? (
            <>
              <Search className="animate-pulse" size={22} />
              <span className="tracking-wider">VERIFICANDO DISPONIBILIDAD...</span>
            </>
          ) : loading ? (
            <>
              <Loader2 className="animate-spin" size={22} />
              <span className="tracking-wider">CREANDO NEGOCio...</span>
            </>
          ) : (
            <>
              <Plus size={22} strokeWidth={3} />
              <span className="tracking-wider">REGISTRAR NEGOCIO</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}