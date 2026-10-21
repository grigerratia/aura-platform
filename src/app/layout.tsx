import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}

