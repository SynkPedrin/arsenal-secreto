"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createLevelSource, type LevelSource } from "@/lib/audio/levelStore";

/**
 * Fala da IA pela síntese do próprio navegador.
 *
 * A Groq só oferece TTS em inglês (orpheus), e a resposta é em português —
 * então a voz vem do sistema, que tem vozes pt-BR nativas, funciona offline
 * e não custa nada. A contrapartida: `speechSynthesis` não expõe o áudio,
 * então não dá para ligar um AnalyserNode nele. A amplitude que alimenta a
 * esfera é derivada dos eventos de fronteira de palavra — cada palavra dita
 * dá um pico que decai. Não é o envelope real, mas acompanha o ritmo da fala.
 */

const PULSE_DECAY_PER_SECOND = 2.6;

/** Tira a marcação para a voz não ler asterisco e cerquilha. */
function toSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/!?\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/(\*\*|__|\*|_|~~)/g, "")
    .replace(/^[-—·•]\s*/gm, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function detectSupport(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

const neverChanges = () => () => {};
const noSupportOnServer = () => false;

/** Melhor voz pt-BR disponível; cai para qualquer português. */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  return (
    voices.find((v) => v.lang === "pt-BR" && !v.localService) ??
    voices.find((v) => v.lang === "pt-BR") ??
    voices.find((v) => v.lang.startsWith("pt")) ??
    null
  );
}

export function useSpeech(speed = 1.05) {
  const supported = useSyncExternalStore(neverChanges, detectSupport, noSupportOnServer);
  const [isSpeaking, setSpeaking] = useState(false);
  const [level] = useState<LevelSource>(createLevelSource);

  const rafRef = useRef(0);
  const pulseRef = useRef(0);
  const speedRef = useRef(speed);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const stopMeter = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    pulseRef.current = 0;
    level.set(0);
    level.setBands(new Uint8Array(0));
  }, [level]);

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    stopMeter();
    setSpeaking(false);
  }, [supported, stopMeter]);

  // Nenhuma fala sobrevive à saída da tela.
  useEffect(() => stop, [stop]);

  const speak = useCallback(
    async (text: string) => {
      if (!supported) return;

      const clean = toSpeech(text);
      if (!clean) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "pt-BR";
      utterance.rate = speedRef.current;
      utterance.pitch = 0.95;

      const voice = pickVoice();
      if (voice) utterance.voice = voice;

      // Envelope sintético: pico a cada palavra, decaimento contínuo.
      let last = performance.now();
      const bands = new Uint8Array(28);

      const meter = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;

        pulseRef.current = Math.max(0, pulseRef.current - dt * PULSE_DECAY_PER_SECOND);
        const wobble = 0.12 + Math.sin(now / 90) * 0.04;
        const value = Math.min(1, pulseRef.current + wobble);

        level.set(value);
        for (let i = 0; i < bands.length; i += 1) {
          const shape = Math.sin((i / bands.length) * Math.PI);
          bands[i] = Math.round(value * 255 * (0.4 + shape * 0.6));
        }
        level.setBands(bands);

        rafRef.current = requestAnimationFrame(meter);
      };

      utterance.onboundary = () => {
        pulseRef.current = 0.85;
      };
      utterance.onstart = () => {
        setSpeaking(true);
        last = performance.now();
        rafRef.current = requestAnimationFrame(meter);
      };
      utterance.onend = () => {
        utteranceRef.current = null;
        stopMeter();
        setSpeaking(false);
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
        stopMeter();
        setSpeaking(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported, level, stopMeter],
  );

  return { speak, stop, isSpeaking, level, supported };
}
