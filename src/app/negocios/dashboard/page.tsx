'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Package, Plus, Search, Edit3, Trash2, Loader2,
  CheckCircle2, AlertCircle, LogOut, ChevronRight
} from 'lucide-react';

export default function OwnerDashboard() {
  const router = useRouter();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  // Estados para búsqueda y creación
  const [searchTerm, setSearchTerm] = useState('');
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Formulario de Producto Local
  const [formData, setFormData] = useState({
    product_id: '',
    name: '', // Para crear producto nuevo si no existe
    price: '',
    stock: '',
    discount_percent: 0,
    is_active: true
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/negocios');

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    if (profile?.store_id) {
      setStoreId(profile.store_id);
      fetchInventory(profile.store_id);
    } else {
      alert("Error: No se encontró vinculación con ninguna tienda.");
      setLoading(false);
    }
  };

  const fetchInventory = async (sId: string) => {
    const { data, error } = await supabase
      .from('store_products')
      .select(`
        *,
        products (name, description, category)
      `)
      .eq('store_id', sId)
      .order('created_at', { ascending: false });

    if (data) setProducts(data);
    setLoading(false);
  };

  // Buscar en catálogo global mientras escribe
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 2) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);
        setGlobalResults(data || []);
      } else {
        setGlobalResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setLoading(true);

    try {
      let currentProductId = formData.product_id;

      // SI ES UN PRODUCTO NUEVO (No seleccionado del buscador)
      if (!currentProductId) {
        const { data: newP, error: pError } = await supabase
          .from('products')
          .insert([{ name: formData.name }])
          .select()
          .single();
        if (pError) throw pError;
        currentProductId = newP.id;
      }

      // INSERTAR EN STORE_PRODUCTS (Tabla de la imagen 1)
      const { error: spError } = await supabase
        .from('store_products')
        .insert([{
          store_id: storeId,
          product_id: currentProductId,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          discount_percent: formData.discount_percent,
          is_active: formData.is_active
        }]);

      if (spError) throw spError;

      alert("Producto añadido al inventario.");
      setIsAdding(false);
      setFormData({ product_id: '', name: '', price: '', stock: '', discount_percent: 0, is_active: true });
      fetchInventory(storeId);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("¿Eliminar del inventario?")) return;
    await supabase.from('store_products').delete().eq('id', id);
    if (storeId) fetchInventory(storeId);
  };

  if (loading && !isAdding) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Simple */}
      <aside className="w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg"><Package className="text-white" size={20} /></div>
          <span className="font-black text-slate-800 hidden md:block">KRAKEN OPS</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button className="flex items-center gap-3 w-full p-3 bg-blue-50 text-blue-700 rounded-xl font-bold"><Package size={20} /> <span className="hidden md:block">Inventario</span></button>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/negocios'))} className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-red-500 transition"><LogOut size={20} /> <span className="hidden md:block font-bold">Cerrar Sesión</span></button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mi Inventario</h1>
            <p className="text-slate-500 font-medium">Gestiona los productos visibles en tu catálogo.</p>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-600 transition shadow-xl shadow-slate-900/10">
            <Plus size={20} /> Añadir Producto
          </button>
        </header>

        {/* LISTADO DE PRODUCTOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition relative group">
              <div className={`absolute top-4 right-4 h-3 w-3 rounded-full ${item.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
              <h3 className="font-bold text-slate-900 text-lg">{item.products?.name}</h3>
              <p className="text-slate-400 text-sm mb-4">{item.products?.category || 'Sin categoría'}</p>

              <div className="flex justify-between items-end">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block">Precio</span>
                  <span className="text-2xl font-black text-blue-600">${item.price}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase block">Stock</span>
                  <span className={`font-bold ${item.stock < 5 ? 'text-red-500' : 'text-slate-700'}`}>{item.stock} unidades</span>
                </div>
              </div>

              <div className="mt-6 flex gap-2 pt-4 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition">
                <button className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200"><Edit3 size={16} /> Editar</button>
                <button onClick={() => deleteProduct(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition"><Trash2 size={20} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL PARA AÑADIR PRODUCTOS (REQUISITO: BUSCADOR) */}
        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-black text-slate-900 text-xl">Nuevo Producto</h2>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 font-bold">Cerrar</button>
              </div>

              <form onSubmit={handleSaveProduct} className="p-8 space-y-6">
                {/* BUSCADOR IA-READY */}
                <div className="space-y-2 relative">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Buscar en Catálogo Global</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input type="text" className="w-full pl-10 p-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900" placeholder="Escribe nombre del producto..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setFormData({ ...formData, name: e.target.value, product_id: '' }); }} />
                  </div>

                  {/* Resultados sugeridos */}
                  {globalResults.length > 0 && (
                    <div className="absolute w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                      {globalResults.map((p) => (
                        <button key={p.id} type="button" onClick={() => { setFormData({ ...formData, product_id: p.id, name: p.name }); setSearchTerm(p.name); setGlobalResults([]); }} className="w-full p-3 text-left hover:bg-blue-50 flex items-center justify-between group">
                          <span className="font-medium text-slate-700">{p.name}</span>
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                        </button>
                      ))}
                    </div>
                  )}
                  {searchTerm.length > 2 && globalResults.length === 0 && !formData.product_id && (
                    <p className="text-xs text-blue-600 font-bold flex items-center gap-1 mt-2">
                      <AlertCircle size={14} /> Producto no encontrado. Se creará como uno nuevo.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Precio Venta ($)</label>
                    <input type="number" step="0.01" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Stock Inicial</label>
                    <input type="number" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex justify-center items-center gap-2 hover:bg-blue-600 transition">
                  {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> Guardar en mi Tienda</>}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}