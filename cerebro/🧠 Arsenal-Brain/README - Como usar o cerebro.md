---
tipo: metodo
status: pronto
tags: [meta]
---
# Como usar o cérebro Arsenal

Este vault é a **única fonte de verdade** da IA Arsenal. Ela não sabe nada que não
esteja escrito aqui — e é instruída a dizer "isso não está no Arsenal" em vez de
inventar. A qualidade das respostas é exatamente a qualidade destas notas.

## As 5 convenções que fazem o RAG funcionar

1. **Wikilinks são o grafo.** Toda call linka as objeções e perfis que apareceram
   nela; toda objeção linka as calls onde aparece. A busca expande 1 salto pelo
   grafo — é isso que produz respostas do tipo *"na Call-007 o David resolveu
   assim"* em vez de teoria solta.
2. **Headings descritivos, nunca genéricos.** `## Objeção: tá caro [12:40]` indexa
   e vira contexto. `## Parte 2` não diz nada e polui o chunk.
3. **Uma ideia por nota.** Nota de objeção não mistura duas objeções. Chunk limpo,
   retrieval limpo.
4. **Frases exatas entre aspas.** O valor do acervo está no literal, não no resumo.
   Transcreva a fala como ela saiu. Resumo de fala não treina ninguém.
5. **Zero dado pessoal de cliente.** Nomes, telefones e empresas anonimizados na
   origem. A privacidade mora na camada do dado, não só no prompt.

## Frontmatter obrigatório

```yaml
tipo: call | objecao | perfil | metodo | script | frase | nicho
etapa: conexao | diagnostico | apresentacao | objecao | fechamento
nicho: saude | geral | ...
status: rascunho | pronto      # rascunho NÃO é indexado
resultado: fechada | perdida   # só em calls
dificuldade: campo | inferno   # só em perfis
tags: [high-ticket, objecao-preco]
```

`tipo` e `etapa` viram filtros de recuperação. No sparring de "Pressiona preço", a
busca prioriza `tipo: perfil` + `tipo: objecao` com tag `objecao-preco`. Na análise
de call, prioriza `tipo: metodo` + `tipo: call` da etapa em que o closer errou.

## O campo `status`

As notas criadas automaticamente vieram como `status: rascunho` — são esqueletos,
não conteúdo. **O sync ignora rascunhos**, para que a IA nunca cite um template
vazio como se fosse método. Ao preencher uma nota com material real, troque para
`status: pronto` e rode o sync.

## O que já está pronto

`00-Cerebro/` tem os três documentos destilados das 8 calls reais do David
(abril–agosto, 74 a 152 min cada). São a base que a IA usa hoje:

- [[01 - Persona e Voz - David William]] — bordões, tom, crenças, anti-padrões
- [[02 - Metodologia de Vendas - David William]] — as 3 etapas, as 7 fontes, preço, garantia, fechamento
- [[03 - Playbook de Objecoes - David William]] — 8 objeções com script verbatim

`08-Fonte-Bruta/` guarda as transcrições originais e os gabaritos. **Fica fora do
índice de propósito**: a IA deve citar conhecimento destilado, não duas horas de
call literal. Use a pasta para conferir a fonte de qualquer frase.

## Mínimo viável para o sparring ficar realista

- [ ] 5 notas de método preenchidas (`00-Metodo/`)
- [ ] 5 objeções preenchidas (`02-Objecoes/`)
- [ ] 3 perfis preenchidos (`03-Perfis/`)
- [ ] 3 calls reais transcritas (`01-Calls/`)

Abaixo disso o cliente simulado soa genérico, porque não há acervo de onde tirar
fala real.

## Depois de editar

```bash
npm run sync -- --full     # reindexa tudo
npm run sync -- --watch    # incremental, rodando junto com o Obsidian
```
