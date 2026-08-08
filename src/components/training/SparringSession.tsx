"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Lightbulb, Pause, Volume2, VolumeX } from "lucide-react";
import { Composer } from "@/components/chat/Composer";
import { Message } from "@/components/chat/Message";
import { useChat } from "@/components/chat/useChat";
import { useSpeech } from "@/components/chat/useSpeech";
import { useVoiceCapture } from "@/components/chat/useVoiceCapture";
import { ParticleSphere } from "@/components/sphere/ParticleSphere";
import { profilePayload, useSettings } from "@/lib/settings";
import { recentDebriefs } from "@/lib/training/store";
import { profileLabel, type Debrief, type TrainingSetup } from "@/lib/training/types";

const AUTO_SEND_DELAY_MS = 1500;

const COMMANDS = [
  { icon: Pause, label: "Pausa", command: "#pausa" },
  { icon: Lightbulb, label: "Dica", command: "#dica" },
  { icon: Flag, label: "Encerrar", command: "#encerrar" },
] as const;

function Timer({ since }: { since: number }) {
  const [now, setNow] = useState(since);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const total = Math.max(0, Math.floor((now - since) / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");

  return (
    <span className="font-mono text-xs text-muted tabular-nums">
      {mm}:{ss}
    </span>
  );
}

export function SparringSession({
  setup,
  onFinished,
}: {
  setup: TrainingSetup;
  onFinished: (debrief: Debrief | null, raw?: string) => void;
}) {
  const [settings, setSettings] = useSettings();
  const [draft, setDraft] = useState("");
  const [autoSendArmed, setArmed] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const autoSendRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedRef = useRef(false);

  const speech = useSpeech(settings.voiceSpeed);

  const { messages, state, busy, pulse, send, stop } = useChat({
    profile: profilePayload(settings),
    training: {
      objective: setup.objective,
      product: setup.product || undefined,
      ticket: setup.ticket ?? undefined,
      clientProfile: profileLabel(setup.clientProfile),
      difficulty: setup.difficulty,
      recentDebriefs: recentDebriefs(),
    },
    onReply: (text) => {
      if (settings.speakReplies) void speech.speak(text);
    },
  });

  // Abertura: o cliente entra na call sem que o closer tenha que dizer "começar".
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    void send("começar", { hidden: true });
  }, [send]);

  const cancelAutoSend = useCallback(() => {
    if (autoSendRef.current) clearTimeout(autoSendRef.current);
    autoSendRef.current = null;
    setArmed(false);
  }, []);

  useEffect(() => cancelAutoSend, [cancelAutoSend]);

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

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    stop();
    speech.stop();

    const transcript = messages
      .filter((m) => !m.hidden && !m.error && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    if (transcript.length < 2) {
      onFinished(null, "A sessão terminou cedo demais para gerar um debriefing.");
      return;
    }

    try {
      const response = await fetch("/api/training/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, objective: setup.objective }),
      });
      const data = (await response.json()) as { debrief?: Debrief | null; raw?: string; error?: string };

      if (!response.ok) {
        onFinished(null, data.error ?? "Falha ao gerar o debriefing.");
        return;
      }
      onFinished(data.debrief ?? null, data.raw);
    } catch {
      onFinished(null, "Falha de rede ao gerar o debriefing.");
    }
  }, [finishing, messages, onFinished, setup.objective, speech, stop]);

  const runCommand = (command: string) => {
    if (command === "#encerrar") {
      void finish();
      return;
    }
    submit(command);
  };

  const levelSource = voice.isRecording
    ? voice.level
    : speech.isSpeaking
      ? speech.level
      : undefined;
  const sphereState = voice.isRecording ? "listening" : state;
  const inferno = setup.difficulty === "inferno";
  const visible = messages.filter((m) => !m.hidden);

  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b border-hairline px-5 py-3 md:px-8">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          {/* Anel de modo: âmbar em sparring sinaliza "você está sendo testado". */}
          <div
            className={`grid shrink-0 place-items-center rounded-full border-2 p-0.5 ${
              inferno ? "border-amber-burnt/70" : "border-gold/40"
            }`}
          >
            <ParticleSphere
              state={sphereState}
              levelSource={levelSource}
              pulse={pulse}
              size={40}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm text-ink">
              <span className="text-display">{profileLabel(setup.clientProfile)}</span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase ${
                  inferno
                    ? "bg-amber-burnt/15 text-amber-burnt"
                    : "bg-gold/10 text-gold-soft"
                }`}
              >
                {inferno ? "🔥 Inferno" : "⚔️ Campo"}
              </span>
              <Timer since={startedAt} />
            </p>
            <p className="truncate text-xs text-muted">{setup.objective}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (speech.isSpeaking) speech.stop();
              setSettings({ speakReplies: !settings.speakReplies });
            }}
            title="Resposta por voz"
            className={`grid size-9 shrink-0 place-items-center rounded-full border transition-all duration-200 ${
              settings.speakReplies
                ? "border-hairline-strong bg-gold/10 text-gold"
                : "border-hairline text-muted hover:text-gold-soft"
            }`}
          >
            {settings.speakReplies ? (
              <Volume2 size={15} aria-hidden />
            ) : (
              <VolumeX size={15} aria-hidden />
            )}
            <span className="sr-only">Alternar resposta por voz</span>
          </button>

          <button
            type="button"
            onClick={() => void finish()}
            disabled={finishing}
            className="shrink-0 rounded-full border border-amber-burnt/45 px-3 py-1.5 text-xs text-amber-burnt transition-colors duration-200 hover:border-amber-burnt disabled:opacity-40"
          >
            {finishing ? "Analisando…" : "Encerrar treino"}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8 md:px-8">
          {visible.map((message) => (
            <Message
              key={message.id}
              message={message}
              streaming={busy && message.id === visible.at(-1)?.id && message.role === "assistant"}
              assistantLabel={profileLabel(setup.clientProfile)}
              assistantTone={inferno ? "burn" : "gold"}
            />
          ))}
          {finishing ? (
            <p className="text-meta text-center">Montando o debriefing…</p>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-hairline bg-void/80 px-6 py-4 backdrop-blur-md md:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-2.5 flex gap-2">
            {COMMANDS.map((item) => (
              <button
                key={item.command}
                type="button"
                onClick={() => runCommand(item.command)}
                disabled={busy || finishing}
                className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs text-muted transition-all duration-200 enabled:hover:border-hairline-strong enabled:hover:text-gold-soft disabled:opacity-35"
              >
                <item.icon size={12} strokeWidth={1.9} aria-hidden />
                {item.label}
              </button>
            ))}
          </div>

          <Composer
            value={draft}
            onChange={(next) => {
              cancelAutoSend();
              setDraft(next);
            }}
            onSend={() => submit()}
            onStop={stop}
            busy={busy}
            voice={voice}
            autoSendArmed={autoSendArmed}
            placeholder="Conduza a call…"
          />
        </div>
      </div>
    </div>
  );
}
