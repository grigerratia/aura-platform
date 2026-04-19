import { supabase } from "@/lib/supabase";

export default async function TestDB() {
  // Intentamos traer algo de la tabla products
  const { data, error } = await supabase.from('products').select('*');

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">Estado de la Base de Datos:</h1>
      {error ? (
        <p className="text-red-500">Error: {error.message}</p>
      ) : (
        <pre className="bg-slate-100 p-4">{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}