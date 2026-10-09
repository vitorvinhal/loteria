import { User } from "@supabase/supabase-js";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;

  // role/metadata definido pelo service-role (não gravável pelo usuário).
  // user_metadata é descartado: é gravável pelo próprio usuário via updateUser.
  if (user.app_metadata?.role === "admin" || user.app_metadata?.is_admin === true) {
    return true;
  }

  // email em allowlist (NEXT_PUBLIC_ADMIN_EMAIL)
  const email = (user.email || "").toLowerCase();
  if (ADMIN_EMAILS.includes(email)) return true;

  return false;
}

export function adminEmails(): string[] {
  return ADMIN_EMAILS;
}