-- =====================================================
-- Migration: Foto de perfil em tabela separada
-- Remove a foto base64 do user_metadata (JWT gigante causava
-- erro 494 REQUEST_HEADER_TOO_LARGE) e guarda em tabela própria
-- =====================================================

CREATE TABLE IF NOT EXISTS public.perfil_foto (
  usuario_id TEXT PRIMARY KEY,
  avatar_base64 TEXT,
  camuflagem_ativa BOOLEAN DEFAULT FALSE,
);

ALTER TABLE public.perfil_foto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario ve sua foto" ON perfil_foto;
CREATE POLICY "Usuario ve sua foto" ON perfil_foto
  FOR SELECT USING (usuario_id = auth.uid()::text);

DROP POLICY IF EXISTS "Usuario insere sua foto" ON perfil_foto;
CREATE POLICY "Usuario insere sua foto" ON perfil_foto
  FOR INSERT WITH CHECK (usuario_id = auth.uid()::text);

DROP POLICY IF EXISTS "Usuario atualiza sua foto" ON perfil_foto;
CREATE POLICY "Usuario atualiza sua foto" ON perfil_foto
  FOR UPDATE USING (usuario_id = auth.uid()::text);

DROP POLICY IF EXISTS "Usuario deleta sua foto" ON perfil_foto;
CREATE POLICY "Usuario deleta sua foto" ON perfil_foto
  FOR DELETE USING (usuario_id = auth.uid()::text);

-- Atenção: usuários que já têm avatar base64 gigante no metadata
-- precisam refazer o upload após esta migration (o cliente limpa o metadata).