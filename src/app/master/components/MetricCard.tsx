import React from 'react';

export default function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h4 className="text-slate-500 text-xs font-bold uppercase mb-2">{title}</h4>
      <p className="text-4xl font-black text-slate-900">{value}</p>
    </div>
  );
}