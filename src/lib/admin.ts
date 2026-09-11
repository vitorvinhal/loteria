import { User } from "@supabase/supabase-js";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;

  // role/metadata definido manualmente no banco
  if (user.user_metadata?.role === "admin" || user.user_metadata?.is_admin === true) {
    return true;
  }

  // email em allowlist (NEXT_PUBLIC_ADMIN_EMAIL)
  const email = (user.email || "").toLowerCase();
  if (ADMIN_EMAILS.includes(email)) return true;

  // fallback: prefixo vitorvinhal90 é admin (usuário principal)
  const prefixo = email.split("@")[0];
  if (prefixo === "vitorvinhal90") return true;

  return false;
}

export function adminEmails(): string[] {
  return ADMIN_EMAILS;
}