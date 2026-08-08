"use client";

import type { AssistantState } from "@/lib/chat/protocol";

/**
 * Núcleo visual provisório. Mantém a mesma assinatura que o
 * <ParticleSphere /> da F4 vai receber, então a troca é de uma linha só.
 */
const BY_STATE: Record<AssistantState, { core: string; ring: string; scale: number }> = {
  idle: { core: "opacity-60", ring: "opacity-40", scale: 1 },
  listening: { core: "opacity-90", ring: "opacity-70", scale: 1.05 },
  retrieving: { core: "opacity-80", ring: "opacity-90", scale: 0.9 },
  thinking: { core: "opacity-100", ring: "opacity-100", scale: 1.03 },
  answering: { core: "opacity-95", ring: "opacity-80", scale: 1.08 },
  error: { core: "opacity-70 saturate-50", ring: "opacity-50 saturate-50", scale: 0.96 },
};

export function Orb({ state, size = 220 }: { state: AssistantState; size?: number }) {
  const look = BY_STATE[state];
  const busy = state === "retrieving" || state === "thinking" || state === "answering";

  return (
    <div
      aria-hidden
      className="relative grid place-items-center transition-transform duration-700 ease-out"
      style={{ width: size, height: size, transform: `scale(${look.scale})` }}
    >
      {/* Pulsos radiais — só quando a IA está respondendo. */}
      {state === "answering" ? (
        <>
          <span className="animate-ripple absolute inset-0 rounded-full border border-gold/30" />
          <span
            className="animate-ripple absolute inset-0 rounded-full border border-gold/20"
            style={{ animationDelay: "1.3s" }}
          />
        </>
      ) : null}

      <span
        className={`animate-orbit absolute inset-[8%] rounded-full border border-dashed border-gold/25 transition-opacity duration-700 ${look.ring}`}
        style={{ animationDuration: busy ? "9s" : "22s" }}
      />
      <span
        className={`animate-orbit-rev absolute inset-[22%] rounded-full border border-gold/20 transition-opacity duration-700 ${look.ring}`}
        style={{ animationDuration: busy ? "7s" : "16s" }}
      />

      <span
        className={`animate-glow-breath absolute inset-[30%] rounded-full transition-all duration-700 ${look.core}`}
        style={{
          background:
            state === "error"
              ? "radial-gradient(circle at 50% 45%, rgba(180,84,26,0.5), transparent 70%)"
              : "radial-gradient(circle at 50% 45%, rgba(245,179,1,0.42), transparent 70%)",
          animationDuration: busy ? "1.4s" : "3.6s",
        }}
      />
    </div>
  );
}

const CAPTION: Partial<Record<AssistantState, string>> = {
  listening: "Estou ouvindo…",
  retrieving: "Consultando o cérebro…",
  thinking: "Pensando…",
  error: "Algo falhou.",
};

export function StateCaption({ state }: { state: AssistantState }) {
  const text = CAPTION[state];
  return (
    <p
      className={`text-meta h-4 transition-opacity duration-500 ${text ? "opacity-100" : "opacity-0"}`}
      role="status"
    >
      {text ?? " "}
    </p>
  );
}
