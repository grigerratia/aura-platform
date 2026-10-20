import type { Metadata } from "next";
import "./globals.css";
import ThanosSvgFilter from "@/components/vfx/ThanosSvgFilter";
import AshParticleOverlay from "@/components/vfx/AshParticleOverlay";

export const metadata: Metadata = {
  title: "Aura",
  description: "Tu Centro Comercial online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {/* Filtro SVG acelerado por GPU de desintegración Thanos */}
        <ThanosSvgFilter />

        {/* Capa de partículas de ceniza en único canvas a 60 FPS */}
        <AshParticleOverlay />

        {children}
      </body>
    </html>
  );
}

