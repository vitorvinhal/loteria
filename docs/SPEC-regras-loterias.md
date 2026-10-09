# SPEC — Regras de geração e conferência por modalidade

- **Fonte oficial:** loterias.caixa.gov.br (páginas de cada modalidade), consultado em 2026-10-09.
- **Contrato de código:** `src/modules/lottery/index.ts` (`RegraLoteria`).
- **Config única:** `src/lib/loterias.ts` (fonte de verdade no app).

## Convenções

- `C(n,k)` = combinação simples.
- Custo = `C(qtd_dezenas, dezenas_sorteadas) × preco_base`, salvo regra própria
  (Super Sete e +Milionária).
- "Conferência por faixa" = maior faixa de prêmio atingida.

## Tabela mestre

| slug | mecânica | universo | aposta | sorteio | prêmio | preço base | dias |
|---|---|---|---|---|---|---|---|
| lotofacil | conjunto | 1–25 | 15–20 | 15 | 11–15 | 3.50 | seg–sáb (dom 11h no sistema) |
| megasena | conjunto | 1–60 | 6–20 | 6 | 4–6 | 6.00 | ter, qui, dom |
| quina | conjunto | 1–80 | 5–15 | 5 | 2–5 | 3.00 | seg–sex, dom |
| lotomania | conjunto | 0–99 | 50 | 20 | 0, 15–20 | 3.00 | seg, qua, sex |
| duplasena | conjunto | 1–50 | 6–15 | 6 ×2 | 3–6 (cada sorteio) | 3.00 | seg, qua, sex |
| timemania | conjunto+extra | 1–80 | 10 + 1 time | 7 + time | 3–7 + time | 3.50 | ter, qui, dom |
| diadesorte | conjunto+extra | 1–31 | 7–15 + 1 mês | 7 + mês | 4–7 + mês | 2.50 | seg–sex, dom |
| maismilionaria | conjunto+extras | 1–50 | 6–12 + 2–6 trevos | 6 + 2 trevos | 10 faixas | 6.00 | qua, dom |
| supersete | **posicional** | 0–9 por coluna | total 7–21, 1–3/coluna | 7 (1/coluna) | 3–7 colunas | 3.00 | seg, qua, sex |

## Regras detalhadas

### Super Sete (posicional)
- 7 colunas; cada coluna aceita 0–9.
- Aposta simples: exatamente 1 número por coluna (7 no total).
- Múltipla: total entre 8 e 14 → **1 a 2 por coluna**; total entre 15 e 21 →
  **2 a 3 por coluna**.
- Custo = `(∏ números_por_coluna) × 3.00`.
- Conferência posicional: coluna certa quando `aposta[i] === sorteio[i]`.
- Faixas: 7, 6, 5, 4, 3 colunas (3 = prêmio fixo).

### Lotofácil
- 15–20 únicos de 1–25; sorteio de 15; faixas 11–15 (fixas 11/12/13).
- Custo: 15→3.50, 16→56.00, 17→476.00, 18→2856.00, 19→13566.00, 20→54264.00.

### Mega-Sena
- 6–20 únicos de 1–60; sorteio de 6; faixas 4/5/6.
- Custo = `C(n,6) × 6.00`.

### Quina
- 5–15 únicos de 1–80; sorteio de 5; faixas 2/3/4/5.
- Custo = `C(n,5) × 3.00`.

### Lotomania
- Exatamente 50 únicos de 0–99; sorteio de 20; faixas 0 e 15–20.
- Custo fixo 3.00. Aposta-Espelho = complemento (50 restantes).

### Dupla Sena
- 6–15 únicos de 1–50; **dois** sorteios de 6; faixas 3–6 em cada.
- Custo = `C(n,6) × 3.00`.

### Timemania
- 10 únicos de 1–80 **+ 1 Time do Coração** (80 clubes); sorteio de 7 + time.
- Faixas 3–7 e Time do Coração. Custo fixo 3.50.

### Dia de Sorte
- 7–15 únicos de 1–31 **+ 1 Mês da Sorte** (12); sorteio de 7 + mês.
- Faixas 4–7 e Mês (cumulativo). Custo = `C(n,7) × 2.50`.

### +Milionária
- 6–12 dezenas únicas de 1–50 **+ 2–6 trevos** de 1–6.
- Sorteio de 6 dezenas + 2 trevos. 10 faixas.
- Custo = `C(nz,6) × C(nt,2) × 6.00`.

## Critérios de aceite

1. Cada gerador produz jogos válidos segundo a tabela acima.
2. Super Sete nunca é tratada como conjunto; ordem/posição preservada no banco.
3. Conferência retorna a faixa correta por modalidade, incluindo extras.
4. Preços calculados correspondem à tabela oficial.
5. Loterias de conjunto mantêm comportamento/estratégias atuais.
6. `npm run test:run` verde com os testes de `tests/unit/lottery-rules.test.ts`,
   `tests/unit/supersete.test.ts` e `tests/unit/conferencia.test.ts`.
