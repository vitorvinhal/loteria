-- =====================================================
-- Migration: Camuflagem ativa por usuário (admin-only)
-- Adiciona a coluna camuflagem_ativa em perfil_foto e
-- restringe o gerenciamento SOMENTE ao administrador.
-- =====================================================

-- 1. Coluna na tabela perfil_foto
ALTER TABLE public.perfil_foto
  ADD COLUMN IF NOT EXISTS camuflagem_ativa BOOLEAN DEFAULT FALSE;

-- 2. Função helper para identificar o admin no banco (RLS)
--    Provê o admin via app_metadata (escrevível apenas por service-role).
--    user_metadata é ignorado: o usuário pode gravá-lo sozinho (escalação).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
  );
$$;

-- Libera o uso da função apenas para o papel autenticado (usada nas policies)
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3. Policies: somente o admin pode ler/inserir/atualizar a flag de qualquer usuário
DROP POLICY IF EXISTS "Admin gerencia camuflagem select" ON perfil_foto;
CREATE POLICY "Admin gerencia camuflagem select" ON perfil_foto
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin gerencia camuflagem insert" ON perfil_foto;
CREATE POLICY "Admin gerencia camuflagem insert" ON perfil_foto
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin gerencia camuflagem update" ON perfil_foto;
CREATE POLICY "Admin gerencia camuflagem update" ON perfil_foto
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Nota: as policies próprias de avatar (Usuario ve/insere/atualiza sua foto)
-- continuam valendo para cada usuário ver apenas a própria foto.