# Loterias CAIXA — Gerador, Análise e Conferência de Jogos

Aplicação web para **gerar, analisar e conferir jogos das Loterias CAIXA**,
com as regras oficiais de cada modalidade.

## Modalidades

| Modalidade | Mecânica | Extras |
|---|---|---|
| Lotofácil, Mega-Sena, Quina, Lotomania, Dupla Sena | conjunto (não ordenado) | — |
| Timemania | conjunto | Time do Coração |
| Dia de Sorte | conjunto | Mês da Sorte |
| +Milionária | conjunto | Trevos (2–6) |
| Super Sete | **posicional** (7 colunas 0–9) | — |

Regras, preços e faixas seguem `src/lib/loterias.ts` e `docs/SPEC-regras-loterias.md`
(fonte: loterias.caixa.gov.br).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Supabase (Auth + Postgres + Storage) · Recharts · Vitest · Vercel.

## Estrutura

```
src/modules/lottery/   motor de regras (gerar/validar/conferir/custo)
src/modules/scoring/   score estatístico dos jogos
src/modules/analytics/ estatísticas a partir de concursos
src/modules/strategies estratégias de geração
src/modules/sync/      sincronização de resultados (CAIXA + 2 fallbacks)
database/              schema.sql + migrações incrementais
docs/                  ADR · SPEC · PLAN
tests/unit/            vitest (45 testes)
```

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencha as chaves Supabase
npm run dev
```

## Verificação

```bash
npm run lint
npm run typecheck
npm run build
npm run test:run
```

## Governança

`AGENTS.md` (execução operacional dos agentes) e `CLAUDE.md` (contexto mestre).