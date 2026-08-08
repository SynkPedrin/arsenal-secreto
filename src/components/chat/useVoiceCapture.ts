"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createLevelSource, type LevelSource } from "@/lib/audio/levelStore";

/** Suavização do nível: sem isso a esfera treme frame a frame. */
const SMOOTHING = 0.15;
/** Silêncio contínuo que dispara o auto-stop, quando ligado. */
const SILENCE_MS = 2500;
const SILENCE_THRESHOLD = 0.045;
const MAX_DURATION_MS = 5 * 60 * 1000;

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function detectSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

const neverChanges = () => () => {};
const noSupportOnServer = () => false;

export type VoiceCapture = {
  supported: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  level: LevelSource;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
};

/**
 * Captura de voz com análise em tempo real.
 * O áudio vai para /api/transcribe ao parar; a amplitude vai para a esfera
 * enquanto grava. Encerra tracks e AudioContext sempre — mic nunca fica aberto.
 */
export function useVoiceCapture({
  onTranscript,
  autoStopOnSilence = true,
}: {
  onTranscript: (text: string) => void;
  autoStopOnSilence?: boolean;
}): VoiceCapture {
  const supported = useSyncExternalStore(neverChanges, detectSupport, noSupportOnServer);

  const [isRecording, setRecording] = useState(false);
  const [isTranscribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializador preguiçoso: uma única fonte por instância do hook.
  const [level] = useState<LevelSource>(createLevelSource);

  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const rafRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const callbackRef = useRef(onTranscript);
  const autoStopRef = useRef(autoStopOnSilence);

  useEffect(() => {
    callbackRef.current = onTranscript;
    autoStopRef.current = autoStopOnSilence;
  }, [onTranscript, autoStopOnSilence]);

  /** Desmonta tudo: rAF, tracks do microfone e AudioContext. */
  const teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    void contextRef.current?.close().catch(() => {});
    contextRef.current = null;

    recorderRef.current = null;
    level.set(0);
    level.setBands(new Uint8Array(0));
  }, [level]);

  useEffect(() => teardown, [teardown]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }
    teardown();
    setRecording(false);
  }, [teardown]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    stop();
  }, [stop]);

  const start = useCallback(async () => {
    if (!supported || recorderRef.current) return;

    setError(null);
    cancelledRef.current = false;
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError("Não consegui acessar o microfone. Verifique a permissão do navegador.");
      return;
    }

    streamRef.current = stream;

    const context = new AudioContext();
    contextRef.current = context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    context.createMediaStreamSource(stream).connect(analyser);

    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    let smoothed = 0;
    let silenceSince = performance.now();

    const measure = () => {
      analyser.getByteFrequencyData(spectrum);

      let sum = 0;
      for (const value of spectrum) sum += value * value;
      const rms = Math.sqrt(sum / spectrum.length) / 255;
      // Curva: fala normal ocupa a maior parte da faixa 0–1.
      const normalized = Math.min(1, rms * 2.6);

      smoothed += (normalized - smoothed) * SMOOTHING;
      level.set(smoothed);
      level.setBands(spectrum.slice(0, 28));

      const now = performance.now();
      if (smoothed > SILENCE_THRESHOLD) silenceSince = now;
      if (autoStopRef.current && now - silenceSince > SILENCE_MS) {
        stop();
        return;
      }

      rafRef.current = requestAnimationFrame(measure);
    };
    rafRef.current = requestAnimationFrame(measure);

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      const chunks = chunksRef.current;
      const type = recorder.mimeType || mimeType || "audio/webm";
      teardown();
      setRecording(false);

      if (cancelledRef.current || chunks.length === 0) return;

      const blob = new Blob(chunks, { type });
      // Menos de ~8KB é ruído de clique, não fala.
      if (blob.size < 8_000) {
        setError("Áudio curto demais. Segure o microfone e fale.");
        return;
      }

      setTranscribing(true);
      try {
        const form = new FormData();
        form.append("audio", blob, "fala.webm");

        const response = await fetch("/api/transcribe", { method: "POST", body: form });
        const data: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof data === "object" && data && "error" in data
              ? String((data as { error: unknown }).error)
              : "Falha na transcrição.";
          throw new Error(message);
        }

        const text =
          typeof data === "object" && data && "text" in data
            ? String((data as { text: unknown }).text).trim()
            : "";

        if (text) callbackRef.current(text);
        else setError("Não entendi o áudio. Tente de novo.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha na transcrição.");
      } finally {
        setTranscribing(false);
      }
    };

    recorder.start();
    setRecording(true);

    // Trava dura de duração — o limite da API é 25MB.
    setTimeout(() => {
      if (recorderRef.current === recorder && recorder.state !== "inactive") stop();
    }, MAX_DURATION_MS);
  }, [supported, level, stop, teardown]);

  return { supported, isRecording, isTranscribing, error, level, start, stop, cancel };
}
