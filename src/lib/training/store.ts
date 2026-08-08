"use client";

import type { Debrief, TrainingRecord, TrainingSetup } from "./types";

/**
 * Histórico de treinos. Vive em localStorage enquanto o Supabase não está
 * conectado — a forma do registro já é a da tabela `training_sessions`, então
 * a migração é uma cópia, não uma reescrita.
 */
const KEY = "arsenal:training-history";
const MAX_RECORDS = 60;
const EMPTY: TrainingRecord[] = [];

/** Snapshot estável: useSyncExternalStore exige identidade constante. */
let cache: TrainingRecord[] | null = null;
const listeners = new Set<() => void>();

export function loadHistory(): TrainingRecord[] {
  if (cache) return cache;

  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as TrainingRecord[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

export function serverHistory(): TrainingRecord[] {
  return EMPTY;
}

export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function saveRecord(setup: TrainingSetup, debrief: Debrief): TrainingRecord {
  const record: TrainingRecord = {
    id: crypto.randomUUID(),
    finishedAt: new Date().toISOString(),
    setup,
    debrief,
  };

  const next = [record, ...loadHistory()].slice(0, MAX_RECORDS);
  cache = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Sem persistência: o card do debriefing ainda é exibido nesta sessão.
  }

  for (const listener of listeners) listener();
  return record;
}

/**
 * Alimenta o loop adaptativo: os 3 últimos erros viram instrução para o
 * cliente da próxima sessão atacar exatamente essas fraquezas.
 */
export function recentDebriefs() {
  return loadHistory()
    .slice(0, 3)
    .map((record) => ({
      date: new Date(record.finishedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      score: record.debrief.score,
      missingPlay: record.debrief.missing_play,
    }));
}
