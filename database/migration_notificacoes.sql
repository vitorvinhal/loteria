-- =====================================================
-- Tabela: notificacoes (notificações do usuário)
-- =====================================================
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  dados JSONB DEFAULT '{}',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(usuario_id, lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_data ON notificacoes(criado_em);

-- RLS (Row Level Security)
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Policies para notificações
CREATE POLICY "Usuarios veem proprias notificacoes" ON notificacoes
  FOR SELECT USING (usuario_id = auth.uid()::text);

CREATE POLICY "Usuarios criam proprias notificacoes" ON notificacoes
  FOR INSERT WITH CHECK (usuario_id = auth.uid()::text);

CREATE POLICY "Usuarios atualizam proprias notificacoes" ON notificacoes
  FOR UPDATE USING (usuario_id = auth.uid()::text);

CREATE POLICY "Usuarios deletam proprias notificacoes" ON notificacoes
  FOR DELETE USING (usuario_id = auth.uid()::text);
