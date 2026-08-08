import { PageShell, PhaseStub } from "@/components/layout/PageShell";

export const metadata = { title: "Arsenal Secreto" };

export default function ArsenalSecretoPage() {
  return (
    <PageShell eyebrow="O cofre" title="Arsenal Secreto" description="O cofre está sendo preparado.">
      <PhaseStub
        phase="F5"
        items={[
          "Prévia do site em iframe dentro de uma moldura de browser com borda dourada",
          "Fallback obrigatório: screenshot capturado no build via Playwright, quando o iframe é bloqueado",
          "Botão “EM BREVE” com glow pulsante abrindo o site em nova aba",
          "Ondas de partículas discretas ao fundo, mantendo a identidade da Home",
        ]}
      />
    </PageShell>
  );
}
