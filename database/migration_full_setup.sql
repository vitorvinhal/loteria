-- =====================================================
-- MIGRATION COMPLETA - Rodar no Supabase SQL Editor
-- =====================================================

-- 1. Criar função exec_sql (se não existir)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RLS público para tabelas de referência
DO $$ BEGIN
  ALTER TABLE loterias ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE concursos ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE estrategias ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Policies de leitura pública
DO $$ BEGIN DROP POLICY IF EXISTS "Public read loterias" ON loterias; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Public read concursos" ON concursos; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Public read estrategias" ON estrategias; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Service insert loterias" ON loterias; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Service update loterias" ON loterias; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Service insert concursos" ON concursos; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Service update concursos" ON concursos; END $$;

CREATE POLICY "Public read loterias" ON loterias FOR SELECT USING (true);
CREATE POLICY "Public read concursos" ON concursos FOR SELECT USING (true);
CREATE POLICY "Public read estrategias" ON estrategias FOR SELECT USING (true);
CREATE POLICY "Service insert loterias" ON loterias FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update loterias" ON loterias FOR UPDATE USING (true);
CREATE POLICY "Service insert concursos" ON concursos FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update concursos" ON concursos FOR UPDATE USING (true);

-- 3. Tabela apostas (se não existir)
CREATE TABLE IF NOT EXISTS apostas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id TEXT NOT NULL,
  loteria_id TEXT NOT NULL,
  dezenas INTEGER[] NOT NULL,
  valor_apostado NUMERIC(10,2) NOT NULL,
  resultado JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_apostas_usuario ON apostas(usuario_id); END $$;
DO $$ BEGIN ALTER TABLE apostas ENABLE ROW LEVEL SECURITY; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Usuarios veem proprias apostas" ON apostas; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Usuarios criam proprias apostas" ON apostas; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Usuarios deletam proprias apostas" ON apostas; END $$;
CREATE POLICY "Usuarios veem proprias apostas" ON apostas FOR SELECT USING (usuario_id = auth.uid()::text);
CREATE POLICY "Usuarios criam proprias apostas" ON apostas FOR INSERT WITH CHECK (usuario_id = auth.uid()::text);
CREATE POLICY "Usuarios deletam proprias apostas" ON apostas FOR DELETE USING (usuario_id = auth.uid()::text);

-- 4. Tabela notificacoes (se não existir)
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info',
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  concurso_numero INTEGER,
  loteria_slug TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id); END $$;
DO $$ BEGIN ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Usuarios veem proprias notificacoes" ON notificacoes; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Usuarios criam proprias notificacoes" ON notificacoes; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Usuarios deletam proprias notificacoes" ON notificacoes; END $$;
CREATE POLICY "Usuarios veem proprias notificacoes" ON notificacoes FOR SELECT USING (usuario_id = auth.uid()::text);
CREATE POLICY "Usuarios criam proprias notificacoes" ON notificacoes FOR INSERT WITH CHECK (usuario_id = auth.uid()::text);
CREATE POLICY "Usuarios deletam proprias notificacoes" ON notificacoes FOR DELETE USING (usuario_id = auth.uid()::text);

-- 5. Seed loterias (INSERT idêntico ao schema.sql)
INSERT INTO loterias (id, slug, nome, universo_min, universo_max, qtd_dezenas_min, qtd_dezenas_max, qtd_dezenas_padrao, dias_sorteio, horario_sorteio, preco_aposta_base, regras_vitoria, ativo) VALUES
('lotofacil', 'lotofacil', 'Lotofácil', 1, 25, 15, 20, 15, '["domingo"]', '11:00', 3.00, '[{"acertos_min":11,"acertos_max":11,"descricao":"11 acertos"},{"acertos_min":12,"acertos_max":12,"descricao":"12 acertos"},{"acertos_min":13,"acertos_max":13,"descricao":"13 acertos"},{"acertos_min":14,"acertos_max":14,"descricao":"14 acertos"},{"acertos_min":15,"acertos_max":15,"descricao":"15 acertos - Prêmio máximo"}]', true),
('lotomania', 'lotomania', 'Lotomania', 0, 99, 50, 50, 50, '["terca","sexta"]', '20:00', 3.50, '[{"acertos_min":0,"acertos_max":0,"descricao":"0 acertos"},{"acertos_min":15,"acertos_max":15,"descricao":"15 acertos"},{"acertos_min":16,"acertos_max":16,"descricao":"16 acertos"},{"acertos_min":17,"acertos_max":17,"descricao":"17 acertos"},{"acertos_min":18,"acertos_max":18,"descricao":"18 acertos"},{"acertos_min":19,"acertos_max":19,"descricao":"19 acertos"},{"acertos_min":20,"acertos_max":20,"descricao":"20 acertos - Prêmio máximo"}]', true),
('megasena', 'megasena', 'Mega-Sena', 1, 60, 6, 15, 6, '["domingo"]', '11:00', 5.00, '[{"acertos_min":4,"acertos_max":4,"descricao":"Quadra"},{"acertos_min":5,"acertos_max":5,"descricao":"Quina"},{"acertos_min":6,"acertos_max":6,"descricao":"Sena - Prêmio máximo"}]', true),
('quina', 'quina', 'Quina', 1, 80, 5, 15, 5, '["domingo"]', '11:00', 2.50, '[{"acertos_min":2,"acertos_max":2,"descricao":"2 acertos"},{"acertos_min":3,"acertos_max":3,"descricao":"3 acertos"},{"acertos_min":4,"acertos_max":4,"descricao":"4 acertos"},{"acertos_min":5,"acertos_max":5,"descricao":"5 acertos - Prêmio máximo"}]', true),
('duplasena', 'duplasena', 'Dupla Sena', 1, 50, 6, 15, 6, '["terca","quinta","sabado"]', '20:00', 2.50, '[{"acertos_min":3,"acertos_max":6,"descricao":"3 a 6 acertos no 1º sorteio"},{"acertos_min":3,"acertos_max":6,"descricao":"3 a 6 acertos no 2º sorteio"}]', true),
('timemania', 'timemania', 'Timemania', 1, 80, 10, 10, 10, '["domingo"]', '11:00', 4.50, '[{"acertos_min":3,"acertos_max":3,"descricao":"3 acertos"},{"acertos_min":4,"acertos_max":4,"descricao":"4 acertos"},{"acertos_min":5,"acertos_max":5,"descricao":"5 acertos"},{"acertos_min":6,"acertos_max":6,"descricao":"6 acertos"},{"acertos_min":7,"acertos_max":7,"descricao":"7 acertos - Time do Coração"}]', true),
('diadesorte', 'diadesorte', 'Dia de Sorte', 1, 31, 7, 15, 7, '["domingo"]', '11:00', 3.50, '[{"acertos_min":4,"acertos_max":4,"descricao":"4 acertos + Mês da Sorte"},{"acertos_min":5,"acertos_max":5,"descricao":"5 acertos + Mês da Sorte"},{"acertos_min":6,"acertos_max":6,"descricao":"6 acertos + Mês da Sorte"},{"acertos_min":7,"acertos_max":7,"descricao":"7 acertos + Mês da Sorte"}]', true),
('maismilionaria', 'maismilionaria', '+Milionária', 1, 50, 6, 6, 6, '["domingo"]', '11:00', 6.00, '[{"acertos_min":6,"acertos_max":6,"descricao":"6 acertos + 2 Trevos"},{"acertos_min":6,"acertos_max":6,"descricao":"6 acertos + 1 Trevo"},{"acertos_min":6,"acertos_max":6,"descricao":"6 acertos + 0 Trevos"}]', true),
('supersete', 'supersete', 'Super Sete', 0, 9, 7, 7, 7, '["sexta"]', '20:00', 2.50, '[{"acertos_min":3,"acertos_max":3,"descricao":"3 colunas certas"},{"acertos_min":4,"acertos_max":4,"descricao":"4 colunas certas"},{"acertos_min":5,"acertos_max":5,"descricao":"5 colunas certas"},{"acertos_min":6,"acertos_max":6,"descricao":"6 colunas certas"},{"acertos_min":7,"acertos_max":7,"descricao":"7 colunas certas - Super Sete"}]', true)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  universo_min = EXCLUDED.universo_min,
  universo_max = EXCLUDED.universo_max,
  qtd_dezenas_min = EXCLUDED.qtd_dezenas_min,
  qtd_dezenas_max = EXCLUDED.qtd_dezenas_max,
  qtd_dezenas_padrao = EXCLUDED.qtd_dezenas_padrao,
  preco_aposta_base = EXCLUDED.preco_aposta_base,
  ativo = EXCLUDED.ativo;

-- 6. Seed estratégias (INSERT idêntico ao schema.sql)
INSERT INTO estrategias (id, slug, nome, descricao_curta, descricao_completa, categoria, parametros_padrao, ativo) VALUES
('quentes', 'quentes', 'Dezenas Quentes', 'Prioriza dezenas mais sorteadas recentemente.', 'Seleciona as dezenas que apareceram com maior frequência nas últimas N concursos.', 'frequencia', '{"janela":25,"peso":1.0}', true),
('frias', 'frias', 'Dezenas Frias / Atraso', 'Prioriza dezenas que não saem há mais tempo.', 'Prioriza dezenas que estão há mais concursos sem serem sorteadas.', 'atraso', '{"peso":1.0}', true),
('par_impar', 'par_impar', 'Equilíbrio Par/Ímpar', 'Busca a proporção pares/ímpares historicamente mais comum.', 'Gera combinações que respeitam a distribuição par/ímpar mais frequente.', 'equilibrio', '{"tolerancia":1}', true),
('soma', 'soma', 'Faixa de Soma', 'Filtra combinações cuja soma cai na faixa mais frequente.', 'Gera combinações cuja soma total está dentro da faixa estatisticamente mais frequente.', 'soma', '{"margem":0.1}', true),
('quadrantes', 'quadrantes', 'Distribuição por Quadrantes', 'Distribui dezenas equilibradamente pelo volante.', 'Divide o volante em quadrantes e garante pelo menos uma dezena de cada região.', 'distribuicao', '{"min_por_quadrante":1}', true),
('delta', 'delta', 'Delta System', 'Controla diferenças entre dezenas consecutivas.', 'Controla a diferença entre dezenas consecutivas da combinação ordenada.', 'sistema', '{"delta_min":1,"delta_max":15}', true),
('exclusao_padroes', 'exclusao_padroes', 'Exclusão de Padrões Óbvios', 'Evita sequências, múltiplos e padrões visuais populares.', 'Exclui combinações que seguem padrões visuais populares.', 'exclusao', '{"max_sequencia":2,"evitar_multiplos":true}', true),
('repeticao_controlada', 'repeticao_controlada', 'Repetição Controlada', 'Define quantas dezenas do último sorteio devem se repetir.', 'Analisa a frequência histórica de repetição entre concursos consecutivos.', 'repeticao', '{"media_repeticao":1}', true),
('fechamento', 'fechamento', 'Fechamento Combinatório', 'Garante cobertura mínima de acertos para um subconjunto.', 'Gera um conjunto de jogos que garante cobertura mínima.', 'fechamento', '{"dezenas_escolhidas":[],"acertos_garantidos":3}', true),
('hibrida_ia', 'hibrida_ia', 'Híbrida com IA', 'Combina estatísticas e usa IA para ponderar critérios.', 'Combina múltiplos indicadores e utiliza IA para ponderar os critérios.', 'hibrida', '{"modelo":"claude-sonnet-4-6","temperatura":0.7}', true),
('estatistica', 'estatistica', 'Estatística Ponderada', 'Métricas combinadas.', 'Combinação ponderada de todas as métricas estatísticas.', 'estatistica', '{}', true),
('aleatorio', 'aleatorio', 'Aleatório', 'Seleção aleatória limpa.', 'Seleção aleatória limpa sem influência estatística.', 'aleatorio', '{}', true)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao_curta = EXCLUDED.descricao_curta,
  ativo = EXCLUDED.ativo;

-- 7. Coluna loteria_slug em concursos (para o batch sync sem FK)
DO $$ BEGIN
  ALTER TABLE concursos ADD COLUMN IF NOT EXISTS loteria_slug TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
