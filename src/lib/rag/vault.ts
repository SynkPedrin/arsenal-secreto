/**
 * Sem "server-only" de propósito: este módulo não toca segredo nenhum, só lê
 * arquivo. O import de node:fs já impede o uso no cliente, e a ausência do
 * guard permite que a CLI de auditoria (scripts/sync-vault.mts) reaproveite
 * exatamente o mesmo indexador que o servidor usa — uma fonte de verdade só.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

/**
 * Leitor do cérebro: o vault do Obsidian direto do disco.
 *
 * Não há banco nem embedding aqui de propósito. O Supabase ainda não tem chaves
 * e a Groq não gera vetores — mas o vault são arquivos locais, e um índice em
 * memória com BM25 resolve bem um acervo desse tamanho. Quando o pgvector
 * entrar, este módulo vira a etapa de ingestão e a busca passa a ser híbrida.
 */

/**
 * `08-Fonte-Bruta` guarda as transcrições cruas e os gabaritos originais. Fica
 * fora do índice de propósito: a IA deve citar o conhecimento já destilado, não
 * duas horas de call literal nem um formulário com campos [EXTRAIR] — que ela
 * apresentaria como se fosse método.
 */
const IGNORED_DIRS = new Set([
  ".obsidian",
  ".trash",
  "_Templates",
  "08-Fonte-Bruta",
  "node_modules",
  ".git",
]);
/** Chunks fora desta faixa são ruído: cabeçalho solto ou parede de texto. */
const MIN_CHUNK_CHARS = 80;
const MAX_CHUNK_CHARS = 1400;

export type VaultChunk = {
  id: string;
  noteId: string;
  noteTitle: string;
  notePath: string;
  headingPath: string | null;
  content: string;
  tags: string[];
  tipo: string | null;
  etapa: string | null;
  /** Títulos referenciados por wikilink na nota de origem. */
  links: string[];
};

export type VaultNote = {
  id: string;
  title: string;
  relPath: string;
  tags: string[];
  tipo: string | null;
  etapa: string | null;
  links: string[];
  chunks: VaultChunk[];
};

export type VaultIndex = {
  notes: VaultNote[];
  chunks: VaultChunk[];
  /** Notas encontradas mas ignoradas por status: rascunho. */
  draftCount: number;
  scannedAt: number;
  vaultPath: string | null;
};

const EMPTY: VaultIndex = {
  notes: [],
  chunks: [],
  draftCount: 0,
  scannedAt: 0,
  vaultPath: null,
};

async function walk(dir: string, acc: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      await walk(full, acc);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      acc.push(full);
    }
  }
  return acc;
}

/** `[[Nota]]` e `[[Nota|apelido]]` — o alvo é sempre a primeira parte. */
function extractLinks(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)) {
    const target = match[1].trim();
    if (target) found.add(target);
  }
  return [...found];
}

function extractInlineTags(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(/(?:^|\s)#([\p{L}\d_-]{2,})/gu)) {
    found.add(match[1].toLowerCase());
  }
  return [...found];
}

/**
 * Limpa sintaxe que polui a recuperação sem carregar significado.
 * Wikilink vira o texto do alvo — o nome da nota costuma ser informativo.
 */
function cleanForIndex(text: string): string {
  return text
    .replace(/^>\s?\[!\w+\][^\n]*\n?/gm, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/\|/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Divide por headings H1–H3, mantendo o caminho hierárquico em cada pedaço. */
function chunkByHeadings(body: string, noteTitle: string): { heading: string | null; text: string }[] {
  const lines = body.split("\n");
  const chunks: { heading: string | null; text: string }[] = [];
  const stack: string[] = [];

  let buffer: string[] = [];
  let currentHeading: string | null = null;

  const flush = () => {
    const text = cleanForIndex(buffer.join("\n"));
    if (text.length >= MIN_CHUNK_CHARS) {
      // Pedaços grandes são partidos por parágrafo, sem perder o cabeçalho.
      if (text.length <= MAX_CHUNK_CHARS) {
        chunks.push({ heading: currentHeading, text });
      } else {
        let piece = "";
        for (const paragraph of text.split(/\n\s*\n/)) {
          if (piece.length + paragraph.length > MAX_CHUNK_CHARS && piece.length >= MIN_CHUNK_CHARS) {
            chunks.push({ heading: currentHeading, text: piece.trim() });
            piece = "";
          }
          piece += `${paragraph}\n\n`;
        }
        if (piece.trim().length >= MIN_CHUNK_CHARS) {
          chunks.push({ heading: currentHeading, text: piece.trim() });
        }
      }
    }
    buffer = [];
  };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length;
      stack.length = level - 1;
      stack[level - 1] = heading[2].trim();
      currentHeading = stack.filter(Boolean).join(" > ") || null;
      continue;
    }
    buffer.push(line);
  }
  flush();

  // Nota sem heading nenhum ainda deve ser recuperável.
  if (chunks.length === 0) {
    const text = cleanForIndex(body);
    if (text.length >= MIN_CHUNK_CHARS) chunks.push({ heading: null, text });
  }

  return chunks.map((c) => ({
    ...c,
    heading: c.heading ? c.heading : null,
    text: `${noteTitle}${c.heading ? ` > ${c.heading}` : ""}\n${c.text}`,
  }));
}

let cache: VaultIndex | null = null;
let cacheKey = "";

/** Assinatura barata do vault: caminho + mtime de cada arquivo. */
async function signature(files: string[]): Promise<string> {
  const parts = await Promise.all(
    files.map(async (file) => {
      try {
        const info = await stat(file);
        return `${file}:${info.mtimeMs}`;
      } catch {
        return file;
      }
    }),
  );
  return parts.join("|");
}

export async function readVault(force = false): Promise<VaultIndex> {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (!vaultPath) return EMPTY;

  const files = (await walk(vaultPath)).sort();
  if (files.length === 0) return { ...EMPTY, vaultPath };

  const key = await signature(files);
  if (!force && cache && cacheKey === key) return cache;

  const notes: VaultNote[] = [];
  const chunks: VaultChunk[] = [];
  let draftCount = 0;

  for (const file of files) {
    let raw: string;
    try {
      raw = await readFile(file, "utf8");
    } catch {
      continue;
    }

    const parsed = matter(raw);
    const front = parsed.data as Record<string, unknown>;

    // Gabarito vazio não entra no índice: a IA não pode citar um [EXTRAIR]
    // como se fosse método. É a regra anti-alucinação na camada do dado.
    if (String(front.status ?? "").toLowerCase() === "rascunho") {
      draftCount += 1;
      continue;
    }

    const relPath = path.relative(vaultPath, file);
    const title = path.basename(file, ".md");
    const body = parsed.content;

    const frontTags = Array.isArray(front.tags)
      ? front.tags.map((t) => String(t).toLowerCase())
      : [];
    const tags = [...new Set([...frontTags, ...extractInlineTags(body)])];
    const links = extractLinks(body);

    const note: VaultNote = {
      id: relPath,
      title,
      relPath,
      tags,
      tipo: front.tipo ? String(front.tipo) : null,
      etapa: front.etapa ? String(front.etapa) : null,
      links,
      chunks: [],
    };

    chunkByHeadings(body, title).forEach((piece, index) => {
      const chunk: VaultChunk = {
        id: `${relPath}#${index}`,
        noteId: relPath,
        noteTitle: title,
        notePath: relPath,
        headingPath: piece.heading,
        content: piece.text,
        tags,
        tipo: note.tipo,
        etapa: note.etapa,
        links,
      };
      note.chunks.push(chunk);
      chunks.push(chunk);
    });

    notes.push(note);
  }

  cache = { notes, chunks, draftCount, scannedAt: Date.now(), vaultPath };
  cacheKey = key;
  return cache;
}

/** Descarta o índice — usado pelo botão de reindexar. */
export function invalidateVault() {
  cache = null;
  cacheKey = "";
}
