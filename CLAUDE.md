# CLAUDE.md — Contexto Mestre · Loterias CAIXA

> Este arquivo é o **contexto mestre** (identidade, arquitetura, princípios, decisões globais).
> O protocolo operacional dos agentes fica em `AGENTS.md`.
> Não duplicar regras: contexto aqui, execução lá.

## 1. Identidade

Aplicação web de **geração, análise e conferência de jogos das Loterias CAIXA**.
Cobre 9 modalidades: Lotofácil, Lotomania, Mega-Sena, Quina, Dupla Sena,
Timemania, Dia de Sorte, +Milionária e Super Sete.

## 2. Stack

```
Framework   Next.js 16 (App Router, Turbopack)
Linguagem   TypeScript 5 (estrito; evitar any)
UI          React 19 + Tailwind CSS v4 + shadcn/base-ui + lucide-react
Gráficos    Recharts (client component)
Dados       Supabase (Postgres + Auth + Storage)
Testes      Vitest 5 + Testing Library (jsdom)
Deploy      Vercel (região gru1)
Release     semantic-release + commitlint + husky
```

## 3. Arquitetura de pastas

```
src/app/            páginas (App Router)
src/app/api/        rotas de API
src/components/     layout · lottery · ui
src/lib/            db, loterias, admin, notifications, pdf, supabase/*
src/modules/        scoring · analytics · strategies · sync · lottery (regras por modalidade)
src/types/          contratos de domínio
database/           schema.sql + migrações incrementais
tests/              unit tests
docs/               PRD · ADR · SPEC · PLAN
```

## 4. Modelo de dados (Supabase)

```
loterias          configuração parametrizada por modalidade
concursos         resultados (dezenas_sorteadas INTEGER[])
lotes_geracao     lote de geração
jogos_gerados     jogos (dezenas INTEGER[], score, score_breakdown JSONB)
perfil_foto       avatar_base64 + camuflagem_ativa
notificacoes      avisos ao usuário
apostas / boloes  apostas e bolões
```

## 5. Modalidades — mecânicas

- **Conjunto** (não ordenado): Lotofácil, Lotomania, Mega-Sena, Quina, Dupla Sena, Timemania, Dia de Sorte, +Milionária.
- **Posicional** (colunas): **Super Sete** — 7 colunas 0–9, acerto por posição.
- **Componentes extras**: Timemania (Time), Dia de Sorte (Mês), +Milionária (Trevos), Dupla Sena (2 sorteios).
- Regras oficiais e tabela de preços: `docs/SPEC-regras-loterias.md`. Fonte: loterias.caixa.gov.br.

## 6. Fluxo documental

```
PRD → ADR (quando necessário) → SPEC → PLAN → Developer → Tester → Reviewer → DONE
```

- **PRD** — por quê, o quê, para quem. Não descreve implementação.
- **ADR** — decisão arquitetural + trade-offs. Substituições registradas, nunca sobrescritas.
- **SPEC** — contrato técnico: arquivos, APIs, dados, fluxos, erros, critérios de aceite.
- **PLAN** — checklist vivo (`planned → in progress → done`) com bloqueios e evidências.

## 7. Princípios

1. **Resiliência** — degradar com fallback, nunca tela branca nem falha silenciosa.
2. **Auth-first** — toda rota de API protegida checa autenticação. Sem exceção silenciosa.
3. **Persistência best-effort** — gravação secundária nunca bloqueia a UX.
4. **No silent failures** — todo `catch` loga; todo boundary mostra fallback.
5. **NO EVIDENCE = NO CLAIM** — intenção ≠ resultado; código escrito ≠ código validado.

## 8. Convenções de código

- Componentes: `'use client'` no topo, funcionais, lazy-load de deps pesadas.
- Rotas de API: `export const runtime = "nodejs"` e `dynamic = "force-dynamic"` quando necessário; status HTTP corretos (400/401/403/404/500/502).
- Estilo: Tailwind + tokens em `globals.css`. Tema dark.
- Estado: `useState` + `useRef`; `useCallback` para referências estáveis; hooks sempre no topo (nunca após `return` condicional).
- Sem comentários salvo lógica não óbvia.

## 9. Padrões proibidos

- ❌ `console.log` em produção (usar `console.warn` / `console.error`).
- ❌ `any` sem justificativa.
- ❌ segredos/chaves hardcoded.
- ❌ `catch {}` silencioso.
- ❌ hooks condicionais ou impuros (ex.: `Date.now()` durante render).
- ❌ `params`/`searchParams` síncronos (removido no Next 16).
- ❌ `images.domains` (usar `images.remotePatterns`).
- ❌ alterar `middleware` sem ler os docs do Next 16 em `node_modules/next/dist/docs/`.

## 10. Documentação e código evoluem juntos

| Mudou | Atualizar |
|---|---|
| arquitetura/segurança | ADR |
| requisito | PRD |
| implementação | SPEC |
| execução | PLAN |
| comportamento dos agentes | AGENTS.md |
| contexto/princípios | CLAUDE.md |

Nenhum documento pode contradizer o estado real do sistema.
