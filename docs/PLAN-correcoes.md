# PLAN — Correções e regras por modalidade (checklist vivo)

Legenda: `[ ]` planned · `[~]` in progress · `[x]` done · `[!]` blocked

## Parte A — Documentos
- [x] `CLAUDE.md` adaptado ao contexto loterias-caixa
- [x] `AGENTS.md` adaptado (preserva bloco nextjs-agent-rules)
- [x] `docs/ADR-001-admin-auth.md`
- [x] `docs/ADR-002-mecanica-loterias.md`
- [x] `docs/SPEC-regras-loterias.md`
- [x] `docs/PLAN-correcoes.md`

## Parte B — Modelo e regras
- [x] Estender tipos `Loteria` (mecanica, componentes_extras, colunas)
- [x] Corrigir `src/lib/loterias.ts` (preços, faixas, dias, extras)
- [x] `src/modules/lottery` (contrato + conjunto + posicional + registry)

## Parte C — Banco (HIGH, aprovado)
- [x] `database/migration_regras_loterias.sql` (colunas + seeds + metadados)
- [x] `schema.sql` atualizado para instalações novas

## Parte D — Código
- [x] Roteamento do motor em `api/gerar/[loteria]`
- [x] Dedupe posicional + camuflagem posicional
- [~] Scoring/analytics/estatisticas por coluna + extras (analytics por coluna adiado; scoring continua genérico sem quebrar)
- [x] Conferência posicional em `comparar/page.tsx` (+/`api/comparar` permanece genérico)
- [x] Unificar UI de quantidade/preços; DTOs tipados em `api/lotes`

## Parte E — Bugs
- [x] MED hooks (criar-jogo, ordem, Date.now em render)
- [x] LOW (any, prefer-const, entidades, scripts typecheck, .env.example)
- [x] HIGH admin (app_metadata em `admin.ts` + `is_admin()` SQL + `getUser` nas rotas de admin)
- [ ] Middleware server-side (reavaliar via docs do Next 16 / `proxy`) — pendente de decisão

## Parte F — Testes
- [x] `lottery-rules.test.ts`
- [x] `supersete.test.ts`
- [x] `conferencia.test.ts`

## Parte G — Evidência
- [x] `npm run lint` — 0 erros, 66 warnings (2026-10-09)
- [x] `npx tsc --noEmit` — limpo
- [x] `npm run build` — sucesso
- [x] `npm run test:run` — 45 passed
- [ ] Verificação de UI no navegador

## Bloqueios / decisões pendentes
- Reativar middleware (Next 16/proxy): pendencente de leitura dos docs.
- Analytics por coluna para Super Sete: adiado (frequência por coluna).
- Backfill de histórico antigo (preço/faixa mudam): tratamento não definido.