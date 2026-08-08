"use client";

import { useEffect, useRef } from "react";
import { BRAND_RGB } from "@/lib/brand";

type Dot = { x: number; y: number; phase: number; speed: number; radius: number };

/**
 * Faixas laterais de pontos com deslocamento senoidal lento.
 * Versão leve das ondas da Home — decorativa, nunca intercepta clique.
 */
export function ParticleWaves({ density = 46 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dots: Dot[] = [];
    let frame = 0;
    let running = true;
    let last = performance.now();
    let elapsed = 0;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Duas faixas: uma de cada lado, deixando o centro respirar.
      dots = Array.from({ length: density * 2 }, (_, i) => {
        const left = i < density;
        const t = (i % density) / density;
        return {
          x: (left ? 0.02 + t * 0.28 : 0.7 + t * 0.28) * width,
          y: height * (0.2 + Math.random() * 0.6),
          phase: Math.random() * Math.PI * 2,
          speed: 0.25 + Math.random() * 0.35,
          radius: 0.7 + Math.random() * 1.1,
        };
      });
    };

    const draw = (now: number) => {
      if (!running) return;

      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += delta;

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      for (const dot of dots) {
        const y = dot.y + Math.sin(elapsed * dot.speed + dot.phase) * 16;
        const alpha = 0.12 + (Math.sin(elapsed * dot.speed + dot.phase) + 1) * 0.1;

        ctx.beginPath();
        ctx.arc(dot.x, y, dot.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${BRAND_RGB.gold}, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      frame = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!reduced) {
        running = true;
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };

    build();
    if (reduced) {
      draw(performance.now());
      running = false;
      cancelAnimationFrame(frame);
    } else {
      frame = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", build);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", build);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 size-full"
    />
  );
}
