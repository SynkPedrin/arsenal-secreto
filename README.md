# ARSENAL

Plataforma de IA privada. **Groq como motor de pensamento, o vault do Obsidian como cérebro**, ligados por um pipeline de RAG híbrido (vetorial + full-text + grafo de wikilinks + reranking).

---

## Pré-requisitos

- **Node 22** — a máquina tem via nvm, mas **fora do PATH**. Antes de qualquer comando:

  ```bash
  export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"
  # ou, com nvm carregado:  nvm use
  ```

- Um projeto **Supabase** (Postgres + pgvector).
- Uma chave da **Groq** ([console.groq.com](https://console.groq.com)).

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
| `GROQ_API_KEY` | **servidor** | Chat e transcrição |
| `NEXT_PUBLIC_SUPABASE_URL` | público | Endpoint do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | Acesso sob RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **servidor/scripts apenas** | Ingestão (bypassa RLS) |
| `OBSIDIAN_VAULT_PATH` | script local | Caminho absoluto do vault |
| `ARSENAL_SECRETO_URL` | ambos | Site exibido na aba do cofre |
| `ARSENAL_MASTER_KEY` | **servidor** | Destrava `/curso` sem compra (demo). Vazio = rota 404 |
| `HOTMART_HOTTOK` | **servidor** | Token do postback da Hotmart |
| `NEXT_PUBLIC_ARSENAL_HOTMART_PRODUCT_ID` | público | Casa o webhook com o slug do catálogo |
| `NEXT_PUBLIC_ARSENAL_CHECKOUT_URL` | público | Link de checkout (vazio antes do lançamento) |
| `NEXT_PUBLIC_ARSENAL_SALES_URL` | público | Página de vendas |
| `NEXT_PUBLIC_ARSENAL_PRODUCT_STATUS` | público | `coming_soon` ou `live` |

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
| F1 | Ingestão do vault (parser, chunking, grafo) | ✅ local |
| F2 | RAG core (BM25 + grafo; híbrido pende de embeddings) | ✅ parcial |
| F3 | Chat com streaming SSE e fontes citadas | ✅ |
| F4 | Esfera de partículas reativa | ✅ |
| F5 | Arsenal Secreto ✅ · Analytics ✅ (substituiu a Base Central) | ✅ |
| F6 | Polimento, responsivo, estados vazios | ⏳ |
| F7 | Voz: captura, esfera reativa, `/api/transcribe` | ✅ |
| F8 | Voz da IA (síntese do navegador) + toggles | ✅ |
| F9 | Modo Treinamento (sparring + debriefing) | ✅ local |

Tudo marcado ✅ responde de verdade pela Groq. O histórico de treinos persiste em
`localStorage` até as chaves do Supabase entrarem — o formato do registro já é o
da tabela `training_sessions`.

## O motor

**Groq**, via endpoint compatível com a API da OpenAI — o SDK é o mesmo, muda a
baseURL e a chave ([`src/lib/ai/llm.ts`](src/lib/ai/llm.ts)).

| Função | Modelo |
|---|---|
| Resposta | `openai/gpt-oss-120b` |
| Tarefas leves | `llama-3.1-8b-instant` |
| Transcrição | `whisper-large-v3-turbo` |
| Voz da IA | síntese do navegador (pt-BR) |
| Embeddings | **pendente** |

Dois buracos do catálogo da Groq, e o que foi feito com cada um:

- **Sem TTS em português.** A Groq só tem voz em inglês (orpheus). A fala usa
  `speechSynthesis` do navegador, que tem vozes pt-BR nativas e custo zero. Como
  a API não expõe o áudio, a esfera pulsa por evento de fronteira de palavra em
  vez de amplitude real — acompanha o ritmo, não o envelope.
- **Sem embeddings.** Nenhum modelo do catálogo gera vetores. Quando a F1
  indexar o vault, o embedding vai precisar de outra origem; as opções e o
  impacto na dimensão da coluna estão em
  [`src/lib/ai/config.ts`](src/lib/ai/config.ts).

Os modelos `gpt-oss` emitem tokens de raciocínio antes do conteúdo. No chat isso
é latência pura, então `reasoning_effort` fica em `low`; no debriefing e no
diagnóstico do Analytics, onde julgar bem vale mais que responder rápido, sobe
para `medium`.

## O cérebro (RAG)

A IA lê o vault do Obsidian **direto do disco**, sem banco e sem embeddings:
`readVault()` varre `OBSIDIAN_VAULT_PATH`, separa frontmatter, extrai wikilinks e
tags, quebra por headings H1–H3 e cacheia por mtime. A busca é BM25 com boost de
título/heading, mais **expansão de 1 salto pelo grafo de wikilinks** — é isso que
traz a call junto da técnica.

Foi a escolha certa para agora: o Supabase ainda não tem chaves e a Groq não gera
vetores, mas o vault são arquivos locais e o acervo é pequeno. Quando o pgvector
entrar, `src/lib/rag/vault.ts` vira a etapa de ingestão e a busca passa a híbrida.

**Nota com `status: rascunho` não é indexada.** É a regra anti-alucinação na
camada do dado: a IA nunca pode citar um gabarito `[EXTRAIR]` como se fosse
método. Veja o estado real do índice em [/analytics](http://localhost:3100/analytics)
— notas indexadas, trechos, rascunhos de fora, e um campo para testar a busca.

## A IA

A persona vem do **Documento 4** (Prompt do Agente): 4 modos — consulta de
técnica, roleplay, feedback de call e objeção relâmpago — mais as regras R1-R10.
Vive em [`src/lib/ai/persona.ts`](src/lib/ai/persona.ts).

Os **Documentos 1, 2 e 3** (Persona & Voz, Metodologia, Playbook de Objeções) NÃO
ficam no prompt: eles são o cérebro, moram no vault em `00-Cerebro/` e chegam por
RAG. É isso que permite atualizar o método sem tocar no código.

O prompt tem dois estados. **Com fontes recuperadas**, ele cita a nota de origem.
**Sem fontes**, ele proíbe citar qualquer call, número ou frase do David e obriga
a marcar a resposta como princípio geral — é a R1/R7 aplicada por construção.

⚠️ **Os Documentos 1-3 estão vazios.** São gabaritos com campos `[EXTRAIR]`
aguardando a transcrição do David. Enquanto isso, a IA opera com princípios gerais
e diz que o tema não está no método documentado. Preencher e trocar para
`status: pronto` é o que destrava o valor real.

## Esteira de compra (Hotmart)

```
página de vendas → checkout Hotmart → pagamento
                                          │
              ┌───────────────────────────┴──────────────────┐
              ▼                                              ▼
   webhook POST /api/webhooks/hotmart          comprador volta para /obrigado
   (server-to-server, valida o hottok)         informa o e-mail da compra
              │                                              │
              ▼                                              ▼
   grava em `purchases`                        magic link → /auth/callback
                          └──────► claim_entitlements() ◄────┘
                                          │
                                          ▼
                            `entitlements` → /curso liberado
```

**O e-mail digitado não libera nada.** Ele só dispara um magic link; quem prova a
titularidade é o clique no link recebido naquele endereço, verificado pelo Supabase
Auth. `claim_entitlements` recusa usuário com e-mail não confirmado.

O único atalho é `ARSENAL_MASTER_KEY`: com ela definida, `/acesso-master?key=...`
grava um cookie httpOnly de 12h e `/curso` abre com selo **master · demo**, para
nunca ser confundido com compra real. Sem a variável, a rota responde 404.
**Nunca definir em produção.** Fora isso, sem Supabase `/curso` responde "não
configurado" — nunca "liberado". Reembolso e chargeback revogam na hora, e um retry atrasado de
aprovação não ressuscita acesso já reembolsado.

### Configurar na Hotmart

1. **Ferramentas → Webhook (Postback)** → URL `https://SEU-DOMINIO/api/webhooks/hotmart`,
   versão 2.0. Copie o *hottok* para `HOTMART_HOTTOK`.
2. Eventos: compra aprovada, completa, reembolso, chargeback, cancelamento.
3. **Página de obrigado** → `https://SEU-DOMINIO/obrigado`.
4. Preencha `NEXT_PUBLIC_ARSENAL_HOTMART_PRODUCT_ID` e `NEXT_PUBLIC_ARSENAL_CHECKOUT_URL`.
5. No lançamento, troque `NEXT_PUBLIC_ARSENAL_PRODUCT_STATUS` para `live`.

O conteúdo do curso vive em [`src/lib/commerce/catalog.ts`](src/lib/commerce/catalog.ts) —
o banco guarda só o que é transacional.

## Segurança

- Nenhuma chave em código; `.env*` é ignorado pelo git (exceto `.env.example`).
- `service_role` nunca chega ao browser.
- RLS ativa em todas as tabelas, filtrando por `auth.uid()`.
