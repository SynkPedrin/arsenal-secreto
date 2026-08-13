/**
 * Constantes da composição do herói.
 *
 * Ficam fora do componente porque o Player e a página precisam das mesmas
 * dimensões para calcular proporção, e o Studio lê daqui ao registrar a
 * composição.
 */
export const HERO = {
  width: 1280,
  height: 800,
  fps: 30,
  durationInFrames: 30 * 12,
} as const;

/** Platina do monograma — os mesmos tokens de globals.css. */
export const PALETTE = {
  void: "#060606",
  panel: "#0f0d0b",
  core: "#c7c0b4",
  soft: "#eeebe5",
  deep: "#8d847c",
  ink: "#f8f8f8",
  muted: "#a9a39e",
} as const;

/** As etapas do método do David, que orbitam o monograma. */
export const ETAPAS = [
  "diagnóstico",
  "condução",
  "objeção",
  "fechamento",
  "follow-up",
] as const;
