-- =====================================================
-- Migration: Nome para jogos individuais
-- Permite nomear cada jogo gerado para aparecer na lista
-- de análise/comparação com data e dia da geração
-- =====================================================

ALTER TABLE jogos_gerados ADD COLUMN IF NOT EXISTS nome TEXT;

CREATE INDEX IF NOT EXISTS idx_jogos_nome ON jogos_gerados(nome);