# ADR-001 — Fonte de verdade para autorização de admin

- **Status:** aceito
- **Data:** 2026-10-09
- **Risco:** HIGH (auth)

## Contexto

`src/lib/admin.ts` decide admin por:
1. `user.user_metadata.role === "admin"` ou `user_metadata.is_admin === true`;
2. allowlist `NEXT_PUBLIC_ADMIN_EMAIL`;
3. fallback hardcoded de prefixo de e-mail (`vitorvinhal90`).

O `user_metadata` do Supabase é **gravável pelo próprio usuário** via
`supabase.auth.updateUser({ data })`. Logo, qualquer conta autenticada pode se
auto-promover a admin e acessar rotas restritas (`/api/admin/*`).

Além disso, `getSession()` lê o token do cookie sem revalidar com o servidor de
auth, e é usado como base das decisões de autorização.

## Decisão

1. Autorizar admin **somente** por fontes que o usuário não controla:
   - `user.app_metadata.role === "admin"` / `app_metadata.is_admin === true`
     (escrevível apenas por service-role); **ou**
   - allowlist `NEXT_PUBLIC_ADMIN_EMAIL` (variável de ambiente pública).
2. Remover o fallback de prefixo de e-mail hardcoded.
3. Usar `getUser()` (valida o token no Auth server) em vez de `getSession()`
   nas rotas que decidem autorização.
4. A função `is_admin()` no Postgres passa a decidir por `app_metadata`/claim
   confiável, não por `auth.jwt()->>'role'` (que normalmente é `authenticated`).

## Trade-offs

- Exige que o admin real seja provisionado via `app_metadata` (service-role) ou
  pela allowlist de ambiente. Perde-se o "atalho" do prefixo de e-mail.
- `getUser()` faz uma chamada de rede adicional por request protegido — custo
  aceitável, restrito às rotas de admin.

## Consequências

- `src/lib/admin.ts` reescrito.
- `src/app/api/admin/**` usa `getUser()`.
- `database/migration_camuflagem.sql` ajustado.
- Testes de autorização a adicionar.
