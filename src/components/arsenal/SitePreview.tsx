"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ExternalLink, ImageOff, RefreshCw } from "lucide-react";

/** Se o iframe não carregar nesse prazo, assumimos bloqueio e caímos no fallback. */
const LOAD_TIMEOUT_MS = 7000;

type Mode = "loading" | "framed" | "fallback";

function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-hairline bg-elevated px-4 py-2.5">
      <div className="flex gap-1.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-white/12" />
        <span className="size-2.5 rounded-full bg-white/12" />
        <span className="size-2.5 rounded-full bg-gold/45" />
      </div>
      <div className="flex-1 truncate rounded-md border border-hairline bg-void/60 px-3 py-1 text-center font-mono text-[11px] text-muted">
        {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
      </div>
    </div>
  );
}

export function SitePreview({
  url,
  previewImage,
  cta,
}: {
  url: string;
  previewImage: string | null;
  /** Destino do botão: página de vendas antes do lançamento, checkout depois. */
  cta: { label: string; href: string };
}) {
  const [mode, setMode] = useState<Mode>("loading");
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(
      () => setMode((current) => (current === "loading" ? "fallback" : current)),
      LOAD_TIMEOUT_MS,
    );
    timerRef.current = timer;
    return () => clearTimeout(timer);
  }, [attempt]);

  const handleLoad = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMode("framed");
  };

  const retry = () => {
    setMode("loading");
    setAttempt((n) => n + 1);
  };

  return (
    <div className="group relative [perspective:1600px]">
      <div className="overflow-hidden rounded-2xl border border-hairline-strong bg-panel shadow-[0_28px_90px_-30px_rgba(0,0,0,0.9)] transition-all duration-500 ease-out group-hover:shadow-glow-lg group-hover:[transform:rotateX(1.4deg)_translateY(-4px)]">
        <BrowserChrome url={url} />

        <div className="relative aspect-[16/10] w-full bg-void">
          {mode === "fallback" ? (
            previewImage ? (
              <Image
                src={previewImage}
                alt="Prévia do site Arsenal Secreto"
                fill
                sizes="(max-width: 1024px) 100vw, 960px"
                className="object-cover object-top"
                priority
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
                <ImageOff size={22} className="text-muted" aria-hidden />
                <p className="text-sm text-muted">
                  O site bloqueou a exibição embutida e ainda não há screenshot de fallback.
                </p>
                <code className="font-mono text-[11px] text-gold-soft">
                  npm run capture-preview
                </code>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-1 flex items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-xs text-muted transition-colors duration-200 hover:border-hairline-strong hover:text-gold-soft"
                >
                  <RefreshCw size={12} strokeWidth={1.8} aria-hidden />
                  Tentar de novo
                </button>
              </div>
            )
          ) : (
            <>
              <iframe
                key={attempt}
                src={url}
                title="Arsenal Secreto"
                onLoad={handleLoad}
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                className={`size-full border-0 transition-opacity duration-700 ${
                  mode === "framed" ? "opacity-100" : "opacity-0"
                }`}
              />
              {mode === "loading" ? (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="animate-glow-breath size-16 rounded-full border border-hairline" />
                </div>
              ) : null}
            </>
          )}

          {/* Véu inferior: escurece e desfoca os 30% de baixo sem travar o site. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-void via-void/80 to-transparent backdrop-blur-[2px]"
          />
        </div>
      </div>

      <a
        href={cta.href}
        target="_blank"
        rel="noopener noreferrer"
        className="animate-glow-breath absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-gold/50 bg-gold/10 px-8 py-3.5 backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:border-gold hover:bg-gold/18"
      >
        <span className="text-display text-sm tracking-[0.14em] text-gold uppercase">
          {cta.label}
        </span>
        <ExternalLink size={14} strokeWidth={2} className="text-gold" aria-hidden />
      </a>
    </div>
  );
}
