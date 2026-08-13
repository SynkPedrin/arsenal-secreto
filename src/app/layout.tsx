import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
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

/**
 * Serif de alto contraste, só para a palavra que gira na landing.
 * Ecoa o monograma DW, que também é serifado — o contraste com o Archivo é o
 * que faz a troca de palavra ser percebida como ênfase, e não como glitch.
 */
const instrument = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
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
  description: "Motor de pensamento sobre o método de David William.",
};

export const viewport: Viewport = {
  themeColor: "#060606",
};

/**
 * Raiz: só fontes, tema e a casca do documento.
 *
 * A navegação do app mora em (app)/layout.tsx. Assim a landing em /lp fica
 * full-bleed, sem barra lateral e sem o recuo do conteúdo — duas camadas
 * diferentes do produto, cada uma com a sua moldura.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${archivoDisplay.variable} ${instrument.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
