-- ═══════════════════════════════════════════════════════════════
-- ARSENAL — compras da Hotmart e liberação de acesso
--
-- Fluxo: a Hotmart avisa a compra pelo webhook (sem usuário logado,
-- via service_role) → `purchases`. Quando a pessoa entra no sistema com
-- o MESMO e-mail e ele é verificado pelo Supabase Auth, a compra vira
-- `entitlements`. E-mail digitado nunca libera nada sozinho.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.purchases (
  id                 uuid primary key default gen_random_uuid(),
  -- Chave de idempotência: a Hotmart reenvia o mesmo evento em retry.
  transaction        text not null unique,
  event              text not null,
  product_slug       text not null,
  hotmart_product_id text,
  buyer_email        text not null,
  buyer_name         text,
  status             text not null default 'approved'
                     check (status in ('approved', 'refunded', 'chargeback', 'canceled', 'expired')),
  amount             numeric,
  currency           text,
  payload            jsonb not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Busca por e-mail é sempre case-insensitive: a pessoa digita como quiser.
create index if not exists purchases_email_idx on public.purchases (lower(buyer_email));
create index if not exists purchases_product_idx on public.purchases (product_slug);

create table if not exists public.entitlements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  product_slug text not null,
  purchase_id  uuid references public.purchases (id) on delete set null,
  source       text not null default 'hotmart',
  status       text not null default 'active' check (status in ('active', 'revoked')),
  granted_at   timestamptz not null default now(),
  revoked_at   timestamptz,
  unique (user_id, product_slug)
);

create index if not exists entitlements_user_idx on public.entitlements (user_id, status);

-- ── RLS ────────────────────────────────────────────────────────

alter table public.purchases    enable row level security;
alter table public.entitlements enable row level security;

-- Compras: leitura apenas do que foi comprado com o e-mail verificado da
-- sessão. Escrita é exclusiva do webhook, que roda com service_role.
drop policy if exists purchases_own on public.purchases;
create policy purchases_own on public.purchases
  for select to authenticated
  using (lower(buyer_email) = lower((select auth.jwt() ->> 'email')));

drop policy if exists entitlements_own on public.entitlements;
create policy entitlements_own on public.entitlements
  for select to authenticated
  using (user_id = (select auth.uid()));

drop trigger if exists purchases_touch on public.purchases;
create trigger purchases_touch before update on public.purchases
  for each row execute function public.touch_updated_at();

-- ── Conversão de compra em acesso ──────────────────────────────
-- security definer porque precisa ler auth.users; o filtro por e-mail
-- verificado é o que impede um usuário de reivindicar a compra de outro.

create or replace function public.claim_entitlements(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email    text;
  v_verified boolean;
  v_count    int := 0;
begin
  select lower(u.email), (u.email_confirmed_at is not null)
    into v_email, v_verified
    from auth.users u
   where u.id = p_user_id;

  if v_email is null or not v_verified then
    return 0;
  end if;

  with granted as (
    insert into public.entitlements (user_id, product_slug, purchase_id, source, status)
    select p_user_id, p.product_slug, p.id, 'hotmart', 'active'
      from public.purchases p
     where lower(p.buyer_email) = v_email
       and p.status = 'approved'
    on conflict (user_id, product_slug) do update
      set status      = 'active',
          revoked_at  = null,
          purchase_id = excluded.purchase_id
    returning 1
  )
  select count(*) into v_count from granted;

  -- Reembolso e chargeback derrubam o acesso na mesma passada.
  update public.entitlements e
     set status = 'revoked', revoked_at = now()
   where e.user_id = p_user_id
     and e.status = 'active'
     and not exists (
       select 1 from public.purchases p
        where lower(p.buyer_email) = v_email
          and p.product_slug = e.product_slug
          and p.status = 'approved'
     );

  return v_count;
end $$;

revoke all on function public.claim_entitlements(uuid) from public, anon;
grant execute on function public.claim_entitlements(uuid) to authenticated, service_role;
