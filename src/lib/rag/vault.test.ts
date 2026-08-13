import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { retrieve, vaultStatus } from "./search";
import { invalidateVault, readVault } from "./vault";

let vault: string;

function nota(rel: string, conteudo: string) {
  const full = path.join(vault, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, conteudo);
}

beforeAll(() => {
  vault = mkdtempSync(path.join(tmpdir(), "arsenal-vault-"));
  process.env.OBSIDIAN_VAULT_PATH = vault;

  nota(
    "00-Cerebro/Objecoes.md",
    `---
tipo: objecao
status: pronto
tags: [objecao-preco]
---
# Playbook de Objeções

## "Tá caro"
Caro e barato é aquilo que me traz resultado. Divida o valor pelo ticket que o
lead informou no diagnóstico até o número virar pequeno diante do retorno.
Ligações: [[Call-007]]

## "Preciso pensar"
Adiamento quase sempre é diagnóstico incompleto, não falta de dinheiro. Volte
para a dor antes de voltar para o preço, sem pressionar o lead.
`,
  );

  nota(
    "01-Calls/Call-007.md",
    `---
tipo: call
status: pronto
---
# Call-007

## Fechamento
O lead disse que estava apertado e mesmo assim fechou depois da garantia de
devolução integral apresentada em contrato, com pagamento dividido na entrada.
`,
  );

  nota(
    "00-Cerebro/Rascunho.md",
    `---
tipo: metodo
status: rascunho
---
# Gabarito vazio

## Princípio
[EXTRAIR] O closer deve sempre dar desconto imediato quando ouvir preço, que é
uma orientação inventada e jamais pode sair na resposta da IA.
`,
  );

  nota(
    "08-Fonte-Bruta/transcricao.md",
    `# Transcrição crua

Bloco literal de call que não deve ser recuperado, porque a IA precisa citar
conhecimento destilado e não duas horas de conversa transcrita sem curadoria.
`,
  );

  nota("_Templates/Template.md", "# Template\n\nModelo que nunca deve ser indexado por ser gabarito.\n");

  invalidateVault();
});

afterAll(() => {
  rmSync(vault, { recursive: true, force: true });
  delete process.env.OBSIDIAN_VAULT_PATH;
});

describe("leitura do vault", () => {
  it("indexa apenas notas prontas, fora das pastas reservadas", async () => {
    const index = await readVault(true);
    const titulos = index.notes.map((n) => n.title).sort();

    expect(titulos).toEqual(["Call-007", "Objecoes"]);
    expect(index.draftCount).toBe(1);
  });

  it("quebra por heading e guarda o caminho hierárquico", async () => {
    const index = await readVault(true);
    const chunks = index.chunks.filter((c) => c.noteTitle === "Objecoes");

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.map((c) => c.headingPath)).toContain('Playbook de Objeções > "Tá caro"');
  });

  it("extrai wikilinks e frontmatter", async () => {
    const index = await readVault(true);
    const objecoes = index.notes.find((n) => n.title === "Objecoes")!;

    expect(objecoes.links).toContain("Call-007");
    expect(objecoes.tipo).toBe("objecao");
    expect(objecoes.tags).toContain("objecao-preco");
  });

  it("relata o estado do cérebro para a interface", async () => {
    const status = await vaultStatus();
    expect(status.configured).toBe(true);
    expect(status.notes).toBe(2);
    expect(status.drafts).toBe(1);
  });
});

describe("recuperação", () => {
  it("acha a seção certa pela pergunta em linguagem natural", async () => {
    const fontes = await retrieve("o cliente falou que tá caro");
    expect(fontes[0].note_title).toBe("Objecoes");
    expect(fontes[0].heading_path).toBe('Playbook de Objeções > "Tá caro"');
  });

  it("NUNCA devolve rascunho — é a anti-alucinação na camada do dado", async () => {
    for (const q of ["desconto imediato", "princípio do método", "gabarito", "EXTRAIR"]) {
      const fontes = await retrieve(q);
      expect(fontes.every((f) => !f.note_path.includes("Rascunho"))).toBe(true);
    }
  });

  it("nunca devolve transcrição crua nem template", async () => {
    const fontes = await retrieve("transcrição literal de call template modelo");
    expect(fontes.every((f) => !f.note_path.includes("08-Fonte-Bruta"))).toBe(true);
    expect(fontes.every((f) => !f.note_path.includes("_Templates"))).toBe(true);
  });

  it("expande pelo grafo: a call linkada entra junto da técnica", async () => {
    const fontes = await retrieve("tá caro");
    expect(fontes.map((f) => f.note_title)).toContain("Call-007");
  });

  it("devolve vazio quando o vault não cobre — é o que dispara a R1", async () => {
    expect(await retrieve("termodinâmica quântica aplicada a foguetes")).toEqual([]);
  });

  it("ignora pergunta só de stopword", async () => {
    expect(await retrieve("o de a que")).toEqual([]);
  });

  it("normaliza acento: busca sem acento acha texto com acento", async () => {
    const comAcento = await retrieve("objeções");
    const semAcento = await retrieve("objecoes");
    expect(semAcento.length).toBeGreaterThan(0);
    expect(semAcento[0].note_title).toBe(comAcento[0].note_title);
  });

  it("pontua de forma relativa, com o melhor resultado em 1", async () => {
    const fontes = await retrieve("tá caro");
    expect(fontes[0].score).toBe(1);
    expect(fontes.every((f) => f.score <= 1 && f.score > 0)).toBe(true);
  });
});
