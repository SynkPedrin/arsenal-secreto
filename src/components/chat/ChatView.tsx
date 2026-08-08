"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Volume2, VolumeX } from "lucide-react";
import { greeting } from "@/lib/ai/persona";
import { profilePayload, useSettings } from "@/lib/settings";
import { MiniWaveform } from "@/components/sphere/MiniWaveform";
import { ParticleSphere, StateCaption } from "@/components/sphere/ParticleSphere";
import { Composer } from "./Composer";
import { Message } from "./Message";
import { useChat } from "./useChat";
import { useSpeech } from "./useSpeech";
import { useVoiceCapture } from "./useVoiceCapture";

/** Janela para editar a transcrição antes do envio automático. */
const AUTO_SEND_DELAY_MS = 1500;

const SUGGESTIONS = [
  { label: "🥊 Quero treinar", text: "Quero treinar. Me testa com um cliente difícil." },
  { label: "🔍 Analisar uma call", text: "Quero que você analise uma call minha." },
  { label: "🔥 Tenho call agora", text: "Tenho uma call em 10 minutos. Me aquece." },
] as const;

export function ChatView() {
  const [settings, setSettings] = useSettings();
  const [draft, setDraft] = useState("");
  const [autoSendArmed, setArmed] = useState(false);
  const autoSendRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speech = useSpeech(settings.voiceSpeed);

  const { messages, state, busy, pulse, send, stop, reset } = useChat({
    profile: profilePayload(settings),
    onReply: (text) => {
      if (settings.speakReplies) void speech.speak(text);
    },
  });

  const cancelAutoSend = useCallback(() => {
    if (autoSendRef.current) clearTimeout(autoSendRef.current);
    autoSendRef.current = null;
    setArmed(false);
  }, []);

  const submit = useCallback(
    (text?: string) => {
      const payload = (text ?? draft).trim();
      if (!payload || busy) return;
      cancelAutoSend();
      setDraft("");
      void send(payload);
    },
    [draft, busy, send, cancelAutoSend],
  );

  const voice = useVoiceCapture({
    autoStopOnSilence: settings.autoStopOnSilence,
    deviceId: settings.micDeviceId,
    onTranscript: (text) => {
      setDraft(text);
      if (settings.directSend) {
        submit(text);
        return;
      }
      setArmed(true);
      autoSendRef.current = setTimeout(() => {
        setArmed(false);
        submit(text);
      }, AUTO_SEND_DELAY_MS);
    },
  });

  useEffect(() => cancelAutoSend, [cancelAutoSend]);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleDraft = (next: string) => {
    cancelAutoSend();
    setDraft(next);
  };

  // A esfera segue o mic quando ouve e a voz da IA quando fala.
  const levelSource = voice.isRecording
    ? voice.level
    : speech.isSpeaking
      ? speech.level
      : undefined;
  const sphereState = voice.isRecording ? "listening" : state;

  const visible = messages.filter((m) => !m.hidden);
  const started = visible.length > 0;

  const speechToggle = (
    <button
      type="button"
      onClick={() => {
        if (speech.isSpeaking) speech.stop();
        setSettings({ speakReplies: !settings.speakReplies });
      }}
      title={settings.speakReplies ? "Resposta por voz ligada" : "Resposta por voz desligada"}
      className={`grid size-9 place-items-center rounded-full border transition-all duration-200 ${
        settings.speakReplies
          ? "border-hairline-strong bg-gold/10 text-gold"
          : "border-hairline text-muted hover:text-gold-soft"
      }`}
    >
      {settings.speakReplies ? (
        <Volume2 size={16} strokeWidth={1.8} aria-hidden />
      ) : (
        <VolumeX size={16} strokeWidth={1.8} aria-hidden />
      )}
      <span className="sr-only">Alternar resposta por voz</span>
    </button>
  );

  if (!started) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-20">
        <div className="animate-rise w-full max-w-2xl">
          <h1 className="text-display mb-3 text-center text-4xl md:text-5xl">
            Sua vez{settings.name ? ", " : ""}
            <span className="text-gold">{settings.name}</span>!
          </h1>
          <p className="mb-9 text-center text-sm text-muted">
            IA Arsenal — treinada no campo do David William.
          </p>

          <Composer
            value={draft}
            onChange={handleDraft}
            onSend={() => submit()}
            onStop={stop}
            busy={busy}
            voice={voice}
            autoSendArmed={autoSendArmed}
            autoFocus
          />

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => submit(item.text)}
                className="rounded-full border border-hairline px-3.5 py-1.5 text-xs text-muted transition-all duration-200 hover:border-hairline-strong hover:text-gold-soft"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3">
          <ParticleSphere
            state={sphereState}
            levelSource={levelSource}
            pulse={pulse}
            size={280}
          />
          <MiniWaveform levelSource={voice.level} active={voice.isRecording} />
          <StateCaption state={sphereState} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-hairline px-6 py-3 md:px-10">
        <ParticleSphere state={sphereState} levelSource={levelSource} pulse={pulse} size={46} />
        <div className="min-w-0 flex-1">
          <p className="text-display text-sm text-ink">IA Arsenal</p>
          <StateCaption state={sphereState} />
        </div>

        {speech.isSpeaking ? (
          <button
            type="button"
            onClick={speech.stop}
            className="rounded-full border border-hairline px-3 py-1.5 text-xs text-gold-soft transition-colors duration-200 hover:border-hairline-strong"
          >
            Parar fala
          </button>
        ) : null}
        {speechToggle}

        <button
          type="button"
          onClick={() => {
            speech.stop();
            reset();
          }}
          className="flex items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-xs text-muted transition-all duration-200 hover:border-hairline-strong hover:text-gold-soft"
        >
          <RotateCcw size={13} strokeWidth={1.8} aria-hidden />
          <span className="hidden sm:inline">Nova conversa</span>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-7 px-6 py-8 md:px-10">
          {visible.map((message) => (
            <Message
              key={message.id}
              message={message}
              streaming={busy && message.id === visible.at(-1)?.id && message.role === "assistant"}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-hairline bg-void/80 px-6 py-4 backdrop-blur-md md:px-10">
        <div className="mx-auto w-full max-w-3xl">
          <Composer
            value={draft}
            onChange={handleDraft}
            onSend={() => submit()}
            onStop={stop}
            busy={busy}
            voice={voice}
            autoSendArmed={autoSendArmed}
            placeholder="Continue…"
          />
        </div>
      </div>
    </div>
  );
}

export { greeting };
