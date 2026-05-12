'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Importación de los componentes modulares
import MasterSidebar from './components/MasterSidebar';
import TabDashboard from './components/TabDashboard';
import TabCreate from './components/TabCreate';
import TabStores from './components/TabStores';
import TabUsers from './components/TabUsers';

export default function MasterDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({ stores: 0, users: 0, mrr: 0 });
  const [storesList, setStoresList] = useState<any[]>([]);
  const [profilesList, setProfilesList] = useState<any[]>([]);

  // ESTADO UNIFICADO: Tienda + Dueño
  const [formData, setFormData] = useState({
    store_name: '',
    slug: '',
    owner_whatsapp: '',
    description: '',
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
          description: formData.description
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
      <MasterSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleLogout={handleLogout}
      />

      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'dashboard' && <TabDashboard stats={stats} />}

        {activeTab === 'create' && (
          <TabCreate
            formData={formData}
            setFormData={setFormData}
            handleCreateEverything={handleCreateEverything}
            loading={loading}
          />
        )}

        {activeTab === 'stores' && <TabStores storesList={storesList} />}

        {activeTab === 'users' && <TabUsers profilesList={profilesList} />}
      </main>
    </div>
  );
}