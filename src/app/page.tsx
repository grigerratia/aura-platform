// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      {/* Logo de Aura */}
      <h1 className="text-5xl font-black text-brand-primary tracking-tighter mb-4">
        AURA
      </h1>
      <p className="text-slate-600 max-w-md mb-8 font-medium">
        La plataforma para que los negocios de Cumaná vendan de forma ética, justa y profesional.
      </p>

      {/* Botón de acceso rápido para que pruebes tu ruta dinámica */}
      <Link
        href="/tienda-ejemplo"
        className="bg-brand-primary text-white px-8 py-3 rounded-aura font-bold shadow-lg hover:scale-105 transition-all"
      >
        Ver Demo de Tienda
      </Link>

      <footer className="mt-20 text-slate-400 text-xs uppercase tracking-widest">
        Desarrollado con ❤️ por <a href="https://grigerdev.com" target="about_blanck">Grigerdev</a>
      </footer>
    </main>
  );
}