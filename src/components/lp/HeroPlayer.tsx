"use client";

import { useEffect, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { HERO } from "@/remotion/constants";
import { HeroScene } from "@/remotion/HeroScene";

/**
 * A composição Remotion rodando dentro da página, via @remotion/player.
 *
 * O Remotion em si renderiza React para quadros de vídeo — não constrói
 * página. O Player é a ponte: executa a mesma composição no browser, ao vivo,
 * com o mesmo código que geraria o MP4. Um só fonte para o herói da landing e
 * para o criativo de anúncio.
 */
export function HeroPlayer() {
  const ref = useRef<PlayerRef>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  // Sem movimento: congela num quadro em que a cena já está formada.
  useEffect(() => {
    if (reduced) ref.current?.seekTo(HERO.fps * 4);
  }, [reduced]);

  return (
    // A proporção vive no contêiner: o Player se posiciona absoluto dentro
    // dele, então sem aspect-ratio o pai colapsa e nada aparece.
    <div className="relative aspect-[1280/800] w-full">
      <Player
        ref={ref}
        // Uso não comercial neste momento; ver a nota de licença no README.
        acknowledgeRemotionLicense
        component={HeroScene}
        durationInFrames={HERO.durationInFrames}
        fps={HERO.fps}
        compositionWidth={HERO.width}
        compositionHeight={HERO.height}
        loop
        autoPlay={!reduced}
        controls={false}
        doubleClickToFullscreen={false}
        clickToPlay={false}
        style={{ width: "100%", height: "100%" }}
      />

      {/* Dissolve a base do vídeo no fundo da página, sem borda visível. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-void to-transparent"
      />
    </div>
  );
}
