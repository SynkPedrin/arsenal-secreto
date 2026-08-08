"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { listAudioInputs, savedDeviceId, type AudioInput } from "@/lib/audio/devices";
import { createLevelSource, type LevelSource } from "@/lib/audio/levelStore";
import {
  createRecognition,
  readTranscript,
  type SpeechRecognitionLike,
} from "@/lib/audio/speechRecognition";

/** Suavização do nível: sem isso a esfera treme frame a frame. */
const SMOOTHING = 0.15;
/** Silêncio contínuo que dispara o auto-stop, quando ligado. */
const SILENCE_MS = 2500;
const SILENCE_THRESHOLD = 0.045;
const MAX_DURATION_MS = 5 * 60 * 1000;
const MIN_BLOB_BYTES = 8_000;

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
  notice: string | null;
  /** O que está sendo reconhecido ao vivo, enquanto a pessoa fala. */
  liveTranscript: string;
  devices: AudioInput[];
  activeDevice: AudioInput | null;
  level: LevelSource;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  refreshDevices: () => Promise<void>;
};

/**
 * Captura de voz com análise em tempo real e transcrição em duas camadas.
 *
 * Camada 1 (browser, instantânea, grátis): Web Speech mostra o texto enquanto
 * a pessoa fala e fica guardada como plano B.
 * Camada 2 (OpenAI, ao parar): transcrição de verdade, mais precisa em PT-BR.
 * Se a camada 2 falhar — sem crédito, offline, formato recusado — o texto da
 * camada 1 é usado, e a pessoa recebe um aviso em vez de perder a fala.
 */
export function useVoiceCapture({
  onTranscript,
  autoStopOnSilence = true,
  deviceId,
}: {
  onTranscript: (text: string) => void;
  autoStopOnSilence?: boolean;
  deviceId?: string | null;
}): VoiceCapture {
  const supported = useSyncExternalStore(neverChanges, detectSupport, noSupportOnServer);

  const [isRecording, setRecording] = useState(false);
  const [isTranscribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [devices, setDevices] = useState<AudioInput[]>([]);
  const [activeDevice, setActiveDevice] = useState<AudioInput | null>(null);

  const [level] = useState<LevelSource>(createLevelSource);

  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const rafRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const localTextRef = useRef("");
  const cancelledRef = useRef(false);
  const callbackRef = useRef(onTranscript);
  const autoStopRef = useRef(autoStopOnSilence);
  const deviceRef = useRef(deviceId);

  useEffect(() => {
    callbackRef.current = onTranscript;
    autoStopRef.current = autoStopOnSilence;
    deviceRef.current = deviceId;
  }, [onTranscript, autoStopOnSilence, deviceId]);

  const refreshDevices = useCallback(async () => {
    setDevices(await listAudioInputs());
  }, []);

  // Lista inicial e reação a fone conectado/desconectado no meio do uso.
  useEffect(() => {
    if (!supported) return;

    // Fora do caminho de render: enumerar é assíncrono e, antes da permissão,
    // devolve dispositivos sem nome — nada aqui é urgente para a primeira pintura.
    const initial = setTimeout(() => void refreshDevices(), 0);
    const handler = () => void refreshDevices();
    navigator.mediaDevices.addEventListener?.("devicechange", handler);

    return () => {
      clearTimeout(initial);
      navigator.mediaDevices.removeEventListener?.("devicechange", handler);
    };
  }, [supported, refreshDevices]);

  /** Desmonta tudo: rAF, reconhecimento, tracks do microfone e AudioContext. */
  const teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;

    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    void contextRef.current?.close().catch(() => {});
    contextRef.current = null;

    recorderRef.current = null;
    setActiveDevice(null);
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
    setNotice(null);
    setLiveTranscript("");
    cancelledRef.current = false;
    chunksRef.current = [];
    localTextRef.current = "";

    const wanted = deviceRef.current ?? savedDeviceId();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(wanted ? { deviceId: { exact: wanted } } : {}),
        },
      });
    } catch {
      // Dispositivo escolhido pode ter sumido: tenta o padrão do sistema.
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        setError("Não consegui acessar o microfone. Verifique a permissão do navegador.");
        return;
      }
    }

    streamRef.current = stream;

    // Com a permissão concedida, os labels ficam legíveis — daí o refresh aqui.
    const track = stream.getAudioTracks()[0];
    const settings = track?.getSettings();
    setActiveDevice({
      deviceId: settings?.deviceId ?? "default",
      label: track?.label || "Microfone padrão",
    });
    void refreshDevices();

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

    // Camada 1: reconhecimento local, ao vivo.
    const recognition = createRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      recognition.onresult = (event) => {
        const text = readTranscript(event);
        localTextRef.current = text;
        setLiveTranscript(text);
      };
      recognition.onerror = () => {};
      recognition.onend = () => {};
      try {
        recognition.start();
      } catch {
        // Já ativo em outra instância: segue só com a camada 2.
      }
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      const chunks = chunksRef.current;
      const type = recorder.mimeType || mimeType || "audio/webm";
      const localText = localTextRef.current.trim();

      teardown();
      setRecording(false);

      if (cancelledRef.current) return;

      const blob = new Blob(chunks, { type });

      // Camada 2: transcrição de verdade.
      if (blob.size >= MIN_BLOB_BYTES) {
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "fala.webm");

          const response = await fetch("/api/transcribe", { method: "POST", body: form });
          const data: unknown = await response.json();

          if (response.ok) {
            const text =
              typeof data === "object" && data && "text" in data
                ? String((data as { text: unknown }).text).trim()
                : "";
            if (text) {
              callbackRef.current(text);
              return;
            }
          } else if (localText) {
            const reason =
              typeof data === "object" && data && "error" in data
                ? String((data as { error: unknown }).error)
                : "";
            setNotice(
              `Usei a transcrição do navegador — a da OpenAI falhou${reason ? `: ${reason}` : "."}`,
            );
            callbackRef.current(localText);
            return;
          } else {
            const message =
              typeof data === "object" && data && "error" in data
                ? String((data as { error: unknown }).error)
                : "Falha na transcrição.";
            setError(message);
            return;
          }
        } catch {
          if (localText) {
            setNotice("Usei a transcrição do navegador — a chamada de transcrição falhou.");
            callbackRef.current(localText);
            return;
          }
          setError("Falha na transcrição.");
          return;
        } finally {
          setTranscribing(false);
        }
      }

      // Áudio curto demais para a API, mas o browser pode ter entendido.
      if (localText) {
        callbackRef.current(localText);
        return;
      }
      setError("Não entendi o áudio. Segure o microfone e fale mais perto.");
    };

    recorder.start();
    setRecording(true);

    // Trava dura de duração — o limite da API é 25MB.
    setTimeout(() => {
      if (recorderRef.current === recorder && recorder.state !== "inactive") stop();
    }, MAX_DURATION_MS);
  }, [supported, level, stop, teardown, refreshDevices]);

  return {
    supported,
    isRecording,
    isTranscribing,
    error,
    notice,
    liveTranscript,
    devices,
    activeDevice,
    level,
    start,
    stop,
    cancel,
    refreshDevices,
  };
}
