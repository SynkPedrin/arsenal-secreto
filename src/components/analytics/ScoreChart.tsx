"use client";

import { useEffect, useRef, useState } from "react";
import type { TrainingRecord } from "@/lib/training/types";
import { profileLabel } from "@/lib/training/types";

const HEIGHT = 210;
const PAD = { top: 18, right: 20, bottom: 30, left: 32 };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Evolução da nota por treino. Série única — por isso não há legenda:
 * o título já nomeia a série, e cor não carrega identidade nenhuma aqui.
 */
export function ScoreChart({ records }: { records: TrainingRecord[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Cronológico: o mais antigo à esquerda.
  const series = [...records].reverse();

  const innerW = Math.max(80, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const stepX = series.length > 1 ? innerW / (series.length - 1) : 0;

  const px = (i: number) => PAD.left + (series.length > 1 ? i * stepX : innerW / 2);
  const py = (score: number) => PAD.top + innerH * (1 - score / 10);

  const path = series.map((r, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(r.debrief.score)}`).join(" ");
  const active = hover !== null ? series[hover] : null;

  return (
    <section className="panel p-5 md:p-6">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-sm text-ink">Nota por treino</h2>
          <p className="mt-1 text-xs text-muted">
            Diagnóstico, condução, postura e fechamento — 0 a 10.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="shrink-0 rounded-full border border-hairline px-2.5 py-1 font-mono text-[10px] tracking-wider text-muted uppercase transition-colors duration-200 hover:border-hairline-strong hover:text-gold-soft"
        >
          {asTable ? "Gráfico" : "Tabela"}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-panel">
              <tr className="text-muted">
                <th className="pb-2 font-normal">Data</th>
                <th className="pb-2 font-normal">Perfil</th>
                <th className="pb-2 text-right font-normal">Nota</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {series.map((r) => (
                <tr key={r.id} className="border-t border-hairline">
                  <td className="py-2 text-muted">{formatDate(r.finishedAt)}</td>
                  <td className="py-2 text-ink/80">{profileLabel(r.setup.clientProfile)}</td>
                  <td className="py-2 text-right text-gold-soft">{r.debrief.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={containerRef} className="relative">
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`Nota por treino, ${series.length} sessões`}
            onPointerLeave={() => setHover(null)}
            onPointerMove={(e) => {
              if (series.length === 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left - PAD.left;
              const index = stepX > 0 ? Math.round(x / stepX) : 0;
              setHover(Math.min(series.length - 1, Math.max(0, index)));
            }}
          >
            {/* Grade recessiva: referência, não protagonista. */}
            {[0, 5, 10].map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={py(tick)}
                  y2={py(tick)}
                  stroke="rgba(245,179,1,0.09)"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 8}
                  y={py(tick) + 3.5}
                  textAnchor="end"
                  className="fill-[var(--text-muted)] font-mono text-[10px]"
                >
                  {tick}
                </text>
              </g>
            ))}

            {active && hover !== null ? (
              <line
                x1={px(hover)}
                x2={px(hover)}
                y1={PAD.top}
                y2={PAD.top + innerH}
                stroke="rgba(245,179,1,0.28)"
                strokeWidth="1"
              />
            ) : null}

            {series.length > 1 ? (
              <path d={path} fill="none" stroke="var(--gold-core)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            ) : null}

            {series.map((r, i) => {
              const on = hover === i;
              return (
                <circle
                  key={r.id}
                  cx={px(i)}
                  cy={py(r.debrief.score)}
                  r={on ? 5.5 : 4}
                  fill="var(--gold-core)"
                  stroke="var(--bg-panel)"
                  strokeWidth="2"
                />
              );
            })}

            {/* Rótulo direto só no último ponto — número em todo ponto vira ruído. */}
            {series.length > 0 && hover === null ? (
              <text
                x={px(series.length - 1)}
                y={py(series.at(-1)!.debrief.score) - 12}
                textAnchor="end"
                className="fill-[var(--gold-soft)] font-mono text-[11px]"
              >
                {series.at(-1)!.debrief.score}
              </text>
            ) : null}

            {series.length > 0 ? (
              <>
                <text
                  x={PAD.left}
                  y={HEIGHT - 8}
                  className="fill-[var(--text-muted)] font-mono text-[10px]"
                >
                  {formatDate(series[0].finishedAt)}
                </text>
                {series.length > 1 ? (
                  <text
                    x={width - PAD.right}
                    y={HEIGHT - 8}
                    textAnchor="end"
                    className="fill-[var(--text-muted)] font-mono text-[10px]"
                  >
                    {formatDate(series.at(-1)!.finishedAt)}
                  </text>
                ) : null}
              </>
            ) : null}
          </svg>

          {active ? (
            <div
              className="pointer-events-none absolute z-10 w-56 rounded-xl border border-hairline-strong bg-elevated p-3 shadow-lg"
              style={{
                left: Math.min(Math.max(0, px(hover!) - 112), Math.max(0, width - 224)),
                top: 0,
              }}
            >
              <p className="font-mono text-[10px] text-muted">
                {formatDate(active.finishedAt)} · {profileLabel(active.setup.clientProfile)} ·{" "}
                {active.setup.difficulty}
              </p>
              <p className="text-display mt-1 text-2xl text-gold">{active.debrief.score}/10</p>
              <p className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-muted">
                {active.debrief.missing_play}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
