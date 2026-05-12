import React from 'react';
import { Store, UserCheck, ShieldCheck, Loader2, Plus } from 'lucide-react';

export default function TabCreate({ formData, setFormData, handleCreateEverything, loading }: any) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-black text-slate-900">Configuración de Nuevo Negocio</h2>
        <p className="text-slate-500">Registra la tienda y su administrador en un solo paso.</p>
      </div>

      <form onSubmit={handleCreateEverything} className="space-y-6">
        {/* SECCIÓN TIENDA */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Store size={80} /></div>
          <h3 className="text-xl font-bold text-blue-600 mb-6 flex items-center gap-2">
            <Store size={24} /> Datos del Establecimiento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 ml-1">Nombre Comercial</label>
              <input type="text" required className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900" placeholder="Ej: Bodegón Cumaná" value={formData.store_name} onChange={(e) => setFormData({ ...formData, store_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 ml-1">URL amigable (Slug)</label>
              <input type="text" required className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900" placeholder="ej: bodegon-cumana" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 ml-1">WhatsApp de Ventas</label>
              <input type="number" required className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900" placeholder="58412..." value={formData.owner_whatsapp} onChange={(e) => setFormData({ ...formData, owner_whatsapp: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 ml-1">Descripción Breve</label>
              <input type="text" className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900" placeholder="Venta de víveres y licores" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
          </div>
        </div>

        {/* SECCIÓN DUEÑO */}
        <div className="bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-white"><UserCheck size={80} /></div>
          <h3 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2">
            <ShieldCheck size={24} /> Credenciales del Administrador (Owner)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            <input type="text" placeholder="Nombre del Dueño" required className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500" value={formData.owner_full_name} onChange={(e) => setFormData({ ...formData, owner_full_name: e.target.value })} />
            <input type="text" placeholder="Teléfono Personal" className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500" value={formData.owner_phone} onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })} />
            <input type="email" placeholder="Correo para Iniciar Sesión" required className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500" value={formData.owner_email} onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })} />
            <input type="password" placeholder="Contraseña Temporal" required className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500" value={formData.owner_password} onChange={(e) => setFormData({ ...formData, owner_password: e.target.value })} />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all flex justify-center items-center gap-3 shadow-2xl shadow-blue-500/20">
          {loading ? <Loader2 className="animate-spin" /> : (
            <> <Plus size={24} /> LANZAR NUEVO NEGOCIO EN KRAKEN </>
          )}
        </button>
      </form>
    </div>
  );
}