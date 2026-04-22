'use client'; // Importante para usar hooks de cliente en Server Components

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react'; // Usamos un icono más profesional de tu librería

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      title="Volver atrás"
      // CLASES CLAVE DE TAILWIND PARA POSICIONARLO:
      // absolute: Lo saca del flujo normal (flex)
      // top-4 left-4: Lo ubica en la esquina superior izquierda
      // z-20: Asegura que esté por encima de la imagen
      className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm p-2.5 rounded-full text-slate-900 shadow-md border border-slate-200 hover:bg-black hover:text-white transition active:scale-95 group flex items-center justify-center"
    >
      <ArrowLeft size={20} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
    </button>
  );
}