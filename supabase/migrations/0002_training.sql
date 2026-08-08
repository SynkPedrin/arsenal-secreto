-- ═══════════════════════════════════════════════════════════════
-- ARSENAL — sessões de treinamento (F9)
-- Cada sparring vira um registro; o debriefing alimenta o loop
-- adaptativo do próximo treino.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.training_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  objective       text not null,
  product         text,
  ticket          numeric,
  client_profile  text,
  difficulty      text check (difficulty in ('campo', 'inferno')),
  result          text check (result in ('fechou', 'perdeu', 'encerrou')),
  score           int check (score between 0 and 10),
  debrief         jsonb,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz
);

create index if not exists training_sessions_user_idx
  on public.training_sessions (user_id, started_at desc);

alter table public.training_sessions enable row level security;

drop policy if exists training_sessions_owner on public.training_sessions;
create policy training_sessions_owner on public.training_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
