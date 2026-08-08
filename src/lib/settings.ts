"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Preferências locais. Vive em localStorage até existir a tabela `user_profile`
 * no Supabase — a forma do objeto já é a que a tabela vai ter.
 */
export type Settings = {
  /** Perfil do closer, injetado no system prompt. */
  name: string;
  product: string;
  ticket: number | null;
  niche: string;

  /** Voz. */
  autoStopOnSilence: boolean;
  directSend: boolean;
  speakReplies: boolean;
  voiceSpeed: number;
  /** null = microfone padrão do sistema. */
  micDeviceId: string | null;
};

export const DEFAULT_SETTINGS: Settings = {
  name: "",
  product: "",
  ticket: null,
  niche: "",
  autoStopOnSilence: true,
  directSend: false,
  speakReplies: false,
  voiceSpeed: 1.05,
  micDeviceId: null,
};

const KEY = "arsenal:settings";

let cache: Settings = DEFAULT_SETTINGS;
let loaded = false;
const listeners = new Set<() => void>();

function load(): Settings {
  if (loaded) return cache;
  loaded = true;

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cache = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    // Storage bloqueado ou JSON corrompido: segue com o padrão.
  }
  return cache;
}

function emit() {
  for (const listener of listeners) listener();
}

export function updateSettings(patch: Partial<Settings>) {
  cache = { ...load(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Sem persistência: mantém em memória nesta sessão.
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const settings = useSyncExternalStore(subscribe, load, () => DEFAULT_SETTINGS);
  const set = useCallback((patch: Partial<Settings>) => updateSettings(patch), []);
  return [settings, set];
}

/** Recorte do perfil enviado ao servidor. Campos vazios são omitidos. */
export function profilePayload(settings: Settings) {
  return {
    ...(settings.name ? { name: settings.name } : {}),
    ...(settings.product ? { product: settings.product } : {}),
    ...(settings.ticket ? { ticket: settings.ticket } : {}),
    ...(settings.niche ? { niche: settings.niche } : {}),
  };
}
