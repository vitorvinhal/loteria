-- =====================================================
-- Schema do Banco de Dados - Sistema Loterias CAIXA
-- Versão: 1.0.0
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Tabela: loterias (configuração parametrizada)
-- =====================================================
CREATE TABLE loterias (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  universo_min INTEGER NOT NULL,
  universo_max INTEGER NOT NULL,
  qtd_dezenas_min INTEGER NOT NULL,
  qtd_dezenas_max INTEGER NOT NULL,
  qtd_dezenas_padrao INTEGER NOT NULL,
  dias_sorteio JSONB NOT NULL DEFAULT '[]',
  horario_sorteio TEXT NOT NULL,
  preco_aposta_base NUMERIC(10,2) NOT NULL,
  regras_vitoria JSONB NOT NULL DEFAULT '[]',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Tabela: concursos (resultados dos sorteios)
-- =====================================================
CREATE TABLE concursos (
  id TEXT PRIMARY KEY,
  loteria_id TEXT NOT NULL REFERENCES loterias(id),
  numero_concurso INTEGER NOT NULL,
  data_sorteio TEXT NOT NULL,
  dezenas_sorteadas INTEGER[] NOT NULL,
  acumulou BOOLEAN NOT NULL DEFAULT false,
  valor_acumulado NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_estimado_proximo NUMERIC(15,2) NOT NULL DEFAULT 0,
  data_proximo_concurso TEXT NOT NULL DEFAULT '',
  local_sorteio TEXT NOT NULL DEFAULT '',
  premiacoes JSONB NOT NULL DEFAULT '[]',
  raw_response JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(loteria_id, numero_concurso)
);

-- =====================================================
-- Tabela: estrategias (biblioteca de estratégias)
-- =====================================================
CREATE TABLE estrategias (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao_curta TEXT NOT NULL,
  descricao_completa TEXT NOT NULL,
  categoria TEXT NOT NULL,
  parametros_padrao JSONB NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Tabela: lotes_geracao (lotes de geração de jogos)
-- =====================================================
CREATE TABLE lotes_geracao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id TEXT,
  loteria_id TEXT NOT NULL REFERENCES loterias(id),
  estrategia_id TEXT NOT NULL REFERENCES estrategias(id),
  score_minimo INTEGER NOT NULL DEFAULT 0,
  quantidade_solicitada INTEGER NOT NULL,
  quantidade_gerada INTEGER NOT NULL DEFAULT 0,
  tempo_execucao_ms INTEGER NOT NULL DEFAULT 0,
  score_relaxado BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Tabela: jogos_gerados (jogos individuais)
-- =====================================================
CREATE TABLE jogos_gerados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lote_id UUID REFERENCES lotes_geracao(id),
  usuario_id TEXT,
  loteria_id TEXT NOT NULL REFERENCES loterias(id),
  dezenas INTEGER[] NOT NULL,
  estrategia_id TEXT NOT NULL REFERENCES estrategias(id),
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  score_breakdown JSONB NOT NULL DEFAULT '{}',
  origem TEXT NOT NULL CHECK (origem IN ('algoritmo', 'manual', 'ia_hibrida')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Tabela: comparacoes (comparação com concursos)
-- =====================================================
CREATE TABLE comparacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jogo_id UUID NOT NULL REFERENCES jogos_gerados(id),
  concurso_id TEXT NOT NULL REFERENCES concursos(id),
  qtd_acertos INTEGER NOT NULL DEFAULT 0,
  percentual_acerto NUMERIC(5,2) NOT NULL DEFAULT 0,
  ja_foi_sorteado_identico BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Tabela: boloes (simulação de bolões)
-- =====================================================
CREATE TABLE boloes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id TEXT,
  loteria_id TEXT NOT NULL REFERENCES loterias(id),
  quantidade_cotas INTEGER NOT NULL DEFAULT 1,
  custo_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  jogos_incluidos UUID[] NOT NULL DEFAULT '{}',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Tabela: feature_flags (controle de features)
-- =====================================================
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT UNIQUE NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT false,
  descricao TEXT,
  criterio JSONB NOT NULL DEFAULT '{}',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Tabela: changelog (histórico de versões)
-- =====================================================
CREATE TABLE changelog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  versao TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('feature', 'fix', 'improvement', 'breaking')),
  data_lancamento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Índices para performance
-- =====================================================
CREATE INDEX idx_concursos_loteria ON concursos(loteria_id);
CREATE INDEX idx_concursos_numero ON concursos(loteria_id, numero_concurso);
CREATE INDEX idx_concursos_data ON concursos(data_sorteio);
CREATE INDEX idx_jogos_loteria ON jogos_gerados(loteria_id);
CREATE INDEX idx_jogos_usuario ON jogos_gerados(usuario_id);
CREATE INDEX idx_jogos_lote ON jogos_gerados(lote_id);
CREATE INDEX idx_jogos_score ON jogos_gerados(score);
CREATE INDEX idx_lotes_usuario ON lotes_geracao(usuario_id);
CREATE INDEX idx_comparacoes_jogo ON comparacoes(jogo_id);
CREATE INDEX idx_comparacoes_concurso ON comparacoes(concurso_id);
CREATE INDEX idx_boloes_usuario ON boloes(usuario_id);
CREATE INDEX idx_changelog_versao ON changelog(versao);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE lotes_geracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE jogos_gerados ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE boloes ENABLE ROW LEVEL SECURITY;

-- Policies para lotes_geracao
CREATE POLICY "Usuarios veem proprios lotes" ON lotes_geracao
  FOR SELECT USING (usuario_id = auth.uid()::text);

CREATE POLICY "Usuarios criam proprios lotes" ON lotes_geracao
  FOR INSERT WITH CHECK (usuario_id = auth.uid()::text);

-- Policies para jogos_gerados
CREATE POLICY "Usuarios veem proprios jogos" ON jogos_gerados
  FOR SELECT USING (usuario_id = auth.uid()::text OR usuario_id IS NULL);

CREATE POLICY "Usuarios criam proprios jogos" ON jogos_gerados
  FOR INSERT WITH CHECK (usuario_id = auth.uid()::text OR usuario_id IS NULL);

-- Policies para comparacoes
CREATE POLICY "Usuarios veem proprias comparacoes" ON comparacoes
  FOR SELECT USING (
    jogo_id IN (
      SELECT id FROM jogos_gerados WHERE usuario_id = auth.uid()::text
    )
  );

-- Policies para boloes
CREATE POLICY "Usuarios veem proprios boloes" ON boloes
  FOR SELECT USING (usuario_id = auth.uid()::text);

CREATE POLICY "Usuarios criam proprios boloes" ON boloes
  FOR INSERT WITH CHECK (usuario_id = auth.uid()::text);

-- =====================================================
-- Dados iniciais: Loterias
-- =====================================================
INSERT INTO loterias (id, slug, nome, universo_min, universo_max, qtd_dezenas_min, qtd_dezenas_max, qtd_dezenas_padrao, dias_sorteio, horario_sorteio, preco_aposta_base, regras_vitoria, ativo) VALUES
('lotofacil', 'lotofacil', 'Lotofácil', 1, 25, 15, 20, 15, '["domingo"]', '11:00', 2.50, '[{"acertos_min":11,"acertos_max":11,"descricao":"11 acertos"},{"acertos_min":12,"acertos_max":12,"descricao":"12 acertos"},{"acertos_min":13,"acertos_max":13,"descricao":"13 acertos"},{"acertos_min":14,"acertos_max":14,"descricao":"14 acertos"},{"acertos_min":15,"acertos_max":15,"descricao":"15 acertos - Prêmio máximo"}]', true),
('lotomania', 'lotomania', 'Lotomania', 0, 99, 50, 50, 50, '["terca","sexta"]', '20:00', 2.50, '[{"acertos_min":0,"acertos_max":0,"descricao":"0 acertos"},{"acertos_min":15,"acertos_max":15,"descricao":"15 acertos"},{"acertos_min":16,"acertos_max":16,"descricao":"16 acertos"},{"acertos_min":17,"acertos_max":17,"descricao":"17 acertos"},{"acertos_min":18,"acertos_max":18,"descricao":"18 acertos"},{"acertos_min":19,"acertos_max":19,"descricao":"19 acertos"},{"acertos_min":20,"acertos_max":20,"descricao":"20 acertos - Prêmio máximo"}]', true),
('megasena', 'megasena', 'Mega-Sena', 1, 60, 6, 15, 6, '["domingo"]', '11:00', 5.00, '[{"acertos_min":4,"acertos_max":4,"descricao":"Quadra"},{"acertos_min":5,"acertos_max":5,"descricao":"Quina"},{"acertos_min":6,"acertos_max":6,"descricao":"Sena - Prêmio máximo"}]', true),
('quina', 'quina', 'Quina', 1, 80, 5, 15, 5, '["domingo"]', '11:00', 2.00, '[{"acertos_min":2,"acertos_max":2,"descricao":"2 acertos"},{"acertos_min":3,"acertos_max":3,"descricao":"3 acertos"},{"acertos_min":4,"acertos_max":4,"descricao":"4 acertos"},{"acertos_min":5,"acertos_max":5,"descricao":"5 acertos - Prêmio máximo"}]', true),
('duplasena', 'duplasena', 'Dupla Sena', 1, 50, 6, 15, 6, '["terca","quinta","sabado"]', '20:00', 2.50, '[{"acertos_min":3,"acertos_max":6,"descricao":"3 a 6 acertos no 1º sorteio"},{"acertos_min":3,"acertos_max":6,"descricao":"3 a 6 acertos no 2º sorteio"}]', true),
('timemania', 'timemania', 'Timemania', 1, 80, 10, 10, 10, '["domingo"]', '11:00', 2.00, '[{"acertos_min":3,"acertos_max":3,"descricao":"3 acertos"},{"acertos_min":4,"acertos_max":4,"descricao":"4 acertos"},{"acertos_min":5,"acertos_max":5,"descricao":"5 acertos"},{"acertos_min":6,"acertos_max":6,"descricao":"6 acertos"},{"acertos_min":7,"acertos_max":7,"descricao":"7 acertos - Time do Coração"}]', true),
('diadesorte', 'diadesorte', 'Dia de Sorte', 1, 31, 7, 15, 7, '["domingo"]', '11:00', 2.00, '[{"acertos_min":4,"acertos_max":4,"descricao":"4 acertos + Mês da Sorte"},{"acertos_min":5,"acertos_max":5,"descricao":"5 acertos + Mês da Sorte"},{"acertos_min":6,"acertos_max":6,"descricao":"6 acertos + Mês da Sorte"},{"acertos_min":7,"acertos_max":7,"descricao":"7 acertos + Mês da Sorte"}]', true),
('maismilionaria', 'maismilionaria', '+Milionária', 1, 50, 6, 6, 6, '["domingo"]', '11:00', 5.00, '[{"acertos_min":6,"acertos_max":6,"descricao":"6 acertos + 2 Trevos"},{"acertos_min":6,"acertos_max":6,"descricao":"6 acertos + 1 Trevo"},{"acertos_min":6,"acertos_max":6,"descricao":"6 acertos + 0 Trevos"}]', true),
('supersete', 'supersete', 'Super Sete', 0, 9, 7, 7, 7, '["sexta"]', '20:00', 2.00, '[{"acertos_min":3,"acertos_max":3,"descricao":"3 colunas certas"},{"acertos_min":4,"acertos_max":4,"descricao":"4 colunas certas"},{"acertos_min":5,"acertos_max":5,"descricao":"5 colunas certas"},{"acertos_min":6,"acertos_max":6,"descricao":"6 colunas certas"},{"acertos_min":7,"acertos_max":7,"descricao":"7 colunas certas - Super Sete"}]', true);

-- =====================================================
-- Dados iniciais: Estratégias
-- =====================================================
INSERT INTO estrategias (id, slug, nome, descricao_curta, descricao_completa, categoria, parametros_padrao, ativo) VALUES
('quentes', 'quentes', 'Dezenas Quentes', 'Prioriza dezenas mais sorteadas recentemente.', 'Esta estratégia seleciona as dezenas que apareceram com maior frequência nas últimas N concursos.', 'frequencia', '{"janela":25,"peso":1.0}', true),
('frias', 'frias', 'Dezenas Frias / Atraso', 'Prioriza dezenas que não saem há mais tempo.', 'Esta estratégia prioriza dezenas que estão há mais concursos sem serem sorteadas.', 'atraso', '{"peso":1.0}', true),
('par_impar', 'par_impar', 'Equilíbrio Par/Ímpar', 'Busca a proporção pares/ímpares historicamente mais comum.', 'Esta estratégia gera combinações que respeitam a distribuição par/ímpar mais frequente.', 'equilibrio', '{"tolerancia":1}', true),
('soma', 'soma', 'Faixa de Soma', 'Filtra combinações cuja soma cai na faixa mais frequente.', 'Esta estratégia gera combinações cuja soma total está dentro da faixa estatisticamente mais frequente.', 'soma', '{"margem":0.1}', true),
('quadrantes', 'quadrantes', 'Distribuição por Quadrantes', 'Distribui dezenas equilibradamente pelo volante.', 'Esta estratégia divide o volante em quadrantes e garante pelo menos uma dezena de cada região.', 'distribuicao', '{"min_por_quadrante":1}', true),
('delta', 'delta', 'Delta System', 'Controla diferenças entre dezenas consecutivas.', 'O sistema Delta controla a diferença entre dezenas consecutivas da combinação ordenada.', 'sistema', '{"delta_min":1,"delta_max":15}', true),
('exclusao_padroes', 'exclusao_padroes', 'Exclusão de Padrões Óbvios', 'Evita sequências, múltiplos e padrões visuais populares.', 'Esta estratégia exclui combinações que seguem padrões visuais populares.', 'exclusao', '{"max_sequencia":2,"evitar_multiplos":true}', true),
('repeticao_controlada', 'repeticao_controlada', 'Repetição Controlada', 'Define quantas dezenas do último sorteio devem se repetir.', 'Esta estratégia analisa a frequência histórica de repetição entre concursos consecutivos.', 'repeticao', '{"media_repeticao":1}', true),
('fechamento', 'fechamento', 'Fechamento Combinatório', 'Garante cobertura mínima de acertos para um subconjunto.', 'O fechamento combinatório gera um conjunto de jogos que garante cobertura mínima.', 'fechamento', '{"dezenas_escolhidas":[],"acertos_garantidos":3}', true),
('hibrida_ia', 'hibrida_ia', 'Híbrida com IA', 'Combina estatísticas e usa IA para ponderar critérios.', 'Esta estratégia combina múltiplos indicadores e utiliza IA para ponderar os critérios.', 'hibrida', '{"modelo":"claude-sonnet-4-6","temperatura":0.7}', true);

-- =====================================================
-- Dados iniciais: Feature Flags
-- =====================================================
INSERT INTO feature_flags (nome, ativa, descricao) VALUES
('ia_hibrida', false, 'Ativa a geração de jogos via IA (requer API key da Anthropic)'),
('bolao_avancado', false, 'Ativa simulação avançada de bolões com fechamento combinatório'),
('sync_automatico', true, 'Ativa sincronização automática de resultados após cada sorteio');
