import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatusPill } from "@/components/layout/StatusPill";
import "./globals.css";

/** Corpo: Archivo em peso variável. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

/** Display: mesma família, eixo de largura expandido (font-stretch). */
const archivoDisplay = Archivo({
  variable: "--font-archivo-display",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

/** Metadados e fontes do RAG. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arsenal",
  description: "Motor de pensamento sobre o seu cofre do Obsidian.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${archivoDisplay.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Sidebar initials="PE" />

        <div className="fixed top-5 right-5 z-30">
          <StatusPill status="online" />
        </div>

        <main className="relative z-10 min-h-dvh pb-16 md:pb-0 md:pl-[68px]">{children}</main>
      </body>
    </html>
  );
}
