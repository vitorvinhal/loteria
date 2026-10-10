
CREATE TABLE IF NOT EXISTS config_ia (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  provider text NOT NULL DEFAULT 'groq',
  model text NOT NULL DEFAULT 'openai/gpt-oss-120b',
  base_url text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE config_ia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura publica config ia" ON config_ia;
CREATE POLICY "Leitura publica config ia" ON config_ia
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin gerencia config ia" ON config_ia;
CREATE POLICY "Admin gerencia config ia" ON config_ia
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin atualiza config ia" ON config_ia;
CREATE POLICY "Admin atualiza config ia" ON config_ia
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
INSERT INTO config_ia (id, provider, model)
VALUES (1, 'groq', 'openai/gpt-oss-120b')
ON CONFLICT (id) DO NOTHING;
