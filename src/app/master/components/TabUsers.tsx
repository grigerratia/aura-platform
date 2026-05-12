import React from 'react';
import { Users } from 'lucide-react';

export default function TabUsers({ profilesList }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Users size={20} className="text-blue-600" /> Personal de Kraken
        </h3>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-100 text-black text-sm font-bold">
            <th className="p-4">Nombre</th>
            <th className="p-4">Rol</th>
            <th className="p-4">Negocio</th>
          </tr>
        </thead>
        <tbody>
          {profilesList.map((p: any) => (
            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="p-4 font-bold text-black">{p.full_name}</td>
              <td className="p-4 text-xs font-bold uppercase">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg">{p.role}</span>
              </td>
              <td className="p-4 text-black">{p.stores?.name || 'Administración'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}