/**
 * Tipos do schema (espelham supabase/migrations/0001_init.sql).
 * Regenerar com:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MessageRole = "user" | "assistant" | "system";
export type SyncStatus = "running" | "ok" | "error";

/** Fonte citada por uma resposta — gravada em messages.sources. */
export type RagSource = {
  chunk_id: string;
  note_id: string;
  note_title: string;
  note_path: string;
  heading_path: string | null;
  excerpt: string;
  score: number;
};

type Timestamped = { created_at: string };

export type NoteRow = Timestamped & {
  id: string;
  user_id: string;
  path: string;
  title: string;
  aliases: string[];
  tags: string[];
  frontmatter: Json;
  content_hash: string;
  mtime: string | null;
  chunk_count: number;
  updated_at: string;
};

export type NoteChunkRow = Timestamped & {
  id: string;
  note_id: string;
  user_id: string;
  chunk_index: number;
  heading_path: string | null;
  content: string;
  token_count: number | null;
  embedding: string | null;
};

export type NoteLinkRow = {
  source_note_id: string;
  target_title: string;
  target_note_id: string | null;
  user_id: string;
};

export type ConversationRow = Timestamped & {
  id: string;
  user_id: string;
  title: string | null;
  updated_at: string;
};

export type MessageRow = Timestamped & {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  sources: RagSource[];
};

export type SyncRunRow = {
  id: string;
  user_id: string;
  started_at: string;
  finished_at: string | null;
  stats: Json;
  status: SyncStatus;
  error: string | null;
};

export type TokenUsageRow = Timestamped & {
  id: string;
  user_id: string;
  conversation_id: string | null;
  operation: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      notes: Table<NoteRow>;
      note_chunks: Table<NoteChunkRow>;
      note_links: Table<NoteLinkRow>;
      conversations: Table<ConversationRow>;
      messages: Table<MessageRow>;
      sync_runs: Table<SyncRunRow>;
      token_usage: Table<TokenUsageRow>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
