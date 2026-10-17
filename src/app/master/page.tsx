'use client';

import { useState, useEffect, useCallback } from 'react';
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

  // ESTADO UNIFICADO ACTUALIZADO
  const [formData, setFormData] = useState({
    // Datos de la tienda
    store_name: '',
    slug: '',
    owner_whatsapp: '',
    description: '',
    aura_plan_id: '',
    special_plan: '', // Cuota distinta
    logo_url: '',
    banner_url: '',
    // Control de Dueño
    owner_mode: 'existing', // 'existing' o 'new'
    existing_owner_id: '',  // ID del dueño si ya existe
    // Datos para dueño nuevo
    owner_full_name: '',
    owner_email: '',
    owner_password: '',
    owner_phone: ''
  });

  // Función asíncrona dedicada
  const fetchDashboardData = useCallback(async () => {
    // 1. Obtener Tiendas y cruzar con la tabla de planes para sumar el precio
    const { count: sCount, data: storesData } = await supabase
      .from('stores')
      .select('*, aura_plans(price)', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 2. Obtener Usuarios
    const { count: uCount, data: profilesData } = await supabase
      .from('profiles')
      .select('*, stores(name)', { count: 'exact' })
      .order('created_at', { ascending: false });

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
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, activeTab]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCreateEverything = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalOwnerId = formData.existing_owner_id;

      // 1. Si eligió "Nuevo Dueño", creamos el usuario en Supabase Auth primero
      if (formData.owner_mode === 'new') {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.owner_email,
          password: formData.owner_password,
          options: {
            data: {
              full_name: formData.owner_full_name,
              phone: formData.owner_phone,
              role: 'owner',
              // No le pasamos store_id al perfil, porque el dueño puede tener múltiples
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No se pudo crear el usuario administrador.");

        // Obtenemos el ID del usuario recién creado
        finalOwnerId = authData.user.id;
      } else {
        // Validamos que haya seleccionado un dueño de la lista
        if (!finalOwnerId) throw new Error("Debes seleccionar un dueño existente para la tienda.");
      }

      // 2. Creamos la tienda enlazándola al finalOwnerId
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .insert([{
          name: formData.store_name,
          slug: formData.slug,
          owner_whatsapp: Number(formData.owner_whatsapp),
          description: formData.description,
          aura_plan_id: formData.aura_plan_id || null,
          special_plan: formData.special_plan ? Number(formData.special_plan) : null,
          logo_url: formData.logo_url || null,
          banner_url: formData.banner_url || null,
          owner_id: finalOwnerId // ¡Aquí ocurre la magia de la vinculación!
        }])
        .select()
        .single();

      if (storeError) throw storeError;

      alert(`Éxito: Tienda "${formData.store_name}" registrada y vinculada correctamente.`);

      // Limpieza profunda del estado
      setFormData({
        store_name: '', slug: '', owner_whatsapp: '', description: '', aura_plan_id: '', special_plan: '', logo_url: '', banner_url: '',
        owner_mode: 'existing', existing_owner_id: '', owner_full_name: '', owner_email: '', owner_password: '', owner_phone: ''
      });
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

      <main className="flex-1 p-8 w-full overflow-y-auto">
        {activeTab === 'dashboard' && <TabDashboard stats={stats} />}

        {activeTab === 'create' && (
          <TabCreate
            formData={formData}
            setFormData={setFormData}
            handleCreateEverything={handleCreateEverything}
            loading={loading}
            plansList={plansList}
            profilesList={profilesList} // Pasamos los planes al componente
          />
        )}

        {activeTab === 'stores' && <TabStores storesList={storesList} />}

        {activeTab === 'users' && <TabUsers profilesList={profilesList} />}
      </main>
    </div>
  );
}