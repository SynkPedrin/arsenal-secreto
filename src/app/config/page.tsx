import { PageShell, PhaseStub } from "@/components/layout/PageShell";

export const metadata = { title: "Configurações · Arsenal" };

export default function ConfigPage() {
  return (
    <PageShell
      eyebrow="Ajustes"
      title="Configurações"
      description="Como o Arsenal pensa: modelo, temperatura, quanto do cérebro entra em cada resposta."
    >
      <PhaseStub
        phase="F6"
        items={[
          "Modelo principal e modelo auxiliar (reformulação de query, reranking, títulos)",
          "Temperatura e budget de tokens do contexto RAG",
          "Quantidade de chunks recuperados e threshold do reranking",
          "Persona do sistema editável, com as regras anti-alucinação fixas",
        ]}
      />
    </PageShell>
  );
}
