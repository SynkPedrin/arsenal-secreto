"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Target, TrendingDown, TrendingUp } from "lucide-react";
import { BrainStatus } from "@/components/analytics/BrainStatus";
import { InsightPanel } from "@/components/analytics/InsightPanel";
import { ScoreChart } from "@/components/analytics/ScoreChart";
import { loadHistory, serverHistory, subscribeHistory } from "@/lib/training/store";
import { CLIENT_PROFILES, profileLabel, type TrainingRecord } from "@/lib/training/types";

function StatTile({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: number;
}) {
  return (
    <div className="panel p-5">
      <p className="text-meta mb-2.5">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-display text-3xl text-ink">{value}</p>
        {trend !== undefined && trend !== 0 ? (
          <span
            className={`flex items-center gap-0.5 font-mono text-xs ${
              trend > 0 ? "text-gold" : "text-amber-burnt"
            }`}
          >
            {trend > 0 ? (
              <TrendingUp size={13} aria-hidden />
            ) : (
              <TrendingDown size={13} aria-hidden />
            )}
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** Volume por perfil: magnitude, não identidade — daí uma cor só. */
function ProfileBars({ records }: { records: TrainingRecord[] }) {
  const counts = CLIENT_PROFILES.map((profile) => ({
    label: profile.label,
    icon: profile.icon,
    count: records.filter((r) => r.setup.clientProfile === profile.id).length,
  }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  const max = Math.max(...counts.map((c) => c.count), 1);

  return (
    <section className="panel p-5 md:p-6">
      <h2 className="mb-1 text-sm text-ink">Perfis enfrentados</h2>
      <p className="mb-5 text-xs text-muted">
        O que você evita treinar é onde você perde no campo.
      </p>

      <div className="space-y-3">
        {counts.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-xs text-muted">
              {row.icon} {row.label}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full bg-gold/45"
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right font-mono text-xs text-gold-soft">
              {row.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="panel flex flex-col items-center gap-5 p-12 text-center">
      <Target size={26} className="text-gold-deep" aria-hidden />
      <div>
        <p className="text-display text-lg text-ink">Nada para analisar ainda</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          O Analytics lê os seus debriefings de sparring. Faça um treino e volte aqui — a partir
          da segunda sessão a IA começa a ver padrão, não evento.
        </p>
      </div>
      <Link
        href="/treinamento"
        className="text-display rounded-full bg-gold/12 px-7 py-3 text-xs tracking-[0.16em] text-gold uppercase transition-all duration-200 hover:bg-gold/20 hover:shadow-glow-sm"
      >
        Fazer um treino
      </Link>
    </div>
  );
}

export default function AnalyticsPage() {
  const records = useSyncExternalStore(subscribeHistory, loadHistory, serverHistory);

  const scores = records.map((r) => r.debrief.score);
  const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  // Tendência: média das 3 últimas contra as 3 anteriores.
  const recent = scores.slice(0, 3);
  const previous = scores.slice(3, 6);
  const trend =
    recent.length > 0 && previous.length > 0
      ? recent.reduce((a, b) => a + b, 0) / recent.length -
        previous.reduce((a, b) => a + b, 0) / previous.length
      : undefined;

  const closed = records.filter((r) => r.debrief.result === "fechou").length;
  const hardest = [...records].sort((a, b) => a.debrief.score - b.debrief.score)[0];

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-16 pb-24 md:px-10">
      <header className="animate-rise mb-9">
        <p className="text-meta mb-3">Leitura do jogo</p>
        <h1 className="text-display text-3xl text-ink md:text-4xl">Analytics</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          O que os seus treinos e análises dizem sobre você como closer — e o que fazer com isso
          na próxima call.
        </p>
      </header>

      <div className="animate-rise mb-6">
        <BrainStatus />
      </div>

      {records.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="animate-rise space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Treinos" value={String(records.length)} />
            <StatTile
              label="Nota média"
              value={average.toFixed(1)}
              trend={trend}
              hint={trend !== undefined ? "vs. as 3 anteriores" : undefined}
            />
            <StatTile
              label="Fechamentos"
              value={`${closed}/${records.length}`}
              hint={`${Math.round((closed / records.length) * 100)}% de conversão`}
            />
            <StatTile
              label="Pior sessão"
              value={hardest ? String(hardest.debrief.score) : "—"}
              hint={hardest ? profileLabel(hardest.setup.clientProfile) : undefined}
            />
          </div>

          <ScoreChart records={records} />
          <ProfileBars records={records} />
          <InsightPanel records={records} />
        </div>
      )}
    </div>
  );
}
