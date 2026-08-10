/**
 * Motor de inferência: Groq.
 *
 * A API é compatível com a da OpenAI, então o SDK continua o mesmo — muda a
 * baseURL e a chave. O que a Groq NÃO tem está documentado abaixo, porque a
 * ausência importa mais que a presença na hora de planejar as próximas fases.
 */
export const MODELS = {
  /** Resposta final. Melhor aderência à persona longa entre os disponíveis. */
  main: process.env.ARSENAL_MODEL ?? "openai/gpt-oss-120b",
  /** Tarefas leves: reescrita de query, reranking, títulos. */
  light: process.env.ARSENAL_MODEL_LIGHT ?? "llama-3.1-8b-instant",
  /** Voz → texto. Acerta português sem ajuste. */
  transcription: process.env.ARSENAL_MODEL_STT ?? "whisper-large-v3-turbo",
} as const;

/**
 * Esforço de raciocínio dos modelos gpt-oss.
 *
 * Eles emitem tokens de raciocínio antes do conteúdo. No chat isso atrasaria
 * o primeiro token, então fica em "low"; no debriefing e no diagnóstico, onde
 * a qualidade do julgamento importa mais que a latência, sobe.
 */
export const REASONING = {
  chat: "low",
  judgment: "medium",
} as const;

/**
 * A Groq não oferece embeddings — nenhum modelo do catálogo gera vetores.
 * Quando a F1 (ingestão do vault) for construída, o embedding vai precisar
 * de outra origem. As opções, em ordem de preferência:
 *
 *   1. Local via transformers.js (`Xenova/multilingual-e5-small`) — grátis,
 *      roda no script de sync, bom em PT-BR, 384 dims.
 *   2. Um provedor dedicado (Voyage, Cohere) — melhor qualidade, custo baixo.
 *   3. OpenAI `text-embedding-3-large` — o plano original, exige conta com saldo.
 *
 * A coluna `embedding` no banco é vector(1536); trocar de origem exige
 * ajustar a dimensão na migration antes de indexar.
 */
export const EMBEDDING_PROVIDER = "pendente" as const;
export const EMBEDDING_DIMENSIONS = 1536;

export const GENERATION = {
  temperature: 0.4,
  maxOutputTokens: 2048,
  /** Teto do contexto RAG injetado no prompt. */
  contextTokenBudget: 6000,
  /** Quantas mensagens anteriores acompanham a pergunta. */
  historyWindow: 12,
} as const;
