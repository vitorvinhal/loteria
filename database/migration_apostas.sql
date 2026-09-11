-- =====================================================
-- Tabela: apostas (apostas do usuário)
-- =====================================================
CREATE TABLE IF NOT EXISTS apostas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id TEXT NOT NULL,
  loteria_id TEXT NOT NULL REFERENCES loterias(id),
  dezenas INTEGER[] NOT NULL,
  valor_apostado NUMERIC(10,2) NOT NULL,
  resultado JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_apostas_usuario ON apostas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_apostas_loteria ON apostas(loteria_id);
CREATE INDEX IF NOT EXISTS idx_apostas_data ON apostas(criado_em);

-- RLS (Row Level Security)
ALTER TABLE apostas ENABLE ROW LEVEL SECURITY;

-- Policies para apostas
CREATE POLICY "Usuarios veem proprias apostas" ON apostas
  FOR SELECT USING (usuario_id = auth.uid()::text);

CREATE POLICY "Usuarios criam proprias apostas" ON apostas
  FOR INSERT WITH CHECK (usuario_id = auth.uid()::text);

CREATE POLICY "Usuarios atualizam proprias apostas" ON apostas
  FOR UPDATE USING (usuario_id = auth.uid()::text);

CREATE POLICY "Usuarios deletam proprias apostas" ON apostas
  FOR DELETE USING (usuario_id = auth.uid()::text);
