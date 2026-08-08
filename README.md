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
│   │   ├── analytics/           # leitura dos treinos e calls
│   │   ├── treinamento/         # sparring
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
| F3 | Chat com streaming SSE e fontes citadas | ✅ sem RAG |
| F4 | Esfera de partículas reativa | ✅ |
| F5 | Arsenal Secreto ✅ · Analytics ✅ (substituiu a Base Central) | ✅ |
| F6 | Polimento, responsivo, estados vazios | ⏳ |
| F7 | Voz: captura, esfera reativa, `/api/transcribe` | ✅ |
| F8 | Voz: `/api/tts`, player, toggles | ✅ |
| F9 | Modo Treinamento (sparring + debriefing) | ✅ local |

O que está marcado ✅ roda ponta a ponta, mas **depende de crédito na conta OpenAI**
para produzir resposta. O histórico de treinos persiste em `localStorage` até as
chaves do Supabase entrarem — o formato do registro já é o da tabela
`training_sessions`.

## A IA

A persona, os 4 modos (sparring, análise, consultor, pré-call) e as regras
anti-alucinação vivem em [`src/lib/ai/persona.ts`](src/lib/ai/persona.ts). O prompt
tem dois estados: **com cérebro** (cita fontes do vault) e **sem cérebro** (proibida
de citar qualquer call — é o estado atual, até a F2 ligar o RAG).

O cérebro fica em `../arsenal secreto/🧠 Arsenal-Brain/`, com a estrutura, os
templates e as convenções descritas no README de lá. As notas geradas vieram como
`status: rascunho` e **não são indexadas** — trocar para `status: pronto` ao
preencher com material real.

## Segurança

- Nenhuma chave em código; `.env*` é ignorado pelo git (exceto `.env.example`).
- `service_role` nunca chega ao browser.
- RLS ativa em todas as tabelas, filtrando por `auth.uid()`.
