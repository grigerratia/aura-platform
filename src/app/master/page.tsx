'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Store, Users, CreditCard,
  Settings, LogOut, Plus, Activity, Loader2, List, UserCheck, ShieldCheck
} from 'lucide-react';

export default function MasterDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({ stores: 0, users: 0, mrr: 0 });
  const [storesList, setStoresList] = useState<any[]>([]);
  const [profilesList, setProfilesList] = useState<any[]>([]);

  // ESTADO UNIFICADO: Tienda + Dueño
  const [formData, setFormData] = useState({
    // Datos de la Tienda
    store_name: '',
    slug: '',
    owner_whatsapp: '',
    description: '',
    // Datos del Dueño (Profile)
    owner_full_name: '',
    owner_email: '',
    owner_password: '',
    owner_phone: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const { count: sCount } = await supabase.from('stores').select('*', { count: 'exact', head: true });
      const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      setStats({ stores: sCount || 0, users: uCount || 0, mrr: 0 });

      const { data: stores } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
      if (stores) setStoresList(stores);

      const { data: profiles } = await supabase.from('profiles').select('*, stores(name)').order('created_at', { ascending: false });
      if (profiles) setProfilesList(profiles);
    };
    fetchData();
  }, [activeTab]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- LÓGICA MAESTRA: CREAR TIENDA Y DUEÑO ---
  const handleCreateEverything = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Insertar la Tienda primero para obtener el ID
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .insert([{
          name: formData.store_name,
          slug: formData.slug,
          owner_whatsapp: Number(formData.owner_whatsapp),
          description: formData.description
        }])
        .select()
        .single();

      if (storeError) throw storeError;

      // 2. Crear el Usuario en Auth
      // NOTA TÉCNICA: Para no ser deslogueado, en producción usa una Edge Function con Admin Auth.
      // Aquí usamos el flujo directo que insertará en tu tabla 'profiles' vía Triggers de Supabase
      // o manualmente si no tienes el trigger activo.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.owner_email,
        password: formData.owner_password,
        options: {
          data: {
            full_name: formData.owner_full_name,
            phone: formData.owner_phone,
            role: 'owner',
            store_id: storeData.id // Vinculación inmediata
          }
        }
      });

      if (authError) throw authError;

      alert(`Éxito: Tienda "${formData.store_name}" creada y vinculada a ${formData.owner_full_name}`);

      // Limpiar formulario y refrescar
      setFormData({ store_name: '', slug: '', owner_whatsapp: '', description: '', owner_full_name: '', owner_email: '', owner_password: '', owner_phone: '' });
      setActiveTab('dashboard');

    } catch (error: any) {
      alert('Error en el proceso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-tight">Servicios Kraken</h1>
          <p className="text-xs text-slate-500 mt-1">Cumaná, Venezuela</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem icon={<LayoutDashboard />} label="Resumen" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Plus />} label="Nueva Tienda + Dueño" isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} />
          <SidebarItem icon={<Store />} label="Ver Tiendas" isActive={activeTab === 'stores'} onClick={() => setActiveTab('stores')} />
          <SidebarItem icon={<Users />} label="Ver Usuarios" isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <SidebarItem icon={<CreditCard />} label="Suscripciones" isActive={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="cursor-pointer flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-900/30 hover:text-red-400 transition">
            <LogOut size={20} /> <span className="font-medium">Salir</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">

        {/* DASHBOARD SUMMARY */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <header className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Estado de la Red Kraken</h2>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm">
                <Activity size={16} /> Online
              </span>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard title="Tiendas Registradas" value={stats.stores} />
              <MetricCard title="Dueños / Clientes" value={stats.users} />
              <MetricCard title="Ingresos Estimados" value={`$${stats.mrr}`} />
            </div>
          </div>
        )}

        {/* FORMULARIO MAESTRO: TIENDA + DUEÑO */}
        {activeTab === 'create' && (
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
        )}

        {/* TABLA TIENDAS */}
        {activeTab === 'stores' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><List size={20} className="text-blue-600" /> Directorio de Tiendas</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm">
                  <th className="p-4">Tienda</th>
                  <th className="p-4">Slug</th>
                  <th className="p-4">WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {storesList.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-bold">{s.name}</td>
                    <td className="p-4 font-mono text-xs">{s.slug}</td>
                    <td className="p-4">{s.owner_whatsapp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLA USUARIOS */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Users size={20} className="text-blue-600" /> Personal de Kraken</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm">
                  <th className="p-4">Nombre</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4">Negocio</th>
                </tr>
              </thead>
              <tbody>
                {profilesList.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-bold">{p.full_name}</td>
                    <td className="p-4 text-xs font-bold uppercase"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg">{p.role}</span></td>
                    <td className="p-4">{p.stores?.name || 'Administración'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}

// Subcomponentes
function SidebarItem({ icon, label, isActive, onClick }: any) {
  return (
    <button onClick={onClick} className={`cursor-pointer flex items-center gap-3 w-full p-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 hover:text-white text-slate-400 font-medium'}`}>{icon} <span>{label}</span></button>
  );
}

function MetricCard({ title, value }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h4 className="text-slate-500 text-xs font-bold uppercase mb-2">{title}</h4>
      <p className="text-4xl font-black text-slate-900">{value}</p>
    </div>
  );
}