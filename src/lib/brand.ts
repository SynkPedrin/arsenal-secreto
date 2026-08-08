/**
 * Cores da marca em triplas RGB, para canvas.
 *
 * Canvas 2D constrói cor por string a cada partícula, então precisa de rgb()
 * cru — não dá para ler as custom properties do CSS a 60fps. Os valores aqui
 * são a conversão exata dos tokens OKLCH da landing page (arsenalsecreto),
 * que continuam sendo a fonte de verdade em globals.css.
 */
export const BRAND_RGB = {
  /** oklch(78% .13 80) — #e3ad4b */
  gold: "227, 173, 75",
  /** oklch(86% .10 85) — #efcc83 */
  goldSoft: "239, 204, 131",
  /** oklch(58% .11 70) — #a36d24 */
  goldDeep: "163, 109, 36",
  /** oklch(72% .16 60) — #eb881f */
  amber: "235, 136, 31",
  /** Realce quente do núcleo, um passo acima do gold-soft. */
  highlight: "250, 228, 190",
} as const;
