-- =====================================================
-- Migration: Histórico compartilhado com criador
-- Guarda nome + avatar do criador no lote e permite
-- jogos públicos (compartilhados entre usuários)
-- =====================================================

ALTER TABLE lotes_geracao ADD COLUMN IF NOT EXISTS criado_por TEXT;
ALTER TABLE lotes_geracao ADD COLUMN IF NOT EXISTS criador_avatar_url TEXT;

-- Jogos ficam públicos para listagem compartilhada
DROP POLICY IF EXISTS "Usuarios veem proprios lotes" ON lotes_geracao;
CREATE POLICY "Usuarios veem lotes" ON lotes_geracao
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios criam proprios lotes" ON lotes_geracao;
CREATE POLICY "Qualquer usuario cria lotes" ON lotes_geracao
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios veem proprios jogos" ON jogos_gerados;
CREATE POLICY "Usuarios veem jogos" ON jogos_gerados
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios criam proprios jogos" ON jogos_gerados;
CREATE POLICY "Qualquer usuario cria jogos" ON jogos_gerados
  FOR INSERT WITH CHECK (true);

-- Só o dono pode apagar o próprio lote
DROP POLICY IF EXISTS "Usuario deleta proprio lote" ON lotes_geracao;
CREATE POLICY "Usuario deleta proprio lote" ON lotes_geracao
  FOR DELETE USING (usuario_id = auth.uid()::text OR usuario_id IS NULL);

-- Só o dono pode apagar os próprios jogos (cascade manual)
DROP POLICY IF EXISTS "Usuario deleta proprios jogos" ON jogos_gerados;
CREATE POLICY "Usuario deleta proprios jogos" ON jogos_gerados
  FOR DELETE USING (usuario_id = auth.uid()::text OR usuario_id IS NULL);