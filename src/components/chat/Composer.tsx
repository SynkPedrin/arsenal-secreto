"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Plus, Square } from "lucide-react";
import { useDictation } from "./useDictation";

export function Composer({
  onSend,
  onStop,
  busy,
  autoFocus = false,
  placeholder = "Pergunte ao seu arsenal…",
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  busy: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dictation = useDictation(setValue);

  // Cresce com o conteúdo até um teto, depois rola.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const submit = () => {
    if (!value.trim() || busy) return;
    onSend(value);
    setValue("");
  };

  return (
    <div
      className={`flex items-end gap-2 rounded-[26px] border bg-panel px-3 py-2.5 transition-all duration-300 ${
        dictation.listening
          ? "border-gold-soft shadow-glow-md"
          : "border-hairline focus-within:border-hairline-strong focus-within:shadow-glow-md"
      }`}
    >
      <button
        type="button"
        aria-label="Anexar (em breve)"
        disabled
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors duration-200 disabled:opacity-40"
      >
        <Plus size={18} strokeWidth={1.8} aria-hidden />
      </button>

      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={dictation.listening ? "Estou ouvindo…" : placeholder}
        aria-label="Mensagem"
        className="mb-1.5 max-h-[180px] min-w-0 flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-ink placeholder:text-muted focus:outline-none"
      />

      {dictation.supported ? (
        <button
          type="button"
          onClick={dictation.toggle}
          aria-label={dictation.listening ? "Parar ditado" : "Ditar"}
          aria-pressed={dictation.listening}
          className={`grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-200 ${
            dictation.listening
              ? "bg-gold/15 text-gold"
              : "text-muted hover:bg-white/[0.05] hover:text-gold-soft"
          }`}
        >
          <Mic size={18} strokeWidth={1.8} aria-hidden />
        </button>
      ) : null}

      {busy ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Parar geração"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-ink transition-colors duration-200 hover:bg-white/[0.1]"
        >
          <Square size={15} strokeWidth={2.2} fill="currentColor" aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          aria-label="Enviar"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/12 text-gold transition-all duration-200 enabled:hover:bg-gold/20 enabled:hover:shadow-glow-sm disabled:opacity-30"
        >
          <ArrowUp size={18} strokeWidth={2.1} aria-hidden />
        </button>
      )}
    </div>
  );
}
