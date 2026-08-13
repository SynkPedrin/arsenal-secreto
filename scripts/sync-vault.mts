/**
 * Sincroniza e audita o cérebro.
 *
 *   npm run sync            relatório do índice
 *   npm run sync -- --full  idem, listando nota por nota
 *   npm run sync -- --watch reindexa a cada alteração no vault
 *
 * Hoje a indexação acontece em memória no servidor, a cada consulta — não há
 * banco de vetores para popular (ver a nota sobre embeddings em
 * src/lib/ai/config.ts). O valor deste comando é a AUDITORIA: ele mostra o que
 * a IA enxerga e, principalmente, o que ela não enxerga e por quê. Nota sem
 * `status: pronto` fica invisível em silêncio, e isso é difícil de perceber
 * pela interface.
 */
import { watch } from "node:fs";
import path from "node:path";
import { invalidateVault, readVault } from "../src/lib/rag/vault";

const args = new Set(process.argv.slice(2));
const full = args.has("--full");
const watching = args.has("--watch");

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const gold = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;

async function report(): Promise<void> {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;

  if (!vaultPath) {
    console.error(red("OBSIDIAN_VAULT_PATH não definido em .env.local."));
    process.exit(1);
  }

  invalidateVault();
  const started = Date.now();
  const index = await readVault(true);
  const ms = Date.now() - started;

  console.log(`\n${gold("CÉREBRO ARSENAL")}  ${dim(vaultPath)}`);
  console.log(dim("─".repeat(64)));
  console.log(
    `${green(String(index.notes.length))} notas indexadas · ` +
      `${green(String(index.chunks.length))} trechos · ` +
      `${index.draftCount > 0 ? gold(String(index.draftCount)) : "0"} fora do índice ` +
      dim(`(${ms}ms)`),
  );

  if (index.notes.length === 0) {
    console.log(
      red("\nNenhuma nota indexada.") +
        " A IA vai responder por princípios gerais e dizer que o tema\n" +
        "não está no método documentado. Toda nota precisa de `status: pronto`\n" +
        "no frontmatter para entrar.",
    );
  }

  if (index.draftCount > 0) {
    console.log(
      dim(`\n${index.draftCount} nota(s) com status: rascunho não entram no índice — é o que`) +
        dim("\nimpede a IA de citar um gabarito [EXTRAIR] como se fosse método."),
    );
  }

  // Wikilink que não resolve não expande no grafo: vale avisar.
  const titles = new Set(index.notes.map((n) => n.title.toLowerCase()));
  const quebrados: string[] = [];
  for (const note of index.notes) {
    for (const link of note.links) {
      if (!titles.has(link.toLowerCase())) quebrados.push(`${note.title} → [[${link}]]`);
    }
  }

  if (quebrados.length > 0) {
    console.log(gold(`\n${quebrados.length} wikilink(s) sem destino indexado:`));
    for (const q of quebrados.slice(0, 12)) console.log(dim(`  · ${q}`));
    if (quebrados.length > 12) console.log(dim(`  … e mais ${quebrados.length - 12}`));
    console.log(dim("  Eles não expandem pelo grafo — o alvo é rascunho ou não existe."));
  }

  if (full) {
    console.log(gold("\nNotas no índice:"));
    for (const note of [...index.notes].sort((a, b) => b.chunks.length - a.chunks.length)) {
      const tags = note.tags.length > 0 ? dim(` #${note.tags.join(" #")}`) : "";
      console.log(
        `  ${String(note.chunks.length).padStart(3)} trechos  ${note.title}${tags}\n` +
          dim(`      ${path.dirname(note.relPath)}`),
      );
    }
  }

  console.log("");
}

await report();

if (watching) {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH!;
  console.log(dim("Observando o vault. Ctrl+C para sair.\n"));

  let pending: ReturnType<typeof setTimeout> | null = null;
  watch(vaultPath, { recursive: true }, (_event, file) => {
    if (!file?.endsWith(".md")) return;
    // Salvar no Obsidian dispara vários eventos; espera assentar.
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => void report(), 300);
  });
}
