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
| `npm test` | Vitest — 28 testes sobre RAG, protocolo SSE e system prompt |
| `npm run test:watch` | Vitest em modo observador |
| `npm run sync` | Auditoria do cérebro: o que a IA enxerga e o que ficou de fora |
| `npm run sync -- --full` | Idem, listando nota por nota |
| `npm run sync -- --watch` | Reindexa a cada alteração no vault |
| `npm run capture-preview` | Screenshot de fallback do cofre (exige Playwright, opcional) |
| `npm run video:studio` | Remotion Studio para editar a composição do herói |
| `npm run video:render` | Renderiza o criativo em `out/closers-ia.mp4` |

## Estrutura

```
arsenal-app/
├── src/
│   ├── app/                     # rotas (App Router)
│   │   ├── layout.tsx           # raiz: fontes e tema
│   │   ├── (app)/               # produto: com barra lateral
│   │   │   └── page.tsx         # Home / IA
│   │   ├── lp/                  # landing full-bleed, sem barra
│   │   ├── analytics/           # leitura dos treinos e calls
│   │   ├── treinamento/         # sparring
│   │   ├── arsenal-secreto/     # prévia do cofre
│   │   ├── conversas/           # histórico
│   │   └── config/              # modelo, persona, RAG
│   ├── remotion/                # composições de vídeo
│   ├── components/
│   │   ├── lp/                  # herói da landing (Player)
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

O cérebro fica em [`cerebro/`](cerebro/) — é um vault do Obsidian versionado junto
com o código, apontado por `OBSIDIAN_VAULT_PATH=./cerebro`. Abra essa pasta como
vault no Obsidian para editar as notas.

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

O cérebro está **preenchido**: [`cerebro/🧠 Arsenal-Brain/00-Cerebro/`](cerebro/) tem
os três documentos destilados de **8 calls reais** (74 a 152 min cada) — persona e
bordões, as 3 etapas do método com as 7 fontes de aquisição, e 8 objeções com
script verbatim.

`08-Fonte-Bruta/` guarda as transcrições e fica **fora do índice**: a IA cita
conhecimento destilado, não duas horas de call literal nem gabarito com campos
`[EXTRAIR]`. Use a pasta para auditar a origem de qualquer frase.

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

## Landing page e Remotion

`/lp` é a landing do **Closer's IA**, com a linguagem da Raycast — navbar
flutuante em pílula, headline gigante com tracking negativo, coluna central
estreita — sobre a identidade platina do produto.

O herói não é vídeo gravado nem CSS: é uma composição **Remotion** rodando ao
vivo via `@remotion/player`. O monograma DW é o núcleo e as cinco etapas do
método orbitam como elétrons — a metáfora é o produto, não decoração.

**A mesma composição produz duas saídas:**

```bash
npm run video:studio    # editar no Remotion Studio
npm run video:render    # gerar out/closers-ia.mp4 para anúncio
```

Um só código-fonte em [`src/remotion/`](src/remotion/) alimenta o herói da
página e o criativo de mídia paga. Mudou a marca, mudam os dois.

Detalhes que custaram tempo e vale registrar:

- O Player se posiciona **absoluto** dentro do contêiner. Sem `aspect-ratio` no
  pai, ele colapsa e a cena some — `height: auto` não resolve.
- Animação tem que ser dirigida por `useCurrentFrame()` + `interpolate()`.
  `transition` de CSS não existe quando o Remotion renderiza quadro a quadro.
- O `<Img>` do Remotion chama `decode()`, que é mais estrito que um `<img>`
  comum. O PNG do monograma passava no navegador e falhava aqui.

### ⚠️ Licença do Remotion

O Remotion é gratuito para pessoas físicas e empresas pequenas, mas **exige
licença paga para empresas acima de três pessoas**. Este projeto passa
`acknowledgeRemotionLicense` ao Player. Se o Closer's IA virar produto comercial
da Destino Ads, a licença precisa ser adquirida — ver
[remotion.dev/license](https://remotion.dev/license).

## Testes

```bash
npm test
```

28 testes em Vitest, todos sobre lógica pura — sem mock de rede:

- **`src/lib/rag/vault.test.ts`** monta um vault temporário em disco e prova o
  que mais importa: rascunho, transcrição crua e template **nunca** são
  recuperados. É a regra anti-alucinação verificada na camada do dado, não só
  no prompt. Cobre também chunking por heading, extração de wikilink, expansão
  pelo grafo, normalização de acento e o caso "vault não cobre" que dispara a R1.
- **`src/lib/ai/persona.test.ts`** garante que os dois estados do prompt são
  mutuamente exclusivos: com fontes ele manda citar, sem fontes ele proíbe citar
  qualquer call. Também cobre o bloco de roleplay e o schema do debriefing.
- **`src/lib/chat/protocol.test.ts`** quebra o stream SSE em pedaços de 7 bytes
  para provar que evento partido no meio é remontado, e que frame corrompido não
  derruba o resto.

## Privacidade do acervo

As 8 calls são reais. Antes de o repositório ir a público, todo o acervo passou por
**de-identificação**, não por troca cosmética de nome — numa cidade de 25 mil
habitantes, "a pediatra que abriu consultório este ano" é uma pessoa só, com ou sem
o primeiro nome.

Foram substituídos, de forma consistente em todos os arquivos:

- nome e sobrenome dos 8 clientes, e o apelido usado no meio da fala;
- terceiros citados dentro das calls (outro médico, a secretária, a sócia);
- cidade, hospital, clínica e operadora de saúde;
- **um e-mail pessoal ditado em voz alta** e **um telefone falado dígito a dígito** —
  os dois escapariam de qualquer regex de nome, e são o motivo de a auditoria ter
  procurado padrão de PII e não só palavra.

O que permanece: David William e a Destino Ads, que são o autor do método e a marca
do projeto, e os valores comerciais, que são dele.

O script de auditoria usado está no histórico do commit que fez a troca. Mesmo
assim, uma call verbatim de duas horas descreve rotina, família e finanças de uma
pessoa real — quem conviva com ela pode reconhecê-la pelo contexto. Se o acervo for
usado fora deste TCC, o certo é ter consentimento dos participantes.

## Segurança

- Nenhuma chave em código; `.env*` é ignorado pelo git (exceto `.env.example`).
- `service_role` nunca chega ao browser.
- RLS ativa em todas as tabelas, filtrando por `auth.uid()`.
