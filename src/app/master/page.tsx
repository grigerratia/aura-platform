'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

import MasterSidebar from './components/MasterSidebar';
import TabDashboard from './components/TabDashboard';
import TabCreate from './components/TabCreate';
import TabStores from './components/TabStores';
import TabUsers from './components/TabUsers';

export default function MasterDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Estados para métricas y listas
  const [stats, setStats] = useState({ stores: 0, users: 0, mrr: 0 });
  const [storesList, setStoresList] = useState<any[]>([]);
  const [profilesList, setProfilesList] = useState<any[]>([]);
  const [plansList, setPlansList] = useState<any[]>([]);

  // ESTADO UNIFICADO (Ahora incluye el ID del plan de Aura)
  const [formData, setFormData] = useState({
    store_name: '',
    slug: '',
    owner_whatsapp: '',
    description: '',
    aura_plan_id: '',
    owner_full_name: '',
    owner_email: '',
    owner_password: '',
    owner_phone: ''
  });

  // Función asíncrona dedicada (estable y compatible con Next.js 14)
  const fetchDashboardData = async () => {
    // 1. Obtener Tiendas y cruzar con la tabla de planes para sumar el precio
    const { count: sCount, data: storesData } = await supabase
      .from('stores')
      .select('*, aura_plans(price)', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 2. Obtener Usuarios
    const { count: uCount, data: profilesData } = await supabase
      .from('profiles')
      .select('*, stores(name)')
      .order('created_at', { ascending: false });

    console.log("Conteo de perfiles:", uCount);

    // 3. Obtener Planes Disponibles para el formulario
    const { data: plansData } = await supabase
      .from('aura_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    // Cálculo del MRR
    const mrr = storesData?.reduce((acc, store) => {
      const price = store.aura_plans?.price || 0;
      return acc + Number(price);
    }, 0) || 0;

    // Actualización de estados
    setStats({ stores: sCount || 0, users: uCount || 0, mrr });
    if (storesData) setStoresList(storesData);
    if (profilesData) setProfilesList(profilesData);
    if (plansData) setPlansList(plansData);
  };

  // Volvemos al patrón estándar para evitar la caída del Turbopack
  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCreateEverything = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .insert([{
          name: formData.store_name,
          slug: formData.slug,
          owner_whatsapp: Number(formData.owner_whatsapp),
          description: formData.description,
          aura_plan_id: formData.aura_plan_id // Se inserta el plan seleccionado
        }])
        .select()
        .single();

      if (storeError) throw storeError;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.owner_email,
        password: formData.owner_password,
        options: {
          data: {
            full_name: formData.owner_full_name,
            phone: formData.owner_phone,
            role: 'owner',
            store_id: storeData.id
          }
        }
      });

      if (authError) throw authError;

      alert(`Éxito: Tienda "${formData.store_name}" creada y vinculada a ${formData.owner_full_name}`);

      // Limpieza profunda del estado
      setFormData({ store_name: '', slug: '', owner_whatsapp: '', description: '', aura_plan_id: '', owner_full_name: '', owner_email: '', owner_password: '', owner_phone: '' });
      setActiveTab('dashboard');

    } catch (error: any) {
      alert('Error en el proceso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <MasterSidebar activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />

      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'dashboard' && <TabDashboard stats={stats} />}

        {activeTab === 'create' && (
          <TabCreate
            formData={formData}
            setFormData={setFormData}
            handleCreateEverything={handleCreateEverything}
            loading={loading}
            plansList={plansList} // Pasamos los planes al componente
          />
        )}

        {activeTab === 'stores' && <TabStores storesList={storesList} />}

        {activeTab === 'users' && <TabUsers profilesList={profilesList} />}
      </main>
    </div>
  );
}