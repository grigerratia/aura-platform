'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      title="Volver atrás"
      className="cursor-pointer absolute top-4 left-4 z-20 bg-[#030910]/80 backdrop-blur-md p-2.5 rounded-2xl text-slate-300 shadow-md border border-emerald-950/80 hover:border-emerald-500/50 hover:text-[#00ffb2] transition active:scale-95 group flex items-center justify-center"
    >
      <ArrowLeft size={18} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
    </button>
  );
}