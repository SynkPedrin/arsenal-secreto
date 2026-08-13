import { Composition } from "remotion";
import { HERO } from "./constants";
import { HeroScene } from "./HeroScene";

/**
 * Composições registradas para o Studio e para o render.
 *
 * A mesma `HeroScene` alimenta duas saídas: o herói ao vivo da landing, via
 * @remotion/player, e o MP4 do criativo de anúncio, via `npm run video:render`.
 * Um só código-fonte — o que muda é só para onde os quadros vão.
 */
export function RemotionRoot() {
  return (
    <Composition
      id="Hero"
      component={HeroScene}
      durationInFrames={HERO.durationInFrames}
      fps={HERO.fps}
      width={HERO.width}
      height={HERO.height}
    />
  );
}
