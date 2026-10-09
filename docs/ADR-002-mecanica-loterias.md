# ADR-002 — Mecânica de loterias: conjunto vs posicional + componentes extras

- **Status:** aceito
- **Data:** 2026-10-09
- **Risco:** HIGH (schema/SQL)

## Contexto

O motor de geração tratava todas as modalidades como listas genéricas de
inteiros. Isso ignora:

- **Super Sete**: 7 colunas independentes (0–9), conferência **posicional**;
  `Set`/`.sort()` destrói a posição e proíbe repetição entre colunas.
- **+Milionária**: 6 dezenas + 2 trevos (1–6); 10 faixas.
- **Timemania**: + Time do Coração; **Dia de Sorte**: + Mês da Sorte.
- **Dupla Sena**: dois sorteios por concurso.

A pesquisa oficial (loterias.caixa.gov.br) também revelou divergências de preço,
faixa de dezenas e dias de sorteio — ver `docs/SPEC-regras-loterias.md`.

## Decisão

1. Introduzir `mecanica: 'conjunto' | 'posicional'` no tipo `Loteria`.
2. Representar Super Sete como array de 7 posições (`number[7]`) onde o índice é
   a coluna. O `INTEGER[]` do Postgres preserva ordem e duplica valores — sem
   coluna nova obrigatória.
3. Modelar componentes extras em `componentes_extras` (JSONB): tipo, universo e
   quantidade. Persistir em `metadados JSONB` em `jogos_gerados`/`concursos`.
4. Centralizar a lógica num contrato único (`src/modules/lottery`) com
   `gerar / validar / conferir / custo`.
5. Corrigir seeds da tabela `loterias` (preço, faixas, dias, extras) via
   **migração incremental** — nunca reescrever `schema.sql` já aplicado.

## Trade-offs

- Duas representações (conjunto e posicional) aumentam a complexidade do motor,
  mas eliminam lógica condicional espalhada pela UI/API.
- Manter `dezenas INTEGER[]` evita migração destrutiva, ao custo de a semântica
  posicional ser implícita (índice = coluna), documentada na SPEC.

## Consequências

- `src/types/index.ts`, `src/lib/loterias.ts`, `src/modules/lottery/*`.
- `src/app/api/gerar`, `comparar`, `estatisticas`, `analisar`.
- `src/modules/scoring` e `analytics`.
- `database/migration_regras_loterias.sql`.
