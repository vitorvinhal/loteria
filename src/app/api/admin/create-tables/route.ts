import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";

const SQL_SETUP = `
-- RLS for loterias, concursos, estrategias
DO $$ BEGIN ALTER TABLE loterias ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE concursos ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE estrategias ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN DROP POLICY IF EXISTS "Public read loterias" ON loterias; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Public read concursos" ON concursos; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Public read estrategias" ON estrategias; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Service write loterias" ON loterias; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Service write concursos" ON concursos; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Service write estrategias" ON estrategias; END $$;

CREATE POLICY "Public read loterias" ON loterias FOR SELECT USING (true);
CREATE POLICY "Public read concursos" ON concursos FOR SELECT USING (true);
CREATE POLICY "Public read estrategias" ON estrategias FOR SELECT USING (true);
CREATE POLICY "Service write loterias" ON loterias FOR ALL USING (true);
CREATE POLICY "Service write concursos" ON concursos FOR ALL USING (true);
CREATE POLICY "Service write estrategias" ON estrategias FOR ALL USING (true);

-- Seed loterias
INSERT INTO loterias (id, slug, nome, universo_min, universo_max, qtd_dezenas_min, qtd_dezenas_max, qtd_dezenas_padrao, dias_sorteio, horario_sorteio, preco_aposta_base, regras_vitoria, ativo) VALUES
('lotofacil', 'lotofacil', 'Lotofácil', 1, 25, 15, 20, 15, '["domingo"]', '11:00', 3.00, '[]', true),
('lotomania', 'lotomania', 'Lotomania', 0, 99, 50, 50, 50, '["terca","sexta"]', '20:00', 3.50, '[]', true),
('megasena', 'megasena', 'Mega-Sena', 1, 60, 6, 15, 6, '["domingo"]', '11:00', 5.00, '[]', true),
('quina', 'quina', 'Quina', 1, 80, 5, 15, 5, '["domingo"]', '11:00', 2.50, '[]', true),
('duplasena', 'duplasena', 'Dupla Sena', 1, 50, 6, 15, 6, '["terca","quinta","sabado"]', '20:00', 2.50, '[]', true),
('timemania', 'timemania', 'Timemania', 1, 80, 10, 10, 10, '["domingo"]', '11:00', 4.50, '[]', true),
('diadesorte', 'diadesorte', 'Dia de Sorte', 1, 31, 7, 15, 7, '["domingo"]', '11:00', 3.50, '[]', true),
('maismilionaria', 'maismilionaria', '+Milionária', 1, 50, 6, 6, 6, '["domingo"]', '11:00', 6.00, '[]', true),
('supersete', 'supersete', 'Super Sete', 0, 9, 7, 7, 7, '["sexta"]', '20:00', 2.50, '[]', true)
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, ativo = EXCLUDED.ativo;

-- Create apostas
CREATE TABLE IF NOT EXISTS apostas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id TEXT NOT NULL,
  loteria_id TEXT NOT NULL,
  dezenas INTEGER[] NOT NULL,
  valor_apostado NUMERIC(10,2) NOT NULL,
  resultado JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_apostas_usuario ON apostas(usuario_id); END $$;
DO $$ BEGIN ALTER TABLE apostas ENABLE ROW LEVEL SECURITY; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "apostas_select" ON apostas; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "apostas_insert" ON apostas; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "apostas_delete" ON apostas; END $$;
CREATE POLICY "apostas_select" ON apostas FOR SELECT USING (usuario_id = auth.uid()::text);
CREATE POLICY "apostas_insert" ON apostas FOR INSERT WITH CHECK (usuario_id = auth.uid()::text);
CREATE POLICY "apostas_delete" ON apostas FOR DELETE USING (usuario_id = auth.uid()::text);

-- Create notificacoes
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info',
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  concurso_numero INTEGER,
  loteria_slug TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id); END $$;
DO $$ BEGIN ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "notificacoes_select" ON notificacoes; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "notificacoes_insert" ON notificacoes; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "notificacoes_delete" ON notificacoes; END $$;
CREATE POLICY "notificacoes_select" ON notificacoes FOR SELECT USING (usuario_id = auth.uid()::text);
CREATE POLICY "notificacoes_insert" ON notificacoes FOR INSERT WITH CHECK (usuario_id = auth.uid()::text);
CREATE POLICY "notificacoes_delete" ON notificacoes FOR DELETE USING (usuario_id = auth.uid()::text);
`;

const SQL_EXEC_SQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

export async function POST() {
  try {
    const supabase = getSupabase();
    const results: { name: string; ok: boolean; error?: string }[] = [];

    // Step 1: Try creating exec_sql function
    try {
      const { error } = await supabase.rpc("exec_sql" as never, { sql: SQL_EXEC_SQL } as never);
      if (error) {
        results.push({ name: "exec_sql function", ok: false, error: error.message });
      } else {
        results.push({ name: "exec_sql function", ok: true });
      }
    } catch {
      results.push({ name: "exec_sql function", ok: false, error: "RPC not available" });
    }

    // Step 2: Run setup SQL via exec_sql
    try {
      const { error } = await supabase.rpc("exec_sql" as never, { sql: SQL_SETUP } as never);
      if (error) {
        results.push({ name: "setup SQL", ok: false, error: error.message });
      } else {
        results.push({ name: "setup SQL", ok: true });
      }
    } catch {
      results.push({ name: "setup SQL", ok: false, error: "RPC not available" });
    }

    // Step 3: Verify tables
    const checks: Record<string, { exists: boolean; count?: number }> = {};
    for (const table of ["loterias", "concursos", "estrategias", "apostas", "notificacoes"]) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true });
        checks[table] = { exists: !error, count: count || 0 };
      } catch {
        checks[table] = { exists: false };
      }
    }

    return NextResponse.json({ results, tables: checks });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
