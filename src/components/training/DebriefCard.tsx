"use client";

import { useEffect, useState } from "react";
import { ChevronDown, RotateCcw, Sparkles } from "lucide-react";
import type { Debrief } from "@/lib/training/types";

const RESULT_COPY: Record<Debrief["result"], { label: string; tone: string }> = {
  fechou: { label: "🎯 Fechou", tone: "text-gold" },
  perdeu: { label: "🎯 Perdeu", tone: "text-amber-burnt" },
  encerrou: { label: "🎯 Encerrou", tone: "text-muted" },
};

function ScoreRing({ score }: { score: number }) {
  const [drawn, setDrawn] = useState(0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  // Anima do zero na montagem — o número aterrissa, não aparece.
  useEffect(() => {
    const timer = setTimeout(() => setDrawn(score), 120);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="relative grid size-32 shrink-0 place-items-center">
      <svg className="absolute size-32 -rotate-90" viewBox="0 0 120 120" aria-hidden>
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(245,179,1,0.12)"
          strokeWidth="6"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--gold-core)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - drawn / 10)}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="text-center">
        <p className="text-display text-4xl text-gold">{score}</p>
        <p className="text-meta">de 10</p>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-hairline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-sm text-ink">
          {title} <span className="font-mono text-xs text-muted">({count})</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? <div className="space-y-4 pb-5">{children}</div> : null}
    </div>
  );
}

export function DebriefCard({
  debrief,
  raw,
  onRepeat,
  onNew,
}: {
  debrief: Debrief | null;
  raw?: string;
  onRepeat: () => void;
  onNew: () => void;
}) {
  const actions = (
    <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
      <button
        type="button"
        onClick={onRepeat}
        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gold/12 py-3.5 text-sm text-gold transition-all duration-200 hover:bg-gold/20 hover:shadow-glow-sm"
      >
        <RotateCcw size={15} strokeWidth={1.9} aria-hidden />
        Treinar de novo
      </button>
      <button
        type="button"
        onClick={onNew}
        className="flex flex-1 items-center justify-center gap-2 rounded-full border border-hairline py-3.5 text-sm text-muted transition-all duration-200 hover:border-hairline-strong hover:text-gold-soft"
      >
        <Sparkles size={15} strokeWidth={1.9} aria-hidden />
        Novo treino
      </button>
    </div>
  );

  // Fallback gracioso: o modelo não devolveu JSON válido nas duas tentativas.
  if (!debrief) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <div className="panel p-6 md:p-8">
          <p className="text-meta mb-4">Debriefing (formato livre)</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink/90">
            {raw ?? "Não consegui gerar o debriefing desta sessão."}
          </p>
          {actions}
        </div>
      </div>
    );
  }

  const result = RESULT_COPY[debrief.result];

  return (
    <div className="animate-rise mx-auto w-full max-w-2xl px-6 py-12">
      <div className="panel p-6 md:p-8">
        <div className="mb-7 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <ScoreRing score={debrief.score} />
          <div className="min-w-0 text-center sm:text-left">
            <p className={`text-display text-2xl ${result.tone}`}>{result.label}</p>
            <p className="mt-2 text-xs text-muted">
              Diagnóstico · condução · postura · fechamento
            </p>
          </div>
        </div>

        <Section title="✅ O que segurou a call" count={debrief.hits.length} defaultOpen>
          {debrief.hits.map((hit, i) => (
            <div key={i}>
              <blockquote className="border-l-2 border-gold-deep pl-3 text-sm text-ink/90 italic">
                “{hit.quote}”
              </blockquote>
              <p className="mt-1.5 pl-3 text-xs text-muted">{hit.why}</p>
            </div>
          ))}
        </Section>

        <Section title="❌ Onde o jogo quase virou" count={debrief.turning_points.length} defaultOpen>
          {debrief.turning_points.map((point, i) => (
            <div key={i}>
              <blockquote className="border-l-2 border-amber-burnt pl-3 text-sm text-ink/90 italic">
                “{point.quote}”
              </blockquote>
              <p className="mt-1.5 pl-3 text-xs text-muted">{point.effect}</p>
            </div>
          ))}
        </Section>

        <div className="border-t border-hairline py-5">
          <p className="text-meta mb-2.5">🔁 A jogada que faltou</p>
          <p className="text-sm leading-relaxed text-ink/90">{debrief.missing_play}</p>
        </div>

        <div className="border-t border-hairline pt-5">
          <p className="text-meta mb-2.5">▶️ Próximo treino</p>
          <p className="text-sm text-gold-soft">{debrief.next_training}</p>
        </div>

        {actions}
      </div>
    </div>
  );
}
