import "server-only";
import type { RagSource } from "@/lib/supabase/database.types";
import { readVault, type VaultChunk } from "./vault";

/**
 * Recuperação no cérebro: BM25 sobre os chunks do vault, mais expansão de
 * 1 salto pelo grafo de wikilinks.
 *
 * A expansão é o que produz respostas do tipo "na Call-007 o David resolveu
 * assim": a nota de técnica linka a call, e a call entra junto com peso menor.
 */

const K1 = 1.5;
const B = 0.75;
/** Peso do vizinho trazido pelo grafo, relativo ao chunk que o puxou. */
const GRAPH_WEIGHT = 0.45;
const DEFAULT_LIMIT = 8;
const MIN_SCORE = 0.35;

const STOPWORDS = new Set([
  "a","o","e","de","da","do","das","dos","em","no","na","nos","nas","um","uma","uns","umas",
  "para","por","com","sem","que","se","ao","aos","à","às","the","of","and","is","to","in",
  "é","ser","tem","ter","mais","como","mas","ou","já","não","sim","eu","você","ele","ela",
  "meu","minha","seu","sua","isso","esse","essa","este","esta","aquele","aquela","qual",
  "quando","onde","porque","pra","pro","num","numa","lhe","me","te","nos","vos","foi","era",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

type Scored = { chunk: VaultChunk; score: number; viaGraph: boolean };

export type RetrieveOptions = {
  /** Reforça chunks destes tipos de nota (perfil, objecao, call…). */
  boostTipos?: readonly string[];
  /** Reforça chunks com estas tags. */
  boostTags?: readonly string[];
  limit?: number;
};

/**
 * Busca o contexto para uma pergunta. Devolve vazio quando o vault não cobre —
 * é o que faz a IA dizer "isso não está no método" em vez de inventar.
 */
export async function retrieve(
  query: string,
  options: RetrieveOptions = {},
): Promise<RagSource[]> {
  const { chunks } = await readVault();
  if (chunks.length === 0) return [];

  const terms = tokenize(query);
  if (terms.length === 0) return [];

  // Índice invertido e comprimentos, recalculados por chamada — o acervo é
  // pequeno e isso evita invalidação de cache cruzada com o watcher.
  const docs = chunks.map((chunk) => tokenize(chunk.content));
  const avgLen = docs.reduce((sum, d) => sum + d.length, 0) / docs.length || 1;

  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const term of new Set(doc)) df.set(term, (df.get(term) ?? 0) + 1);
  }

  const N = docs.length;
  const boostTipos = new Set(options.boostTipos ?? []);
  const boostTags = new Set((options.boostTags ?? []).map(normalize));

  const scores: Scored[] = chunks.map((chunk, i) => {
    const doc = docs[i];
    const len = doc.length || 1;

    const freq = new Map<string, number>();
    for (const token of doc) freq.set(token, (freq.get(token) ?? 0) + 1);

    let score = 0;
    for (const term of terms) {
      const f = freq.get(term);
      if (!f) continue;
      const n = df.get(term) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (len / avgLen))));
    }

    if (score > 0) {
      // Título e heading batendo valem mais que corpo: quem nomeia, define.
      const head = normalize(`${chunk.noteTitle} ${chunk.headingPath ?? ""}`);
      const hits = terms.filter((t) => head.includes(t)).length;
      score *= 1 + hits * 0.35;

      if (chunk.tipo && boostTipos.has(chunk.tipo)) score *= 1.6;
      if (chunk.tags.some((tag) => boostTags.has(normalize(tag)))) score *= 1.4;
    }

    return { chunk, score, viaGraph: false };
  });

  const direct = scores
    .filter((s) => s.score > MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  if (direct.length === 0) return [];

  // Expansão por grafo: notas linkadas pelos 5 melhores entram com peso menor.
  const chosen = new Map<string, Scored>();
  for (const item of direct) chosen.set(item.chunk.id, item);

  const seedTitles = new Set(
    direct.slice(0, 5).flatMap((s) => s.chunk.links.map((l) => normalize(l))),
  );

  if (seedTitles.size > 0) {
    const seedScore = direct[0].score;
    for (const chunk of chunks) {
      if (chosen.has(chunk.id)) continue;
      if (!seedTitles.has(normalize(chunk.noteTitle))) continue;
      chosen.set(chunk.id, { chunk, score: seedScore * GRAPH_WEIGHT, viaGraph: true });
    }
  }

  const limit = options.limit ?? DEFAULT_LIMIT;
  const best = [...chosen.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  const top = best[0]?.score ?? 1;

  return best.map(({ chunk, score }) => ({
    chunk_id: chunk.id,
    note_id: chunk.noteId,
    note_title: chunk.noteTitle,
    note_path: chunk.notePath,
    heading_path: chunk.headingPath,
    excerpt: chunk.content,
    score: Number((score / top).toFixed(3)),
  }));
}

/** Números do cérebro para a interface — quantas notas a IA realmente enxerga. */
export async function vaultStatus() {
  const index = await readVault();
  return {
    configured: Boolean(index.vaultPath),
    vaultPath: index.vaultPath,
    notes: index.notes.length,
    chunks: index.chunks.length,
    drafts: index.draftCount,
    scannedAt: index.scannedAt,
  };
}
