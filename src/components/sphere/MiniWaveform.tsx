"use client";

import { useEffect, useRef } from "react";
import type { LevelSource } from "@/lib/audio/levelStore";
import { BRAND_RGB } from "@/lib/brand";

/**
 * Espelho do espectro de voz. Desenha em canvas dentro do próprio rAF,
 * pelo mesmo motivo da esfera: 60fps de prop React seria desperdício.
 */
export function MiniWaveform({
  levelSource,
  active,
  width = 180,
  height = 26,
}: {
  levelSource: LevelSource;
  active: boolean;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let frame = 0;
    const smoothed: number[] = [];

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const bands = levelSource.bands();
      const bars = 22;
      const gap = 3;
      const barWidth = (width - gap * (bars - 1)) / bars;

      for (let i = 0; i < bars; i += 1) {
        const raw = activeRef.current && bands.length > 0 ? (bands[i] ?? 0) / 255 : 0;
        smoothed[i] = (smoothed[i] ?? 0) + (raw - (smoothed[i] ?? 0)) * 0.28;

        const h = Math.max(2, smoothed[i] * height);
        const x = i * (barWidth + gap);
        const y = (height - h) / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, barWidth / 2);
        ctx.fillStyle = `rgba(${BRAND_RGB.gold}, ${(0.2 + smoothed[i] * 0.7).toFixed(3)})`;
        ctx.fill();
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [levelSource, width, height]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ width, height }}
      className={`transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}
    />
  );
}
