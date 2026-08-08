/**
 * Modelos e limites. Único lugar a mexer para trocar de motor.
 *
 * A conta tem acesso à família gpt-5.x, bem mais capaz que gpt-4.1.
 * O briefing fixou gpt-4.1, então é o padrão — mas basta alterar
 * ARSENAL_MODEL aqui (ou via env) para promover.
 */
export const MODELS = {
  /** Geração da resposta final. */
  main: process.env.ARSENAL_MODEL ?? "gpt-4.1",
  /** Tarefas leves: reescrita de query, reranking, títulos. */
  light: process.env.ARSENAL_MODEL_LIGHT ?? "gpt-4o-mini",
  /** Embeddings do vault. */
  embedding: "text-embedding-3-large",
} as const;

export const EMBEDDING_DIMENSIONS = 1536;

export const GENERATION = {
  temperature: 0.4,
  maxOutputTokens: 2048,
  /** Teto do contexto RAG injetado no prompt. */
  contextTokenBudget: 6000,
  /** Quantas mensagens anteriores acompanham a pergunta. */
  historyWindow: 12,
} as const;
