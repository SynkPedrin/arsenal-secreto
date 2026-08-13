import {
  AbsoluteFill,
  Easing,
  Img,
  Interactive,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ETAPAS, PALETTE } from "./constants";

/**
 * Herói da landing: o monograma DW como núcleo e as etapas do método
 * orbitando ao redor, como elétrons.
 *
 * A metáfora não é decorativa — é o produto. O método do David é o que orbita
 * a marca, e é isso que a IA consulta a cada resposta.
 *
 * Toda animação é dirigida por useCurrentFrame() + interpolate(), nunca por
 * CSS transition: transição de CSS não existe quando o Remotion renderiza
 * quadro a quadro. Uso <Img> em vez de <CanvasImage> porque o alvo aqui é o
 * Player no browser, onde <Img> é o caminho estável.
 */

const ORBITS = [
  { tilt: 72, spin: 1, radius: 250, dur: 620 },
  { tilt: 108, spin: -1, radius: 300, dur: 760 },
  { tilt: 90, spin: 1, radius: 350, dur: 900 },
] as const;

/** Malha técnica de fundo, a mesma do app. */
function Grid() {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Malha"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(120% 90% at 50% 50%, #000 0%, transparent 70%)",
        opacity: interpolate(frame, [0, 40], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    />
  );
}

/** Um anel orbital com o seu elétron. */
function Orbit({ index }: { index: 0 | 1 | 2 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const orbit = ORBITS[index];

  // Cada anel entra em sequência, com mola — dá peso físico à formação.
  const enter = spring({
    frame: frame - 18 - index * 8,
    fps,
    config: { damping: 16, mass: 0.7 },
  });

  // Posição do elétron: ângulo percorre 360° no período do anel.
  const angle = ((frame / orbit.dur) * Math.PI * 2 * 60 * orbit.spin) % (Math.PI * 2);
  const ex = Math.cos(angle) * orbit.radius;
  const ey = Math.sin(angle) * orbit.radius * 0.34;

  return (
    <Interactive.Div
      name={`Órbita ${index + 1}`}
      style={{
        position: "absolute",
        width: orbit.radius * 2,
        height: orbit.radius * 0.68,
        opacity: enter * 0.9,
        scale: enter,
        rotate: `${orbit.tilt + (frame / orbit.dur) * 360 * orbit.spin}deg`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `1px solid ${PALETTE.core}`,
          opacity: 0.24,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 7,
          height: 7,
          marginLeft: -3.5,
          marginTop: -3.5,
          borderRadius: "50%",
          background: PALETTE.soft,
          boxShadow: `0 0 16px ${PALETTE.core}`,
          translate: `${ex}px ${ey}px`,
        }}
      />
    </Interactive.Div>
  );
}

/** As etapas do método, entrando uma a uma ao redor do núcleo. */
function Etapas() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      {ETAPAS.map((etapa, i) => {
        const start = 60 + i * 14;
        const angle = (i / ETAPAS.length) * Math.PI * 2 - Math.PI / 2;
        const drift = frame * 0.0016;

        return (
          <Interactive.Div
            key={etapa}
            name={`Etapa: ${etapa}`}
            style={{
              position: "absolute",
              fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
              fontSize: 15,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: PALETTE.muted,
              whiteSpace: "nowrap",
              opacity: interpolate(
                frame,
                [start, start + 22, 300, 340],
                [0, 1, 1, 0],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                },
              ),
              translate: `${Math.cos(angle + drift) * 430}px ${Math.sin(angle + drift) * 210}px`,
              scale: spring({
                frame: frame - start,
                fps,
                config: { damping: 18, mass: 0.5 },
              }),
            }}
          >
            {etapa}
          </Interactive.Div>
        );
      })}
    </>
  );
}

export function HeroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // O monograma entra com mola e sai do desfoque — vira o núcleo da cena.
  const reveal = spring({ frame: frame - 6, fps, config: { damping: 14, mass: 0.9 } });

  return (
    <AbsoluteFill name="Herói" style={{ backgroundColor: PALETTE.void }}>
      <Grid />

      {/* Brilho central que respira, ancorando a composição. */}
      <AbsoluteFill
        name="Brilho"
        style={{
          background: `radial-gradient(closest-side, rgba(199,192,180,0.16), transparent 70%)`,
          scale: interpolate(frame % 240, [0, 120, 240], [1, 1.14, 1], {
            easing: Easing.bezier(0.4, 0, 0.6, 1),
            output: "perceptual-scale",
          }),
        }}
      />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {([0, 1, 2] as const).map((i) => (
          <Orbit key={i} index={i} />
        ))}

        <Etapas />

        <Interactive.Div
          name="Monograma"
          style={{
            position: "absolute",
            width: 190,
            height: 190,
            opacity: reveal,
            scale: reveal,
            filter: `blur(${interpolate(frame, [6, 34], [14, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            })}px)`,
          }}
        >
          <Img src={staticFile("logo-dw.png")} style={{ width: "100%", height: "100%" }} />
        </Interactive.Div>
      </AbsoluteFill>

      {/* Vinheta: fecha a moldura e evita que a órbita "vaze" na borda. */}
      <AbsoluteFill
        name="Vinheta"
        style={{
          background: `radial-gradient(110% 110% at 50% 50%, transparent 45%, ${PALETTE.void} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
}
