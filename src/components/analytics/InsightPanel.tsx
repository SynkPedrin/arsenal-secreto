"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Sparkles, Target } from "lucide-react";
import type { TrainingRecord } from "@/lib/training/types";
import { profileLabel } from "@/lib/training/types";

type Insight = {
  headline: string;
  strengths: string[];
  patterns: { theme: string; evidence: string; fix: string }[];
  next_steps: string[];
  focus: string;
};

export function InsightPanel({ records }: { records: TrainingRecord[] }) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);

    const sessions = records.slice(0, 40).map((r) => ({
      date: new Date(r.finishedAt).toLocaleDateString("pt-BR"),
      profile: profileLabel(r.setup.clientProfile),
      difficulty: r.setup.difficulty,
      objective: r.setup.objective,
      result: r.debrief.result,
      score: r.debrief.score,
      missing_play: r.debrief.missing_play,
      next_training: r.debrief.next_training,
    }));

    try {
      const response = await fetch("/api/analytics/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions }),
      });
      const data = (await response.json()) as { insight?: Insight; error?: string };

      if (!response.ok || !data.insight) {
        setError(data.error ?? "Não consegui gerar o diagnóstico.");
        return;
      }
      setInsight(data.insight);
    } catch {
      setError("Falha de rede ao gerar o diagnóstico.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel p-6 md:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-display text-lg text-ink">Diagnóstico da IA</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            A leitura do padrão que atravessa todas as sessões — não de uma call isolada.
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="flex shrink-0 items-center gap-2 rounded-full bg-gold/12 px-4 py-2 text-xs text-gold transition-all duration-200 enabled:hover:bg-gold/20 enabled:hover:shadow-glow-sm disabled:opacity-40"
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" aria-hidden />
          ) : (
            <Sparkles size={13} strokeWidth={1.9} aria-hidden />
          )}
          {insight ? "Reanalisar" : "Analisar"}
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-burnt/40 bg-amber-burnt/[0.07] px-4 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-burnt" aria-hidden />
          <p className="text-sm text-ink/90">{error}</p>
        </div>
      ) : null}

      {!insight && !error && !loading ? (
        <p className="text-sm text-muted">
          {records.length} {records.length === 1 ? "sessão registrada" : "sessões registradas"}.
          Rode a análise para ver o que se repete.
        </p>
      ) : null}

      {insight ? (
        <div className="animate-rise space-y-7">
          <p className="text-[15px] leading-relaxed text-ink">{insight.headline}</p>

          {insight.strengths.length > 0 ? (
            <div>
              <p className="text-meta mb-2.5">✅ Consolidado</p>
              <ul className="space-y-1.5">
                {insight.strengths.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm text-ink/85">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-gold-deep" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {insight.patterns.length > 0 ? (
            <div>
              <p className="text-meta mb-3">❌ Padrões que se repetem</p>
              <div className="space-y-3">
                {insight.patterns.map((pattern) => (
                  <div
                    key={pattern.theme}
                    className="rounded-xl border border-hairline bg-void/50 p-4"
                  >
                    <p className="text-sm text-amber-burnt">{pattern.theme}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted">{pattern.evidence}</p>
                    <p className="mt-2.5 text-sm leading-relaxed text-ink/85">
                      <span className="text-gold-soft">Correção: </span>
                      {pattern.fix}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {insight.next_steps.length > 0 ? (
            <div>
              <p className="text-meta mb-2.5">▶️ Próximos passos</p>
              <ol className="space-y-2">
                {insight.next_steps.map((step, i) => (
                  <li key={step} className="flex gap-3 text-sm text-ink/85">
                    <span className="font-mono text-xs text-gold-deep">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="flex items-start gap-3 rounded-xl border border-hairline-strong bg-gold/[0.06] p-4">
            <Target size={16} className="mt-0.5 shrink-0 text-gold" aria-hidden />
            <div>
              <p className="text-meta mb-1">Treine isto agora</p>
              <p className="text-sm text-ink">{insight.focus}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
