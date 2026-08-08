"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, Loader2, Mic, Plus, Square } from "lucide-react";
import { MiniWaveform } from "@/components/sphere/MiniWaveform";
import type { VoiceCapture } from "./useVoiceCapture";

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  voice,
  autoSendArmed = false,
  autoFocus = false,
  placeholder = "Pergunte ao seu arsenal…",
}: {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  voice: VoiceCapture;
  autoSendArmed?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cresce com o conteúdo até um teto, depois rola.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const recording = voice.isRecording;

  return (
    <div className="w-full">
      <div
        className={`flex items-end gap-2 rounded-[26px] border bg-panel px-3 py-2.5 transition-all duration-300 ${
          recording
            ? "border-gold-soft shadow-glow-md"
            : "border-hairline focus-within:border-hairline-strong focus-within:shadow-glow-md"
        }`}
      >
        <button
          type="button"
          aria-label="Anexar (em breve)"
          disabled
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted disabled:opacity-40"
        >
          <Plus size={18} strokeWidth={1.8} aria-hidden />
        </button>

        {recording ? (
          <div className="min-w-0 flex-1 py-1.5">
            <div className="flex items-center gap-3">
              {/* Indicador de gravação: o mic nunca fica aberto em silêncio visual. */}
              <span className="animate-pulse-dot size-2 shrink-0 rounded-full bg-amber-burnt" />
              <MiniWaveform levelSource={voice.level} active width={110} height={20} />
              <span className="text-meta min-w-0 truncate">
                {voice.activeDevice?.label ?? "Microfone"}
              </span>
            </div>

            {/* Transcrição ao vivo: você vê o que está sendo entendido enquanto fala. */}
            <p
              className={`mt-1.5 line-clamp-2 text-[15px] leading-snug ${
                voice.liveTranscript ? "text-ink" : "text-muted"
              }`}
              aria-live="polite"
            >
              {voice.liveTranscript || "Fale — eu transcrevo aqui."}
            </p>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            autoFocus={autoFocus}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={voice.isTranscribing ? "Transcrevendo…" : placeholder}
            aria-label="Mensagem"
            className="mb-1.5 max-h-[180px] min-w-0 flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-ink placeholder:text-muted focus:outline-none"
          />
        )}

        {voice.supported ? (
          <button
            type="button"
            onClick={() => (recording ? voice.stop() : void voice.start())}
            disabled={voice.isTranscribing}
            aria-label={recording ? "Parar gravação" : "Falar"}
            aria-pressed={recording}
            className={`grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-200 ${
              recording
                ? "bg-amber-burnt/20 text-amber-burnt"
                : "text-muted hover:bg-white/[0.05] hover:text-gold-soft disabled:opacity-40"
            }`}
          >
            {voice.isTranscribing ? (
              <Loader2 size={17} className="animate-spin" aria-hidden />
            ) : (
              <Mic size={18} strokeWidth={1.8} aria-hidden />
            )}
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
            onClick={onSend}
            disabled={!value.trim() || recording}
            aria-label="Enviar"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/12 text-gold transition-all duration-200 enabled:hover:bg-gold/20 enabled:hover:shadow-glow-sm disabled:opacity-30"
          >
            <ArrowUp size={18} strokeWidth={2.1} aria-hidden />
          </button>
        )}
      </div>

      {voice.error ? (
        <p className="mt-2 px-4 text-xs text-amber-burnt">{voice.error}</p>
      ) : voice.notice ? (
        <p className="mt-2 px-4 text-xs text-muted">{voice.notice}</p>
      ) : autoSendArmed ? (
        <p className="mt-2 px-4 text-xs text-muted">
          Enviando em instantes — comece a digitar para editar antes.
        </p>
      ) : null}
    </div>
  );
}
