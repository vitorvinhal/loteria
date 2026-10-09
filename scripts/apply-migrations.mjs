import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const env = { ...process.env };
  const file = resolve(root, ".env.local");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=");
      if (i > 0 && !line.startsWith("#")) env[line.slice(0, i).trim()] = line.slice(i + 1);
    }
  }
  return env;
}

const MIGRATIONS = [
  "database/migration_notificacoes.sql",
  "database/migration_apostas.sql",
  "database/migration_regras_loterias.sql",
  "database/migration_camuflagem.sql",
  // Abaixo: pendentes de APROVACAO HUMANA (risco HIGH) — só serão aplicados
  // quando este script for executado de propósito.
  "database/migration_rls_public.sql",
  "database/migration_apostas_metadados.sql",
];

const env = loadEnv();
const connectionString = process.env.DATABASE_URL || env.DATABASE_URL;
if (!connectionString) {
  console.error("ERRO: DATABASE_URL nao encontrada (env nem .env.local)");
  process.exit(2);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function safeQuery(sql) {
  try {
    return await client.query(sql);
  } catch (e) {
    return { error: e };
  }
}

const verifyOnly = process.argv.includes("--verify-only");

async function main() {
  await client.connect();
  console.log("Conectado ao banco.");

  const results = [];

  if (!verifyOnly) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = resolve(root, "database/backups");
    mkdirSync(backupDir, { recursive: true });
  const backupFile = resolve(backupDir, `pre-migracao-${ts}.json`);

  const backup = { when: ts };
  backup.loterias = (await client.query("SELECT * FROM public.loterias")).rows;
  backup.perfil_foto_policies = (
    await client.query(
      "SELECT policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='perfil_foto'"
    )
  ).rows;
  const fn = await safeQuery(
    "SELECT pg_get_functiondef('public.is_admin()'::regprocedure) AS def"
  );
  backup.is_admin_fn = fn.error ? "INEXISTENTE" : fn.rows[0].def;
  backup.columns_before = (
    await client.query(
      `SELECT table_name, column_name, data_type FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name IN ('loterias','jogos_gerados','concursos','perfil_foto')`
    )
  ).rows;
  writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`Backup pre-migracao salvo em: ${backupFile}`);
  console.log(`  - loterias: ${backup.loterias.length} linhas`);
  console.log(`  - policies perfil_foto: ${backup.perfil_foto_policies.length}`);
  console.log(`  - is_admin(): ${backup.is_admin_fn === "INEXISTENTE" ? "inexistente" : "existe"}`);

  for (const rel of MIGRATIONS) {
    const path = resolve(root, rel);
    const sql = readFileSync(path, "utf8");
    try {
      await client.query(sql);
      results.push({ file: rel, ok: true });
      console.log(`OK   ${rel}`);
    } catch (e) {
      results.push({ file: rel, ok: false, error: e.message });
      console.log(`FALHA ${rel}: ${e.message}`);
    }
  }
  }

  console.log("\n== VERIFICACAO POS-MIGRACAO ==");
  const checks = [
    ["loterias.mecanica", `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='loterias' AND column_name='mecanica'`],
    ["loterias.colunas", `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='loterias' AND column_name='colunas'`],
    ["loterias.qtd_sorteada", `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='loterias' AND column_name='qtd_sorteada'`],
    ["jogos_gerados.metadados", `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='jogos_gerados' AND column_name='metadados'`],
    ["concursos.metadados", `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='concursos' AND column_name='metadados'`],
    ["perfil_foto.camuflagem_ativa", `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='perfil_foto' AND column_name='camuflagem_ativa'`],
    ["tabela notificacoes", `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notificacoes'`],
    ["tabela apostas", `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='apostas'`],
    ["apostas.metadados", `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='apostas' AND column_name='metadados'`],
    ["rls_public: policy Public read concursos", `SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='concursos' AND policyname='Public read concursos'`],
    ["rls_public: policy Public read loterias", `SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='loterias' AND policyname='Public read loterias'`],
    ["is_admin() existe", `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='is_admin'`],
    ["supersete posicional", `SELECT 1 FROM public.loterias WHERE slug='supersete' AND mecanica='posicional'`],
    ["supersete colunas json", `SELECT 1 FROM public.loterias WHERE slug='supersete' AND colunas IS NOT NULL`],
    ["anon SEM EXECUTE em is_admin (seguro)", `SELECT 1 WHERE NOT has_function_privilege('anon', 'public.is_admin()', 'EXECUTE')`],
    ["authenticated COM EXECUTE em is_admin", `SELECT 1 WHERE has_function_privilege('authenticated', 'public.is_admin()', 'EXECUTE')`],
  ];
  let failed = 0;
  for (const [name, sql] of checks) {
    const r = await safeQuery(sql);
    const ok = !r.error && r.rows.length > 0;
    if (!ok) failed++;
    console.log(`${ok ? "OK  " : "FALHA"} ${name}${r.error ? " (" + r.error.message + ")" : ""}`);
  }

  await client.end();

  const allMigrationsOk = results.every((r) => r.ok);
  const migLabel = verifyOnly ? "nao-executadas" : allMigrationsOk ? "OK" : "FALHAS";
  console.log(`\nRESULTADO: migrations=${migLabel} | verificacao=${failed === 0 ? "OK" : failed + " FALHAS"}`);
  process.exit(allMigrationsOk && failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e.message);
  process.exit(1);
});
