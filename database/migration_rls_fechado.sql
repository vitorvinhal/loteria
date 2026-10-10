-- RLS fechado nas tabelas de usuário + correções de policies (idempotente).
-- RISCO HIGH — requer aprovação humana. Aplicar via SQL Editor do Supabase.
--
-- Padrão: coluna::text = auth.uid()::text funciona para colunas TEXT e UUID.
-- Policies com is_admin() ficam TO authenticated (anon não tem EXECUTE).

-- =========================================================
-- 1) apostas — só o dono (SELECT/INSERT/UPDATE/DELETE)
-- =========================================================
ALTER TABLE apostas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuarios veem proprias apostas" ON apostas;
DROP POLICY IF EXISTS "Usuarios criam proprias apostas" ON apostas;
DROP POLICY IF EXISTS "Usuarios atualizam proprias apostas" ON apostas;
DROP POLICY IF EXISTS "Usuarios deletam proprias apostas" ON apostas;
CREATE POLICY "Usuarios veem proprias apostas" ON apostas
  FOR SELECT TO authenticated USING (usuario_id::text = auth.uid()::text);
CREATE POLICY "Usuarios criam proprias apostas" ON apostas
  FOR INSERT TO authenticated WITH CHECK (usuario_id::text = auth.uid()::text);
CREATE POLICY "Usuarios atualizam proprias apostas" ON apostas
  FOR UPDATE TO authenticated
  USING (usuario_id::text = auth.uid()::text)
  WITH CHECK (usuario_id::text = auth.uid()::text);
CREATE POLICY "Usuarios deletam proprias apostas" ON apostas
  FOR DELETE TO authenticated USING (usuario_id::text = auth.uid()::text);

-- =========================================================
-- 2) notificacoes — só o dono (inclusive INSERT: a verificação
--    em lote passou a rodar por usuário logado, não mais global)
-- =========================================================
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuarios veem proprias notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "Usuarios criam proprias notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "Usuarios atualizam proprias notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "Usuarios deletam proprias notificacoes" ON notificacoes;
CREATE POLICY "Usuarios veem proprias notificacoes" ON notificacoes
  FOR SELECT TO authenticated USING (usuario_id::text = auth.uid()::text);
CREATE POLICY "Usuarios criam proprias notificacoes" ON notificacoes
  FOR INSERT TO authenticated WITH CHECK (usuario_id::text = auth.uid()::text);
CREATE POLICY "Usuarios atualizam proprias notificacoes" ON notificacoes
  FOR UPDATE TO authenticated
  USING (usuario_id::text = auth.uid()::text)
  WITH CHECK (usuario_id::text = auth.uid()::text);
CREATE POLICY "Usuarios deletam proprias notificacoes" ON notificacoes
  FOR DELETE TO authenticated USING (usuario_id::text = auth.uid()::text);

-- =========================================================
-- 3) perfil_foto — dono ou admin (admin/camuflagem edita terceiros)
-- =========================================================
ALTER TABLE perfil_foto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dono ou admin gerencia foto" ON perfil_foto;
CREATE POLICY "Dono ou admin gerencia foto" ON perfil_foto
  FOR ALL TO authenticated
  USING (usuario_id::text = auth.uid()::text OR is_admin())
  WITH CHECK (usuario_id::text = auth.uid()::text OR is_admin());

-- =========================================================
-- 4) convites_bolao — remetente gerencia; convidado vê pelo e-mail do JWT
-- =========================================================
ALTER TABLE convites_bolao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Remetente gerencia convite" ON convites_bolao;
DROP POLICY IF EXISTS "Convidado ve convite" ON convites_bolao;
CREATE POLICY "Remetente gerencia convite" ON convites_bolao
  FOR ALL TO authenticated
  USING (usuario_remetente::text = auth.uid()::text)
  WITH CHECK (usuario_remetente::text = auth.uid()::text);
CREATE POLICY "Convidado ve convite" ON convites_bolao
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'email' IS NOT NULL
    AND lower(auth.jwt() ->> 'email') = lower(email_convidado)
  );

-- =========================================================
-- 5) lotes_geracao / jogos_gerados — feed compartilhado: SELECT público;
--    INSERT dono ou anônimo sem dono; DELETE só dono/admin
--    (sem policy de UPDATE: tabela fica sem update p/ qualquer papel)
-- =========================================================
ALTER TABLE lotes_geracao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Feed publico de lotes" ON lotes_geracao;
DROP POLICY IF EXISTS "Criar lote proprio ou anonimo" ON lotes_geracao;
DROP POLICY IF EXISTS "Deletar lote proprio" ON lotes_geracao;
CREATE POLICY "Feed publico de lotes" ON lotes_geracao FOR SELECT USING (true);
CREATE POLICY "Criar lote proprio ou anonimo" ON lotes_geracao
  FOR INSERT TO anon, authenticated
  WITH CHECK (usuario_id IS NULL OR usuario_id::text = auth.uid()::text);
CREATE POLICY "Deletar lote proprio" ON lotes_geracao
  FOR DELETE TO authenticated
  USING (usuario_id::text = auth.uid()::text OR is_admin());

ALTER TABLE jogos_gerados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Feed publico de jogos gerados" ON jogos_gerados;
DROP POLICY IF EXISTS "Criar jogo proprio ou anonimo" ON jogos_gerados;
DROP POLICY IF EXISTS "Deletar jogo proprio" ON jogos_gerados;
CREATE POLICY "Feed publico de jogos gerados" ON jogos_gerados FOR SELECT USING (true);
CREATE POLICY "Criar jogo proprio ou anonimo" ON jogos_gerados
  FOR INSERT TO anon, authenticated
  WITH CHECK (usuario_id IS NULL OR usuario_id::text = auth.uid()::text);
CREATE POLICY "Deletar jogo proprio" ON jogos_gerados
  FOR DELETE TO authenticated
  USING (usuario_id::text = auth.uid()::text OR is_admin());

-- =========================================================
-- 6) jogos / lotes (legado, usados só por /api/usuario/excluir)
-- =========================================================
ALTER TABLE jogos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deletar jogo legado proprio" ON jogos;
CREATE POLICY "Deletar jogo legado proprio" ON jogos
  FOR DELETE TO authenticated
  USING (usuario_id::text = auth.uid()::text OR is_admin());

ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deletar lote legado proprio" ON lotes;
CREATE POLICY "Deletar lote legado proprio" ON lotes
  FOR DELETE TO authenticated
  USING (usuario_id::text = auth.uid()::text OR is_admin());

-- =========================================================
-- 7) estrategias — escrita do serviço de seed (parity com loterias/concursos)
-- =========================================================
DROP POLICY IF EXISTS "Service insert estrategias" ON estrategias;
DROP POLICY IF EXISTS "Service update estrategias" ON estrategias;
CREATE POLICY "Service insert estrategias" ON estrategias
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Service update estrategias" ON estrategias
  FOR UPDATE TO anon, authenticated USING (true);

-- =========================================================
-- 8) Remove policies legadas perigosas (FOR ALL USING true), se existirem
-- =========================================================
DROP POLICY IF EXISTS "Service write loterias" ON loterias;
DROP POLICY IF EXISTS "Service write concursos" ON concursos;
DROP POLICY IF EXISTS "Service write estrategias" ON estrategias;
