-- ═══════════════════════════════════════════════════════════════
-- ARSENAL — schema base (F0)
-- Cérebro: notas do Obsidian → chunks embedados + grafo de links.
-- Toda tabela é isolada por usuário via RLS.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists vector;

-- ── Notas ──────────────────────────────────────────────────────

create table if not exists public.notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  path          text not null,
  title         text not null,
  aliases       text[] not null default '{}',
  tags          text[] not null default '{}',
  frontmatter   jsonb  not null default '{}',
  content_hash  text not null,
  mtime         timestamptz,
  chunk_count   int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, path)
);

create index if not exists notes_user_idx  on public.notes (user_id);
create index if not exists notes_tags_idx  on public.notes using gin (tags);
create index if not exists notes_title_idx on public.notes (user_id, lower(title));

-- ── Chunks ─────────────────────────────────────────────────────

create table if not exists public.note_chunks (
  id            uuid primary key default gen_random_uuid(),
  note_id       uuid not null references public.notes (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  chunk_index   int not null default 0,
  heading_path  text,
  content       text not null,
  token_count   int,
  embedding     vector(1536),
  tsv           tsvector generated always as (to_tsvector('portuguese', content)) stored,
  created_at    timestamptz not null default now()
);

-- HNSW para similaridade de cosseno; GIN para o full-text em português.
create index if not exists note_chunks_embedding_idx
  on public.note_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists note_chunks_tsv_idx  on public.note_chunks using gin (tsv);
create index if not exists note_chunks_note_idx on public.note_chunks (note_id);
create index if not exists note_chunks_user_idx on public.note_chunks (user_id);

-- ── Grafo de wikilinks ─────────────────────────────────────────
-- target_note_id fica nulo quando o título é ambíguo ou não resolve;
-- nesse caso o link existe para auditoria mas não expande no RAG.

create table if not exists public.note_links (
  source_note_id uuid not null references public.notes (id) on delete cascade,
  target_title   text not null,
  target_note_id uuid references public.notes (id) on delete set null,
  user_id        uuid not null references auth.users (id) on delete cascade,
  primary key (source_note_id, target_title)
);

create index if not exists note_links_target_idx on public.note_links (target_note_id);
create index if not exists note_links_user_idx   on public.note_links (user_id);

-- ── Conversas e mensagens ──────────────────────────────────────

create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_idx on public.conversations (user_id, updated_at desc);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  sources         jsonb not null default '[]',
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- ── Auditoria de sync e de custo ───────────────────────────────

create table if not exists public.sync_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  stats       jsonb not null default '{}',
  status      text not null default 'running' check (status in ('running', 'ok', 'error')),
  error       text
);

create index if not exists sync_runs_user_idx on public.sync_runs (user_id, started_at desc);

create table if not exists public.token_usage (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  conversation_id   uuid references public.conversations (id) on delete set null,
  operation         text not null,          -- rewrite | rerank | answer | embed | title
  model             text not null,
  prompt_tokens     int not null default 0,
  completion_tokens int not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists token_usage_user_idx on public.token_usage (user_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════
-- RLS — sem exceção. auth.uid() é a única chave de acesso.
-- O script de sync usa service_role, que bypassa por design.
-- ═══════════════════════════════════════════════════════════════

alter table public.notes         enable row level security;
alter table public.note_chunks   enable row level security;
alter table public.note_links    enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.sync_runs     enable row level security;
alter table public.token_usage   enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'notes', 'note_chunks', 'note_links',
    'conversations', 'messages', 'sync_runs', 'token_usage'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t || '_owner', t
    );
  end loop;
end $$;

-- ── updated_at automático ──────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists notes_touch on public.notes;
create trigger notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();

drop trigger if exists conversations_touch on public.conversations;
create trigger conversations_touch before update on public.conversations
  for each row execute function public.touch_updated_at();
