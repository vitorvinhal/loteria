-- =====================================================
-- Migration: Convites de bolão entre usuários
-- =====================================================

CREATE TABLE IF NOT EXISTS public.convites_bolao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_remetente TEXT NOT NULL,
  remetente_nome TEXT,
  email_convidado TEXT NOT NULL,
  loteria_id TEXT NOT NULL,
  quantidade_cotas INTEGER NOT NULL DEFAULT 1,
  jogos JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_convites_bolao_email ON convites_bolao(email_convidado);
CREATE INDEX IF NOT EXISTS idx_convites_bolao_remetente ON convites_bolao(usuario_remetente);

ALTER TABLE public.convites_bolao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Convidador ve seus convites" ON convites_bolao;
CREATE POLICY "Convidador ve seus convites" ON convites_bolao
  FOR SELECT USING (usuario_remetente = auth.uid()::text OR email_convidado = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "Convidador cria convites" ON convites_bolao;
CREATE POLICY "Convidador cria convites" ON convites_bolao
  FOR INSERT WITH CHECK (usuario_remetente = auth.uid()::text);

DROP POLICY IF EXISTS "Convidado atualiza convite" ON convites_bolao;
CREATE POLICY "Convidado atualiza convite" ON convites_bolao
  FOR UPDATE USING (email_convidado = auth.jwt() ->> 'email');