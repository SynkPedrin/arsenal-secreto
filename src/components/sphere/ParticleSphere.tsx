"use client";

import { useEffect, useRef } from "react";
import { BRAND_RGB } from "@/lib/brand";
import type { AssistantState } from "@/lib/chat/protocol";

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const MAX_PARTICLES = 1800;
const MIN_PARTICLES = 520;
/** Constante de tempo da interpolação entre estados (~600ms para 95%). */
const LERP_TAU = 0.2;

type Params = {
  /** Rotação em radianos por segundo. */
  spin: number;
  /** Escala do raio da esfera. */
  radius: number;
  /** 0–1: convergência em espiral para o núcleo. */
  spiral: number;
  /** 0–1: deslocamento turbulento das partículas. */
  turbulence: number;
  /** 0–1: brilho do núcleo e das partículas. */
  glow: number;
  /** 0–1: quanto o vermelho-âmbar substitui o dourado. */
  burn: number;
};

const BY_STATE: Record<AssistantState, Params> = {
  idle: { spin: 0.16, radius: 1, spiral: 0, turbulence: 0.05, glow: 0.42, burn: 0 },
  listening: { spin: 0.2, radius: 1.02, spiral: 0, turbulence: 0.06, glow: 0.6, burn: 0 },
  retrieving: { spin: 0.34, radius: 0.92, spiral: 1, turbulence: 0.08, glow: 0.72, burn: 0 },
  thinking: { spin: 0.24, radius: 1.01, spiral: 0, turbulence: 1, glow: 0.86, burn: 0 },
  answering: { spin: 0.22, radius: 1.05, spiral: 0, turbulence: 0.18, glow: 0.78, burn: 0 },
  error: { spin: 0.1, radius: 0.96, spiral: 0, turbulence: 0.5, glow: 0.5, burn: 1 },
};

type Particle = { x: number; y: number; z: number; seed: number };

function fibonacciSphere(count: number): Particle[] {
  const points: Particle[] = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * i;
    points[i] = {
      x: Math.cos(theta) * ring,
      y,
      z: Math.sin(theta) * ring,
      // Fase própria: sem isso a turbulência ficaria sincronizada e artificial.
      seed: (i * 0.6180339887) % 1,
    };
  }
  return points;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Esfera de partículas reativa. Canvas 2D com projeção 3D→2D manual —
 * nenhuma dependência de WebGL, e degrada sozinha se o frame atrasar.
 */
export function ParticleSphere({
  state,
  audioLevel = 0,
  levelSource,
  pulse = 0,
  size = 280,
  className = "",
}: {
  state: AssistantState;
  /** 0–1, já suavizado pelo chamador. */
  audioLevel?: number;
  /**
   * Fonte viva de amplitude, lida dentro do rAF. Preferir a esta prop quando o
   * valor muda a 60fps — evita re-render da árvore inteira a cada frame.
   */
  levelSource?: { get(): number };
  /** Contador incremental: cada mudança emite uma onda radial. */
  pulse?: number;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const audioRef = useRef(audioLevel);
  const pulseRef = useRef(pulse);
  const sourceRef = useRef(levelSource);

  // As props mudam por render; o loop de animação lê por ref para não
  // reiniciar o canvas a cada mudança de estado.
  useEffect(() => {
    stateRef.current = state;
    audioRef.current = audioLevel;
    pulseRef.current = pulse;
    sourceRef.current = levelSource;
  }, [state, audioLevel, pulse, levelSource]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let count = reduced ? MIN_PARTICLES : MAX_PARTICLES;
    let particles = fibonacciSphere(count);
    let frame = 0;
    let running = true;
    let last = performance.now();
    let elapsed = 0;
    let angle = 0;
    let seenPulse = pulseRef.current;

    // Ondas radiais em espaço de tela, emitidas a cada burst de tokens.
    let rings: { r: number; life: number }[] = [];

    // Média móvel do frame time para decidir a degradação.
    let frameAvg = 16;
    let degraded = false;

    let width = size;
    let height = size;

    const current: Params = { ...BY_STATE.idle };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width || size;
      height = rect.height || size;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      if (!running) return;

      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      frameAvg = frameAvg * 0.94 + dt * 1000 * 0.06;
      if (!degraded && !reduced && frameAvg > 20 && elapsed > 2) {
        // Notebook não está aguentando: corta partículas uma única vez.
        degraded = true;
        count = Math.max(MIN_PARTICLES, Math.round(count * 0.55));
        particles = fibonacciSphere(count);
      }

      const target = BY_STATE[stateRef.current];
      const t = 1 - Math.exp(-dt / LERP_TAU);
      current.spin = lerp(current.spin, target.spin, t);
      current.radius = lerp(current.radius, target.radius, t);
      current.spiral = lerp(current.spiral, target.spiral, t);
      current.turbulence = lerp(current.turbulence, target.turbulence, t);
      current.glow = lerp(current.glow, target.glow, t);
      current.burn = lerp(current.burn, target.burn, t);

      const live = stateRef.current;
      const audio =
        live === "listening" || live === "answering"
          ? (sourceRef.current?.get() ?? audioRef.current)
          : 0;

      if (pulseRef.current !== seenPulse) {
        seenPulse = pulseRef.current;
        if (rings.length < 6) rings.push({ r: 0.18, life: 1 });
      }
      rings = rings.filter((ring) => {
        ring.r += dt * 0.9;
        ring.life -= dt * 0.85;
        return ring.life > 0;
      });

      // Voz: +25% de rotação, +12% de raio, +40% de brilho.
      angle += dt * current.spin * (1 + audio * 0.25);
      const breath = Math.sin(elapsed * 0.9) * 0.02;
      const baseRadius = (Math.min(width, height) / 2) * 0.78;
      const radiusScale = current.radius * (1 + breath + audio * 0.12);
      const glow = Math.min(1, current.glow * (1 + audio * 0.4));

      const cx = width / 2;
      const cy = height / 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const tiltCos = Math.cos(0.42);
      const tiltSin = Math.sin(0.42);
      const fov = 2.6;

      ctx.clearRect(0, 0, width, height);

      // Núcleo.
      const coreR = baseRadius * (0.34 + audio * 0.1);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      const hot = current.burn > 0.5 ? BRAND_RGB.amber : BRAND_RGB.gold;
      core.addColorStop(0, `rgba(${hot}, ${(0.3 * glow).toFixed(3)})`);
      core.addColorStop(1, `rgba(${hot}, 0)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < count; i += 1) {
        const p = particles[i];

        // Convergência em espiral: puxa para o núcleo torcendo no caminho.
        let r = 1;
        if (current.spiral > 0.001) {
          const wave = 0.5 + 0.5 * Math.sin(elapsed * 2.2 - p.seed * 6.28);
          r -= current.spiral * 0.5 * wave;
        }

        if (current.turbulence > 0.001) {
          const n =
            Math.sin(p.seed * 12.9898 + elapsed * 1.9) *
            Math.cos(p.seed * 78.233 + elapsed * 1.4);
          r += current.turbulence * 0.16 * n;
        }

        // Torção proporcional à distância percorrida rumo ao centro.
        const twist = current.spiral * 2.4 * (1 - r);
        const a = angle + twist;
        const ca = twist === 0 ? cosA : Math.cos(a);
        const sa = twist === 0 ? sinA : Math.sin(a);

        // Rotação em Y, depois inclinação em X.
        const x1 = p.x * ca - p.z * sa;
        const z1 = p.x * sa + p.z * ca;
        const y2 = p.y * tiltCos - z1 * tiltSin;
        const z2 = p.y * tiltSin + z1 * tiltCos;

        const depth = fov / (fov + z2);
        const rr = r * radiusScale * baseRadius;
        const sx = cx + x1 * rr * depth;
        const sy = cy + y2 * rr * depth;

        // Partículas do fundo somem; as da frente brilham.
        let alpha = (0.1 + depth * 0.55) * glow;
        let dot = depth * (degraded ? 1.35 : 1.15);

        // Onda radial: acende quem está na crista.
        if (rings.length > 0) {
          const dist = Math.hypot(sx - cx, sy - cy) / baseRadius;
          for (const ring of rings) {
            const d = Math.abs(dist - ring.r);
            if (d < 0.16) {
              const boost = (1 - d / 0.16) * ring.life;
              alpha += boost * 0.55;
              dot += boost * 0.7;
            }
          }
        }

        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.35, dot), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hot}, ${Math.min(1, alpha).toFixed(3)})`;
        ctx.fill();
      }

      frame = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
        return;
      }
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(draw);
    };

    resize();
    frame = requestAnimationFrame(draw);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ width: size, height: size }}
    />
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
      role="status"
      className={`text-meta h-4 transition-opacity duration-500 ${text ? "opacity-100" : "opacity-0"}`}
    >
      {text ?? " "}
    </p>
  );
}
