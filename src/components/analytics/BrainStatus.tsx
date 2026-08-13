"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Brain, FileText, Loader2, RefreshCw, Search } from "lucide-react";
import type { RagSource } from "@/lib/supabase/database.types";

type Status = {
  configured: boolean;
  vaultPath: string | null;
  notes: number;
  chunks: number;
  drafts: number;
};

/**
 * Estado do cérebro e depuração da busca.
 *
 * Existe porque "a IA está ligada ao vault" é invisível até dar errado. Aqui
 * dá para ver quantas notas ela realmente enxerga — e quantas estão fora do
 * índice por ainda serem rascunho.
 */
export function BrainStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RagSource[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/vault/status");
      if (response.ok) setStatus((await response.json()) as Status);
    } catch {
      // Painel some silenciosamente se o servidor não responder.
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const probe = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/vault/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      });
      const data = (await response.json()) as Status & { results: RagSource[] };
      setStatus(data);
      setResults(query ? data.results : null);
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;

  const empty = status.notes === 0;

  return (
    <section className="panel p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Brain size={18} className="mt-0.5 shrink-0 text-gold-soft" aria-hidden />
          <div>
            <h2 className="text-sm text-ink">Cérebro</h2>
            <p className="mt-1 text-xs text-muted">
              O que a IA enxerga do vault do Obsidian neste momento.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={probe}
          disabled={busy}
          className="flex shrink-0 items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-xs text-muted transition-colors duration-200 enabled:hover:border-hairline-strong enabled:hover:text-gold-soft disabled:opacity-40"
        >
          {busy ? (
            <Loader2 size={12} className="animate-spin" aria-hidden />
          ) : (
            <RefreshCw size={12} strokeWidth={1.9} aria-hidden />
          )}
          Reindexar
        </button>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          ["Notas indexadas", status.notes],
          ["Trechos", status.chunks],
          ["Rascunhos fora", status.drafts],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-hairline bg-void/50 p-3">
            <p className="text-display text-xl text-ink">{value}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted">{label}</p>
          </div>
        ))}
      </div>

      {empty ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-burnt/40 bg-amber-burnt/[0.07] p-4">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-burnt" aria-hidden />
          <div className="text-xs leading-relaxed text-ink/90">
            <p>Nenhuma nota indexada — a IA responde por princípios gerais.</p>
            <p className="mt-1 text-muted">
              {status.drafts > 0
                ? `${status.drafts} nota(s) estão como status: rascunho. Preencha com o material real do David e troque para status: pronto.`
                : "Adicione notas ao vault com status: pronto no frontmatter."}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-hairline bg-void px-3.5 focus-within:border-hairline-strong">
          <Search size={14} className="shrink-0 text-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void probe()}
            placeholder="Testar a busca: “tá caro”, “diagnóstico”…"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={probe}
          disabled={busy || !query.trim()}
          className="rounded-xl bg-gold/12 px-5 py-2.5 text-xs text-gold transition-all duration-200 enabled:hover:bg-gold/20 disabled:opacity-30"
        >
          Buscar
        </button>
      </div>

      {results !== null ? (
        <div className="mt-4 space-y-2">
          {results.length === 0 ? (
            <p className="text-xs text-muted">
              Nada encontrado. Nessa pergunta a IA diria que o método não cobre o tema.
            </p>
          ) : (
            results.map((source) => (
              <div key={source.chunk_id} className="rounded-xl border border-hairline bg-void/50 p-3">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-gold-soft">
                    <FileText size={11} strokeWidth={1.8} aria-hidden />
                    <span className="truncate">
                      {source.note_title}
                      {source.heading_path ? ` › ${source.heading_path}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted">
                    {source.score.toFixed(2)}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-muted">{source.excerpt}</p>
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
