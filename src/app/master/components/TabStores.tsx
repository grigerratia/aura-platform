import React from 'react';
import { List } from 'lucide-react';

export default function TabStores({ storesList }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <List size={20} className="text-blue-600" /> Directorio de Tiendas
        </h3>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-100 text-black text-sm font-bold">
            <th className="p-4">Tienda</th>
            <th className="p-4">Slug</th>
            <th className="p-4">WhatsApp</th>
          </tr>
        </thead>
        <tbody>
          {storesList.map((s: any) => (
            <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="p-4 font-bold text-black">{s.name}</td>
              <td className="p-4 font-mono text-xs text-black">{s.slug}</td>
              <td className="p-4 text-black">{s.owner_whatsapp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}