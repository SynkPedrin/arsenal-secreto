"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createLevelSource, type LevelSource } from "@/lib/audio/levelStore";

/**
 * Fala da IA. Passa o áudio por um AnalyserNode antes da saída, para a esfera
 * pulsar no ritmo da voz — o mesmo canal usado na captura, agora invertido.
 */
export function useSpeech(speed = 1.05) {
  const [isSpeaking, setSpeaking] = useState(false);

  const [level] = useState<LevelSource>(createLevelSource);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);
  const urlRef = useRef<string | null>(null);
  const speedRef = useRef(speed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const cleanupAudio = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    level.set(0);
    level.setBands(new Uint8Array(0));
  }, [level]);

  const stop = useCallback(() => {
    cleanupAudio();
    setSpeaking(false);
  }, [cleanupAudio]);

  useEffect(
    () => () => {
      cleanupAudio();
      void contextRef.current?.close().catch(() => {});
      contextRef.current = null;
    },
    [cleanupAudio],
  );

  const speak = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      stop();

      let blob: Blob;
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean.slice(0, 4000), speed: speedRef.current }),
        });
        if (!response.ok) return;
        blob = await response.blob();
      } catch {
        return;
      }

      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;

      // Um AudioContext por hook: recriar a cada fala estoura o limite do browser.
      contextRef.current ??= new AudioContext();
      const context = contextRef.current;
      if (context.state === "suspended") await context.resume().catch(() => {});

      analyserRef.current ??= context.createAnalyser();
      const analyser = analyserRef.current;
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;

      try {
        const source = context.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(context.destination);
      } catch {
        // Fallback: sem análise, mas o áudio ainda toca.
      }

      const spectrum = new Uint8Array(analyser.frequencyBinCount);
      let smoothed = 0;

      const measure = () => {
        analyser.getByteFrequencyData(spectrum);
        let sum = 0;
        for (const value of spectrum) sum += value * value;
        const rms = Math.sqrt(sum / spectrum.length) / 255;

        smoothed += (Math.min(1, rms * 2.4) - smoothed) * 0.15;
        level.set(smoothed);
        level.setBands(spectrum.slice(0, 28));

        rafRef.current = requestAnimationFrame(measure);
      };

      audio.onended = stop;
      audio.onerror = stop;

      try {
        await audio.play();
        setSpeaking(true);
        rafRef.current = requestAnimationFrame(measure);
      } catch {
        stop();
      }
    },
    [level, stop],
  );

  return { speak, stop, isSpeaking, level };
}
