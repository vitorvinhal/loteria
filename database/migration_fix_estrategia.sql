-- Migration: Tornar estrategia_id nullable nas tabelas de jogos
-- Data: 2026-01-09

-- Tornar estrategia_id nullable em lotes_geracao
ALTER TABLE lotes_geracao ALTER COLUMN estrategia_id DROP NOT NULL;

-- Tornar estrategia_id nullable em jogos_gerados
ALTER TABLE jogos_gerados ALTER COLUMN estrategia_id DROP NOT NULL;

-- Inserir estratégias seed caso não existam
INSERT INTO estrategias (id, slug, nome, descricao_curta, descricao_completa, categoria, parametros_padrao, ativo)
VALUES
  ('est_quentes', 'quentes', 'Números Quentes', 'Números mais frequentes', 'Seleciona os números com maior frequência nos últimos concursos.', 'frequencia', '{"janela": 20}', true),
  ('est_frias', 'frias', 'Números Frios', 'Números mais atrasados', 'Seleciona os números que mais demoraram a sair.', 'atraso', '{"janela": 20}', true),
  ('est_par_impar', 'par_impar', 'Par/Ímpar Equilibrado', 'Equilíbrio entre pares e ímpares', 'Distribuição equilibrada entre números pares e ímpares.', 'combinacao', '{}', true),
  ('est_soma', 'soma', 'Soma Ideal', 'Soma dentro da faixa estatística', 'Seleciona números cuja soma total está dentro da faixa estatística ideal.', 'soma', '{}', true),
  ('est_quadrantes', 'quadrantes', 'Quadrantes', 'Distribuição por zona', 'Distribui os números uniformemente nas faixas do universo.', 'distribuicao', '{}', true),
  ('est_sequencias', 'delta', 'Sequências', 'Números consecutivos', 'Inclui pares de números consecutivos quando estatisticamente favorecido.', 'padrao', '{}', true),
  ('est_exclusao', 'exclusao_padroes', 'Exclusão de Padrões', 'Remove padrões fracos', 'Exclui combinações que violam padrões estatísticos.', 'exclusao', '{}', true),
  ('est_repeticao', 'repeticao_controlada', 'Repetição Controlada', 'Repetição entre concursos', 'Controla a repetição de números entre concursos consecutivos.', 'repeticao', '{}', true),
  ('est_fechamento', 'fechamento', 'Fechamento', 'Sistema de rolagem', 'Gera fechamento matemático para garantir cobertura mínima.', 'fechamento', '{"acertos_min": 5}', true),
  ('est_hibrida', 'hibrida_ia', 'Híbrida IA', 'Combinação inteligente', 'Combina todas as estratégias com pesos otimizados por IA.', 'hibrida', '{}', true),
  ('est_estatistica', 'estatistica', 'Estatística Ponderada', 'Métricas combinadas', 'Combinação ponderada de todas as métricas estatísticas.', 'estatistica', '{}', true),
  ('est_aleatorio', 'aleatorio', 'Aleatório', 'Seleção puramente aleatória', 'Seleção aleatória limpa sem influência estatística.', 'aleatorio', '{}', true)
ON CONFLICT (slug) DO NOTHING;
