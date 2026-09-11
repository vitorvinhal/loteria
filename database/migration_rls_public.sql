-- Public read access to reference tables
ALTER TABLE loterias ENABLE ROW LEVEL SECURITY;
ALTER TABLE concursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estrategias ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Public read loterias" ON loterias;
DROP POLICY IF EXISTS "Public read concursos" ON concursos;
DROP POLICY IF EXISTS "Public read estrategias" ON estrategias;
DROP POLICY IF EXISTS "Service insert loterias" ON loterias;
DROP POLICY IF EXISTS "Service insert concursos" ON concursos;

-- Public read policies
CREATE POLICY "Public read loterias" ON loterias FOR SELECT USING (true);
CREATE POLICY "Public read concursos" ON concursos FOR SELECT USING (true);
CREATE POLICY "Public read estrategias" ON estrategias FOR SELECT USING (true);

-- Allow service role (anon) inserts for loterias and concursos
CREATE POLICY "Service insert loterias" ON loterias FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update loterias" ON loterias FOR UPDATE USING (true);
CREATE POLICY "Service insert concursos" ON concursos FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update concursos" ON concursos FOR UPDATE USING (true);
