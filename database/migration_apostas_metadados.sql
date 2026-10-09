-- Migração pendente (risco HIGH — requer aprovação humana antes de aplicar).
-- Guarda colunas (Super Sete múltipla) e extras (time/mês/trevo) das apostas.
-- Idempotente.
ALTER TABLE apostas ADD COLUMN IF NOT EXISTS metadados JSONB;

COMMENT ON COLUMN apostas.metadados
  IS 'Ex.: {"colunas": [[3,5],[..]], "time": [42], "mes": [7], "trevo": [2,5]}';
