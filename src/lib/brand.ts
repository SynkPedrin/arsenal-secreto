/**
 * Cores da marca em triplas RGB, para canvas.
 *
 * Canvas 2D constrói cor por string a cada partícula, então precisa de rgb()
 * cru — não dá para ler as custom properties do CSS a 60fps. Os valores são a
 * conversão exata dos tokens OKLCH de globals.css, que seguem sendo a fonte de
 * verdade. O acento vem do monograma DW: mesma matiz do dourado da LP (~80°),
 * croma quase nulo — platina, não amarelo.
 */
export const BRAND_RGB = {
  /** oklch(81% .018 82) — #c7c0b4 · mediana dos pixels do monograma */
  gold: "199, 192, 180",
  /** oklch(94% .008 81) — #eeebe5 · percentil 95, o brilho do metal */
  goldSoft: "238, 235, 229",
  /** oklch(62% .017 68) — #8d847c · percentil 5, a sombra do metal */
  goldDeep: "141, 132, 124",
  /** Reservado para erro e nível Inferno — segue quente de propósito. */
  amber: "235, 136, 31",
  /** Realce do núcleo, um passo acima do soft. */
  highlight: "250, 249, 246",
} as const;
