"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { MessagesSquare, Search, Trash2 } from "lucide-react";
import {
  deleteConversation,
  loadConversations,
  serverConversations,
  subscribeConversations,
} from "@/lib/chat/store";

function quando(iso: string): string {
  const data = new Date(iso);
  const minutos = Math.floor((Date.now() - data.getTime()) / 60000);

  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  if (minutos < 60 * 24) return `há ${Math.floor(minutos / 60)}h`;
  if (minutos < 60 * 24 * 7) return `há ${Math.floor(minutos / 1440)} dias`;
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function ConversasPage() {
  const conversas = useSyncExternalStore(
    subscribeConversations,
    loadConversations,
    serverConversations,
  );
  const [busca, setBusca] = useState("");

  const q = busca.trim().toLowerCase();
  const filtradas = q
    ? conversas.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q)),
      )
    : conversas;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-16 pb-24 md:px-10">
      <header className="animate-rise mb-8">
        <p className="text-meta mb-3">Histórico</p>
        <h1 className="text-display text-3xl text-ink md:text-4xl">Conversas</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Toda conversa fica gravada com as fontes que a fundamentaram.
        </p>
      </header>

      {conversas.length > 0 ? (
        <div className="animate-rise mb-6 flex items-center gap-2.5 rounded-xl border border-hairline bg-void px-3.5 focus-within:border-hairline-strong">
          <Search size={15} className="shrink-0 text-muted" aria-hidden />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou por qualquer trecho da conversa…"
            aria-label="Buscar no histórico"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          {q ? (
            <span className="shrink-0 font-mono text-[11px] text-muted">{filtradas.length}</span>
          ) : null}
        </div>
      ) : null}

      {conversas.length === 0 ? (
        <div className="panel animate-rise flex flex-col items-center gap-5 p-12 text-center">
          <MessagesSquare size={26} className="text-gold-deep" aria-hidden />
          <div>
            <p className="text-display text-lg text-ink">Nenhuma conversa ainda</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              O que você conversar com a IA aparece aqui, com as fontes do cérebro que
              sustentaram cada resposta.
            </p>
          </div>
          <Link
            href="/"
            className="text-display rounded-full bg-gold/12 px-7 py-3 text-xs tracking-[0.16em] text-gold uppercase transition-all duration-200 hover:bg-gold/20 hover:shadow-glow-sm"
          >
            Começar
          </Link>
        </div>
      ) : filtradas.length === 0 ? (
        <p className="text-sm text-muted">Nada encontrado para “{busca}”.</p>
      ) : (
        <ul className="animate-rise space-y-2.5">
          {filtradas.map((conversa) => {
            const trocas = conversa.messages.filter((m) => !m.hidden).length;
            const fontes = new Set(
              conversa.messages.flatMap((m) => m.sources?.map((s) => s.note_title) ?? []),
            );

            return (
              <li key={conversa.id} className="group relative">
                <Link
                  href={`/?c=${conversa.id}`}
                  className="panel block p-4 transition-all duration-200 hover:border-hairline-strong md:p-5"
                >
                  <p className="pr-10 text-sm text-ink">{conversa.title}</p>

                  <p className="text-meta mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{quando(conversa.updatedAt)}</span>
                    <span aria-hidden>·</span>
                    <span>
                      {trocas} {trocas === 1 ? "mensagem" : "mensagens"}
                    </span>
                    {fontes.size > 0 ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="text-gold-soft">
                          {fontes.size} {fontes.size === 1 ? "fonte" : "fontes"}
                        </span>
                      </>
                    ) : null}
                  </p>
                </Link>

                <button
                  type="button"
                  aria-label={`Excluir conversa ${conversa.title}`}
                  onClick={() => deleteConversation(conversa.id)}
                  className="absolute top-4 right-4 grid size-8 place-items-center rounded-lg text-muted opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-amber-burnt/12 hover:text-amber-burnt focus-visible:opacity-100"
                >
                  <Trash2 size={14} strokeWidth={1.8} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
