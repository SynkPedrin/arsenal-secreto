"use client";

import { useEffect, useRef } from "react";
import type { AssistantState } from "@/lib/chat/protocol";

/** Amostras por órbita. Suficiente para a elipse ficar lisa em qualquer tamanho. */
const SAMPLES = 84;
const ORBITS = 3;
const LERP_TAU = 0.22;

type Vec3 = { x: number; y: number; z: number };

type Params = {
  /** Rotação global, radianos por segundo. */
  spin: number;
  /** Velocidade dos elétrons na órbita. */
  electron: number;
  /** Escala das órbitas. */
  radius: number;
  /** 0–1: oscilação do eixo — é o que dá a sensação de "processando". */
  wobble: number;
  /** 0–1: brilho geral. */
  glow: number;
  /** 0–1: quanto o âmbar queimado substitui o dourado. */
  burn: number;
};

const BY_STATE: Record<AssistantState, Params> = {
  idle: { spin: 0.34, electron: 1.1, radius: 1, wobble: 0.08, glow: 0.5, burn: 0 },
  listening: { spin: 0.5, electron: 1.5, radius: 1.02, wobble: 0.14, glow: 0.72, burn: 0 },
  retrieving: { spin: 0.95, electron: 2.4, radius: 0.9, wobble: 0.3, glow: 0.8, burn: 0 },
  thinking: { spin: 1.75, electron: 4.2, radius: 1.04, wobble: 1, glow: 1, burn: 0 },
  answering: { spin: 0.8, electron: 2, radius: 1.06, wobble: 0.2, glow: 0.85, burn: 0 },
  error: { spin: 0.18, electron: 0.5, radius: 0.94, wobble: 0.5, glow: 0.55, burn: 1 },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function rotateX({ x, y, z }: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x, y: y * c - z * s, z: y * s + z * c };
}

function rotateY({ x, y, z }: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: x * c + z * s, y, z: -x * s + z * c };
}

function rotateZ({ x, y, z }: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c, z };
}

/** Pontos de cada órbita já na sua orientação final, calculados uma vez só. */
function buildOrbits(): Vec3[][] {
  return Array.from({ length: ORBITS }, (_, k) => {
    const tilt = 1.15;
    const swing = (k / ORBITS) * Math.PI;

    return Array.from({ length: SAMPLES }, (_, i) => {
      const t = (i / SAMPLES) * Math.PI * 2;
      return rotateZ(rotateX({ x: Math.cos(t), y: Math.sin(t), z: 0 }, tilt), swing);
    });
  });
}

/**
 * Átomo: núcleo com três órbitas e um elétron em cada.
 *
 * Existe porque a esfera de partículas, reduzida para o canto, vira uma bola
 * chapada — a órbita continua legível a 40px e comunica o estado por
 * velocidade, não por densidade.
 */
export function AtomCore({
  state,
  levelSource,
  pulse = 0,
  size = 46,
  className = "",
}: {
  state: AssistantState;
  levelSource?: { get(): number };
  pulse?: number;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const sourceRef = useRef(levelSource);
  const pulseRef = useRef(pulse);

  useEffect(() => {
    stateRef.current = state;
    sourceRef.current = levelSource;
    pulseRef.current = pulse;
  }, [state, levelSource, pulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const orbits = buildOrbits();

    let frame = 0;
    let running = true;
    let last = performance.now();
    let elapsed = 0;
    let spinAngle = 0;
    let electronPhase = 0;
    let seenPulse = pulseRef.current;
    let flash = 0;

    const current: Params = { ...BY_STATE.idle };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = (now: number) => {
      if (!running) return;

      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      const target = BY_STATE[stateRef.current];
      const t = 1 - Math.exp(-dt / LERP_TAU);
      current.spin = lerp(current.spin, target.spin, t);
      current.electron = lerp(current.electron, target.electron, t);
      current.radius = lerp(current.radius, target.radius, t);
      current.wobble = lerp(current.wobble, target.wobble, t);
      current.glow = lerp(current.glow, target.glow, t);
      current.burn = lerp(current.burn, target.burn, t);

      const live = stateRef.current;
      const audio =
        live === "listening" || live === "answering" ? (sourceRef.current?.get() ?? 0) : 0;

      if (pulseRef.current !== seenPulse) {
        seenPulse = pulseRef.current;
        flash = 1;
      }
      flash = Math.max(0, flash - dt * 2.4);

      spinAngle += dt * current.spin * (1 + audio * 0.3);
      electronPhase += dt * current.electron * (1 + audio * 0.3);

      // Gangorra no eixo X: sem ela o átomo gira sempre igual e não "pensa".
      const wobbleAngle = Math.sin(elapsed * 1.7) * 0.42 * current.wobble;

      const cx = size / 2;
      const cy = size / 2;
      // scale × (fov / (fov − 1)) precisa ficar abaixo de 0.5, senão a órbita
      // mais próxima da câmera sai do canvas e é cortada na borda.
      const scale = size * 0.37 * current.radius * (1 + audio * 0.08);
      const fov = 4.5;
      const hot = current.burn > 0.5 ? "180, 84, 26" : "245, 179, 1";
      const glow = Math.min(1, current.glow * (1 + audio * 0.35) + flash * 0.3);

      const project = (p: Vec3) => {
        const r = rotateX(rotateY(p, spinAngle), wobbleAngle);
        const depth = fov / (fov + r.z);
        return { x: cx + r.x * scale * depth, y: cy + r.y * scale * depth, z: r.z, depth };
      };

      ctx.clearRect(0, 0, size, size);

      const projected = orbits.map((orbit) => orbit.map(project));

      // Metade de trás → núcleo → metade da frente. É o que dá profundidade real.
      const drawArcs = (behind: boolean) => {
        ctx.lineWidth = Math.max(0.8, size * 0.022);
        ctx.lineCap = "round";

        for (const points of projected) {
          for (let i = 0; i < points.length; i += 1) {
            const a = points[i];
            const b = points[(i + 1) % points.length];
            if (a.z < 0 !== behind) continue;

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${hot}, ${((behind ? 0.22 : 0.75) * glow).toFixed(3)})`;
            ctx.stroke();
          }
        }
      };

      const drawElectrons = (behind: boolean) => {
        projected.forEach((points, k) => {
          const phase = electronPhase + (k * Math.PI * 2) / ORBITS;
          const index = Math.floor(((phase / (Math.PI * 2)) % 1) * SAMPLES + SAMPLES) % SAMPLES;
          const p = points[index];
          if (p.z < 0 !== behind) return;

          const r = Math.max(1.1, size * 0.05 * p.depth);
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${hot}, ${((behind ? 0.4 : 1) * glow).toFixed(3)})`;
          ctx.fill();
        });
      };

      drawArcs(true);
      drawElectrons(true);

      // Núcleo: halo + corpo sólido.
      const coreR = size * (0.19 + audio * 0.04 + flash * 0.02);
      const halo = ctx.createRadialGradient(cx, cy, coreR * 0.3, cx, cy, coreR * 2.4);
      halo.addColorStop(0, `rgba(${hot}, ${(0.4 * glow).toFixed(3)})`);
      halo.addColorStop(1, `rgba(${hot}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 2.4, 0, Math.PI * 2);
      ctx.fill();

      const body = ctx.createRadialGradient(
        cx - coreR * 0.3,
        cy - coreR * 0.35,
        coreR * 0.1,
        cx,
        cy,
        coreR,
      );
      body.addColorStop(0, `rgba(255, 236, 180, ${(0.95 * glow).toFixed(3)})`);
      body.addColorStop(1, `rgba(${hot}, ${(0.8 * glow).toFixed(3)})`);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      drawArcs(false);
      drawElectrons(false);

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

    if (reduced) {
      // Um quadro parado: a identidade continua, o movimento não.
      draw(performance.now());
      running = false;
      cancelAnimationFrame(frame);
    } else {
      frame = requestAnimationFrame(draw);
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      running = false;
      cancelAnimationFrame(frame);
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
