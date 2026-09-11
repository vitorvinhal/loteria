"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth/provider";

const PUBLIC_PATHS = [
  "/",
  "/changelog",
  "/auth/login",
  "/auth/cadastro",
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const ehPublico = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

    // Não logado e rota protegida → login
    if (!user && !ehPublico) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
    // Logado e na página de login → dashboard
    if (user && (pathname === "/auth/login" || pathname === "/auth/cadastro")) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, pathname, router]);

  return <>{children}</>;
}