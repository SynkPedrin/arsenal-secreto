"use client";

import type { ChatMessage } from "./protocol";

/**
 * Histórico de conversas.
 *
 * Vive em localStorage enquanto o Supabase não tem chaves. O formato do
 * registro é o das tabelas `conversations` e `messages` (ver
 * supabase/migrations/0001_init.sql), então migrar é copiar, não reescrever.
 */
const KEY = "arsenal:conversations";
const MAX = 100;

export type StoredConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

const EMPTY: StoredConversation[] = [];

let cache: StoredConversation[] | null = null;
const listeners = new Set<() => void>();

function persist(next: StoredConversation[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, MAX)));
  } catch {
    // Sem persistência: a conversa segue viva só nesta aba.
  }
  for (const listener of listeners) listener();
}

export function loadConversations(): StoredConversation[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as StoredConversation[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

export function serverConversations(): StoredConversation[] {
  return EMPTY;
}

export function subscribeConversations(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getConversation(id: string): StoredConversation | undefined {
  return loadConversations().find((c) => c.id === id);
}

/** Título derivado da primeira pergunta — sem gastar chamada de modelo. */
function titleFrom(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user" && !m.hidden);
  if (!first) return "Nova conversa";
  const clean = first.content.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? `${clean.slice(0, 60)}…` : clean;
}

/**
 * Grava o estado atual da conversa. Chamado ao fim de cada resposta —
 * salvar a cada token seria escrita em disco a 60fps sem ganho nenhum.
 */
export function saveConversation(id: string, messages: ChatMessage[]): void {
  const visible = messages.filter((m) => !m.hidden && m.content.trim());
  if (visible.length === 0) return;

  const now = new Date().toISOString();
  const existing = loadConversations();
  const previous = existing.find((c) => c.id === id);

  const record: StoredConversation = {
    id,
    title: previous?.title ?? titleFrom(messages),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    messages,
  };

  persist([record, ...existing.filter((c) => c.id !== id)]);
}

export function deleteConversation(id: string): void {
  persist(loadConversations().filter((c) => c.id !== id));
}

export function clearConversations(): void {
  persist([]);
}

/** Busca por título e por conteúdo das mensagens. */
export function searchConversations(query: string): StoredConversation[] {
  const all = loadConversations();
  const q = query.trim().toLowerCase();
  if (!q) return all;

  return all.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.messages.some((m) => m.content.toLowerCase().includes(q)),
  );
}
