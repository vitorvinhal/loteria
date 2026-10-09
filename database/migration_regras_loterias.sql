-- =====================================================
-- Migration: Regras de geração por modalidade
-- Adiciona mecânica (conjunto/posicional), componentes
-- extras, configuração de colunas e metadados; corrige
-- preços, faixas de dezenas e dias de sorteio conforme
-- as regras oficiais da CAIXA (consultadas em 2026-10-09).
-- =====================================================

-- 1. Novas colunas em loterias
ALTER TABLE public.loterias
  ADD COLUMN IF NOT EXISTS mecanica TEXT NOT NULL DEFAULT 'conjunto',
  ADD COLUMN IF NOT EXISTS qtd_sorteada INTEGER,
  ADD COLUMN IF NOT EXISTS componentes_extras JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS colunas JSONB;

-- 2. Metadados (extras/posições) em jogos e concursos
ALTER TABLE public.jogos_gerados
  ADD COLUMN IF NOT EXISTS metadados JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.concursos
  ADD COLUMN IF NOT EXISTS metadados JSONB NOT NULL DEFAULT '{}';

-- 3. Loterias de conjunto com correções oficiais
UPDATE public.loterias SET
  preco_aposta_base = 3.50,
  qtd_dezenas_min = 15, qtd_dezenas_max = 20, qtd_dezenas_padrao = 15,
  qtd_sorteada = 15, mecanica = 'conjunto',
  dias_sorteio = '["segunda","terca","quarta","quinta","sexta","sabado"]'::jsonb,
  horario_sorteio = '20:00',
  componentes_extras = '[]'::jsonb, colunas = NULL
WHERE slug = 'lotofacil';

UPDATE public.loterias SET
  preco_aposta_base = 3.00,
  qtd_dezenas_min = 50, qtd_dezenas_max = 50, qtd_dezenas_padrao = 50,
  qtd_sorteada = 20, mecanica = 'conjunto',
  dias_sorteio = '["segunda","quarta","sexta"]'::jsonb,
  horario_sorteio = '20:00',
  componentes_extras = '[]'::jsonb, colunas = NULL
WHERE slug = 'lotomania';

UPDATE public.loterias SET
  preco_aposta_base = 6.00,
  qtd_dezenas_min = 6, qtd_dezenas_max = 20, qtd_dezenas_padrao = 6,
  qtd_sorteada = 6, mecanica = 'conjunto',
  dias_sorteio = '["terca","quinta","domingo"]'::jsonb,
  horario_sorteio = '20:00',
  componentes_extras = '[]'::jsonb, colunas = NULL
WHERE slug = 'megasena';

UPDATE public.loterias SET
  preco_aposta_base = 3.00,
  qtd_dezenas_min = 5, qtd_dezenas_max = 15, qtd_dezenas_padrao = 5,
  qtd_sorteada = 5, mecanica = 'conjunto',
  dias_sorteio = '["segunda","terca","quarta","quinta","sexta","domingo"]'::jsonb,
  horario_sorteio = '20:00',
  componentes_extras = '[]'::jsonb, colunas = NULL
WHERE slug = 'quina';

UPDATE public.loterias SET
  preco_aposta_base = 3.00,
  qtd_dezenas_min = 6, qtd_dezenas_max = 15, qtd_dezenas_padrao = 6,
  qtd_sorteada = 6, mecanica = 'conjunto',
  dias_sorteio = '["segunda","quarta","sexta"]'::jsonb,
  horario_sorteio = '20:00',
  componentes_extras = '[]'::jsonb, colunas = NULL
WHERE slug = 'duplasena';

UPDATE public.loterias SET
  preco_aposta_base = 3.50,
  qtd_dezenas_min = 10, qtd_dezenas_max = 10, qtd_dezenas_padrao = 10,
  qtd_sorteada = 7, mecanica = 'conjunto',
  dias_sorteio = '["terca","quinta","domingo"]'::jsonb,
  horario_sorteio = '20:00',
  componentes_extras = '[{"tipo":"time","nome":"Time do Coração","universo_min":1,"universo_max":80,"qtd_min":1,"qtd_max":1,"obrigatorio":true}]'::jsonb,
  colunas = NULL
WHERE slug = 'timemania';

UPDATE public.loterias SET
  preco_aposta_base = 2.50,
  qtd_dezenas_min = 7, qtd_dezenas_max = 15, qtd_dezenas_padrao = 7,
  qtd_sorteada = 7, mecanica = 'conjunto',
  dias_sorteio = '["segunda","terca","quarta","quinta","sexta","domingo"]'::jsonb,
  horario_sorteio = '20:00',
  componentes_extras = '[{"tipo":"mes","nome":"Mês da Sorte","universo_min":1,"universo_max":12,"qtd_min":1,"qtd_max":1,"obrigatorio":true}]'::jsonb,
  colunas = NULL
WHERE slug = 'diadesorte';

UPDATE public.loterias SET
  preco_aposta_base = 6.00,
  qtd_dezenas_min = 6, qtd_dezenas_max = 12, qtd_dezenas_padrao = 6,
  qtd_sorteada = 6, mecanica = 'conjunto',
  dias_sorteio = '["quarta","domingo"]'::jsonb,
  horario_sorteio = '20:00',
  componentes_extras = '[{"tipo":"trevo","nome":"Trevos","universo_min":1,"universo_max":6,"qtd_min":2,"qtd_max":6,"obrigatorio":true}]'::jsonb,
  colunas = NULL
WHERE slug = 'maismilionaria';

-- 4. Super Sete: posicional
UPDATE public.loterias SET
  preco_aposta_base = 3.00,
  qtd_dezenas_min = 7, qtd_dezenas_max = 21, qtd_dezenas_padrao = 7,
  qtd_sorteada = 7, mecanica = 'posicional',
  dias_sorteio = '["segunda","quarta","sexta"]'::jsonb,
  horario_sorteio = '21:00',
  componentes_extras = '[]'::jsonb,
  colunas = '{"total_colunas":7,"universo_min":0,"universo_max":9,"min_total":7,"max_total":21,"faixas_por_coluna":[{"total_min":7,"total_max":7,"min_coluna":1,"max_coluna":1},{"total_min":8,"total_max":14,"min_coluna":1,"max_coluna":2},{"total_min":15,"total_max":21,"min_coluna":2,"max_coluna":3}]}'::jsonb
WHERE slug = 'supersete';
