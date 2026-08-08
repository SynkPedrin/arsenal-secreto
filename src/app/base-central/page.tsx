import { PageShell, PhaseStub } from "@/components/layout/PageShell";

export const metadata = { title: "Base Central · Arsenal" };

export default function BaseCentralPage() {
  return (
    <PageShell
      eyebrow="O cérebro"
      title="Base Central"
      description="Tudo que o Arsenal sabe vem daqui: as notas do seu vault, quebradas em chunks e indexadas."
    >
      <PhaseStub
        phase="F1 + F5"
        items={[
          "Cards de status: total de notas, chunks, última sincronização e duração",
          "Tabela de notas com tags, contagem de chunks e links, filtro e busca",
          "Painel “Buscar no cérebro” — depuração do RAG com score por chunk",
          "Botão de re-indexação com o comando de sync e o histórico de sync_runs",
        ]}
      />
    </PageShell>
  );
}
