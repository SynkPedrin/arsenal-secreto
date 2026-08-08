import { PageShell, PhaseStub } from "@/components/layout/PageShell";

export const metadata = { title: "Conversas · Arsenal" };

export default function ConversasPage() {
  return (
    <PageShell
      eyebrow="Histórico"
      title="Conversas"
      description="Toda conversa fica gravada com as fontes que a fundamentaram."
    >
      <PhaseStub
        phase="F3"
        items={[
          "Lista de conversas com título gerado automaticamente e data",
          "Busca no histórico por conteúdo de mensagem",
          "Retomar uma conversa mantendo o contexto",
          "Excluir conversa (cascata em mensagens)",
        ]}
      />
    </PageShell>
  );
}
