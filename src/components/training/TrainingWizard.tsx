"use client";

import { useState, useSyncExternalStore } from "react";
import { Flame, Swords } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { loadHistory, serverHistory, subscribeHistory } from "@/lib/training/store";
import {
  CLIENT_PROFILES,
  type ClientProfileId,
  type Difficulty,
  type TrainingRecord,
  type TrainingSetup,
} from "@/lib/training/types";

function EvolutionStrip({ records }: { records: TrainingRecord[] }) {
  if (records.length === 0) return null;

  const recent = records.slice(0, 8).reverse();
  const average = recent.reduce((sum, r) => sum + r.debrief.score, 0) / recent.length;

  return (
    <div className="panel mt-8 p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-meta">Sua evolução</p>
        <p className="font-mono text-xs text-muted">
          média <span className="text-gold-soft">{average.toFixed(1)}</span> · {records.length}{" "}
          treinos
        </p>
      </div>

      <div className="flex h-20 items-end gap-2">
        {recent.map((record) => (
          <div key={record.id} className="group flex flex-1 flex-col items-center gap-1.5">
            <div
              className="w-full rounded-t bg-gold/25 transition-colors duration-200 group-hover:bg-gold/50"
              style={{ height: `${Math.max(6, record.debrief.score * 10)}%` }}
              title={`Nota ${record.debrief.score} — ${record.debrief.missing_play}`}
            />
            <span className="font-mono text-[10px] text-muted">{record.debrief.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrainingWizard({ onStart }: { onStart: (setup: TrainingSetup) => void }) {
  const [settings, setSettings] = useSettings();
  const [objective, setObjective] = useState("");
  const [product, setProduct] = useState(settings.product);
  const [ticket, setTicket] = useState(settings.ticket ? String(settings.ticket) : "");
  const [profile, setProfile] = useState<ClientProfileId>("cetico");
  const [difficulty, setDifficulty] = useState<Difficulty>("campo");
  const history = useSyncExternalStore(subscribeHistory, loadHistory, serverHistory);

  const ready = objective.trim().length > 3;

  const start = () => {
    if (!ready) return;
    const parsedTicket = Number(ticket.replace(/\D/g, "")) || null;

    // O que o closer vende é perfil, não dado de sessão: persiste.
    setSettings({ product, ticket: parsedTicket });

    onStart({
      objective: objective.trim(),
      product: product.trim(),
      ticket: parsedTicket,
      clientProfile: profile,
      difficulty,
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-16 pb-24 md:px-10">
      <header className="animate-rise mb-9">
        <p className="text-meta mb-3">Sparring</p>
        <h1 className="text-display text-3xl text-ink md:text-4xl">Modo Treinamento</h1>
        <p className="mt-3 text-sm text-muted">
          Eu viro seu cliente. Você conduz a call. No fim, eu disseco onde o jogo virou.
        </p>
      </header>

      <div className="panel animate-rise space-y-7 p-6 md:p-8">
        <div>
          <label htmlFor="objective" className="text-meta mb-2.5 block">
            O que você quer treinar hoje?
          </label>
          <textarea
            id="objective"
            rows={2}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Ex.: contornar 'tá caro' vendendo mentoria de R$ 15k"
            className="w-full resize-none rounded-xl border border-hairline bg-void px-4 py-3 text-[15px] text-ink placeholder:text-muted focus:border-hairline-strong focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="product" className="text-meta mb-2.5 block">
              O que você vende
            </label>
            <input
              id="product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="Mentoria de gestão para clínicas"
              className="w-full rounded-xl border border-hairline bg-void px-4 py-3 text-[15px] text-ink placeholder:text-muted focus:border-hairline-strong focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="ticket" className="text-meta mb-2.5 block">
              Ticket médio (R$)
            </label>
            <input
              id="ticket"
              inputMode="numeric"
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              placeholder="15000"
              className="w-full rounded-xl border border-hairline bg-void px-4 py-3 font-mono text-[15px] text-ink placeholder:text-muted focus:border-hairline-strong focus:outline-none"
            />
          </div>
        </div>

        <div>
          <p className="text-meta mb-3">Perfil do cliente</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {CLIENT_PROFILES.map((item) => {
              const active = profile === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setProfile(item.id)}
                  aria-pressed={active}
                  className={`rounded-xl border p-3 text-left transition-all duration-200 ${
                    active
                      ? "border-hairline-strong bg-gold/[0.07] shadow-glow-sm"
                      : "border-hairline hover:border-hairline-strong"
                  }`}
                >
                  <span className="mb-1 block text-lg">{item.icon}</span>
                  <span
                    className={`block text-[13px] font-medium ${active ? "text-gold" : "text-ink"}`}
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                    {item.blurb}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-meta mb-3">Nível</p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setDifficulty("campo")}
              aria-pressed={difficulty === "campo"}
              className={`flex items-center gap-3 rounded-xl border p-4 transition-all duration-200 ${
                difficulty === "campo"
                  ? "border-hairline-strong bg-gold/[0.07] shadow-glow-sm"
                  : "border-hairline hover:border-hairline-strong"
              }`}
            >
              <Swords size={18} className="text-gold-soft" aria-hidden />
              <span className="text-left">
                <span className="block text-sm text-ink">Campo</span>
                <span className="block text-[11px] text-muted">Realista</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDifficulty("inferno")}
              aria-pressed={difficulty === "inferno"}
              className={`flex items-center gap-3 rounded-xl border p-4 transition-all duration-200 hover:animate-[pulse-dot_0.4s_ease-in-out_1] ${
                difficulty === "inferno"
                  ? "border-amber-burnt bg-amber-burnt/[0.12]"
                  : "border-amber-burnt/35 hover:border-amber-burnt"
              }`}
            >
              <Flame size={18} className="text-amber-burnt" aria-hidden />
              <span className="text-left">
                <span className="block text-sm text-ink">Inferno</span>
                <span className="block text-[11px] text-muted">Ele quer te derrubar</span>
              </span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={start}
          disabled={!ready}
          className="text-display w-full rounded-full bg-gold/12 py-4 text-sm tracking-[0.16em] text-gold uppercase transition-all duration-300 enabled:hover:bg-gold/20 enabled:hover:shadow-glow-md disabled:opacity-30"
        >
          Iniciar sparring
        </button>
      </div>

      <EvolutionStrip records={history} />
    </div>
  );
}
