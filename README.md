# ARSENAL

Plataforma de IA privada. **GPT como motor de pensamento, o vault do Obsidian como cérebro**, ligados por um pipeline de RAG híbrido (vetorial + full-text + grafo de wikilinks + reranking).

---

## Pré-requisitos

- **Node 22** — a máquina tem via nvm, mas **fora do PATH**. Antes de qualquer comando:

  ```bash
  export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"
  # ou, com nvm carregado:  nvm use
  ```

- Um projeto **Supabase** (Postgres + pgvector).
- Uma chave da **OpenAI**.

## Setup

```bash
cd "arsenal-app"
npm install
cp .env.example .env.local     # e preencha
npm run dev                    # http://localhost:3100
```

### Variáveis de ambiente

| Variável | Onde vive | Para quê |
|---|---|---|
| `OPENAI_API_KEY` | servidor/scripts | Geração e embeddings |
| `NEXT_PUBLIC_SUPABASE_URL` | público | Endpoint do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | Acesso sob RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **servidor/scripts apenas** | Ingestão (bypassa RLS) |
| `OBSIDIAN_VAULT_PATH` | script local | Caminho absoluto do vault |
| `ARSENAL_SECRETO_URL` | ambos | Site exibido na aba do cofre |

`src/lib/env.server.ts` importa `server-only`: se um componente de cliente puxar um segredo, o build quebra em vez de vazar.

### Banco

Aplique a migration em **SQL Editor → New query** no painel do Supabase, colando
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). Ou, com a CLI:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

A migration cria as tabelas, os índices (HNSW para cosseno, GIN para o full-text em português) e **ativa RLS em todas elas**.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Dev server na porta 3100 |
| `npm run build` | Build de produção |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run sync -- --full` | Reindexa o vault inteiro *(F1)* |
| `npm run sync -- --watch` | Sync incremental contínuo *(F1)* |
| `npm run capture-preview` | Screenshot de fallback do Arsenal Secreto *(F5)* |

## Estrutura

```
arsenal-app/
├── src/
│   ├── app/                     # rotas (App Router)
│   │   ├── page.tsx             # Home / IA
│   │   ├── base-central/        # gestão do cérebro
│   │   ├── arsenal-secreto/     # prévia do cofre
│   │   ├── conversas/           # histórico
│   │   └── config/              # modelo, persona, RAG
│   ├── components/
│   │   ├── layout/              # Sidebar, StatusPill, PageShell
│   │   ├── sphere/              # esfera de partículas (F4)
│   │   └── ui/
│   └── lib/
│       ├── env.ts               # env público, validado por zod
│       ├── env.server.ts        # segredos (server-only)
│       ├── nav.ts               # fonte única da navegação
│       ├── rag/                 # pipeline de recuperação (F2)
│       └── supabase/            # client / server / admin + tipos
├── scripts/                     # sync-vault, capture-preview
└── supabase/migrations/
```

O vault fica **fora** do projeto, em `../arsenal secreto/`, e é apontado por `OBSIDIAN_VAULT_PATH`.

## Fases

| Fase | Escopo | Status |
|---|---|---|
| F0 | Fundação: Next + design system + shell + schema + RLS | ✅ |
| F1 | Ingestão do vault (parser, chunking, hash, embeddings) | ⏳ |
| F2 | RAG core (híbrido + RRF + grafo + reranking) | ⏳ |
| F3 | Chat com streaming SSE e fontes citadas | ⏳ |
| F4 | Esfera de partículas reativa | ⏳ |
| F5 | Arsenal Secreto + Base Central | ⏳ |
| F6 | Polimento, responsivo, estados vazios | ⏳ |

## Segurança

- Nenhuma chave em código; `.env*` é ignorado pelo git (exceto `.env.example`).
- `service_role` nunca chega ao browser.
- RLS ativa em todas as tabelas, filtrando por `auth.uid()`.
