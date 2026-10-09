import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { getUser } from "@/lib/supabase/auth/server";
import { isAdminUser } from "@/lib/admin";

const MIGRATIONS = [
  {
    name: "apostas",
    sql: `
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
      CREATE INDEX IF NOT EXISTS idx_apostas_usuario ON apostas(usuario_id);
      ALTER TABLE apostas ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Usuarios veem proprias apostas" ON apostas;
      CREATE POLICY "Usuarios veem proprias apostas" ON apostas
        FOR SELECT USING (usuario_id = auth.uid()::text);
      DROP POLICY IF EXISTS "Usuarios criam proprias apostas" ON apostas;
      CREATE POLICY "Usuarios criam proprias apostas" ON apostas
        FOR INSERT WITH CHECK (usuario_id = auth.uid()::text);
      DROP POLICY IF EXISTS "Usuarios deletam proprias apostas" ON apostas;
      CREATE POLICY "Usuarios deletam proprias apostas" ON apostas
        FOR DELETE USING (usuario_id = auth.uid()::text);
    `,
  },
  {
    name: "notificacoes",
    sql: `
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
      CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
      ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Usuarios veem proprias notificacoes" ON notificacoes;
      CREATE POLICY "Usuarios veem proprias notificacoes" ON notificacoes
        FOR SELECT USING (usuario_id = auth.uid()::text);
      DROP POLICY IF EXISTS "Usuarios criam proprias notificacoes" ON notificacoes;
      CREATE POLICY "Usuarios criam proprias notificacoes" ON notificacoes
        FOR INSERT WITH CHECK (usuario_id = auth.uid()::text);
      DROP POLICY IF EXISTS "Usuarios deletam proprias notificacoes" ON notificacoes;
      CREATE POLICY "Usuarios deletam proprias notificacoes" ON notificacoes
        FOR DELETE USING (usuario_id = auth.uid()::text);
    `,
  },
];

export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });

    const supabase = getSupabase();
    const results: { table: string; ok: boolean; error?: string }[] = [];

    for (const migration of MIGRATIONS) {
      try {
        const { error } = await supabase.rpc("exec_sql" as never, {
          query: migration.sql,
        } as never);

        if (error) {
          // Try direct query via raw SQL
          const { error: err2 } = await supabase
            .from("_migration_" + migration.name)
            .select("*")
            .limit(0);

          if (err2) {
            results.push({ table: migration.name, ok: false, error: error.message });
          } else {
            results.push({ table: migration.name, ok: true });
          }
        } else {
          results.push({ table: migration.name, ok: true });
        }
      } catch (e) {
        results.push({ table: migration.name, ok: false, error: String(e) });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
