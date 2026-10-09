-- Public read access to reference tables (idempotente — pode ser re-executada)
ALTER TABLE loterias ENABLE ROW LEVEL SECURITY;
ALTER TABLE concursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estrategias ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Public read loterias" ON loterias;
DROP POLICY IF EXISTS "Public read concursos" ON concursos;
DROP POLICY IF EXISTS "Public read estrategias" ON estrategias;
DROP POLICY IF EXISTS "Service insert loterias" ON loterias;
DROP POLICY IF EXISTS "Service update loterias" ON loterias;
DROP POLICY IF EXISTS "Service insert concursos" ON concursos;
DROP POLICY IF EXISTS "Service update concursos" ON concursos;

-- Public read policies
CREATE POLICY "Public read loterias" ON loterias FOR SELECT USING (true);
CREATE POLICY "Public read concursos" ON concursos FOR SELECT USING (true);
CREATE POLICY "Public read estrategias" ON estrategias FOR SELECT USING (true);

-- Inserts/updates do serviço de sincronização (client anon do app).
-- service_role ignora RLS; demais papéis não têm escrita.
CREATE POLICY "Service insert loterias" ON loterias FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Service update loterias" ON loterias FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Service insert concursos" ON concursos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Service update concursos" ON concursos FOR UPDATE TO anon, authenticated USING (true);
