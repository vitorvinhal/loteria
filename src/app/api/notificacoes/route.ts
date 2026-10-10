import { NextResponse } from "next/server";
import { getSupabaseWithAuth, getSession } from "@/lib/supabase/auth/server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ notificacoes: [] });
    }

    const supabase = await getSupabaseWithAuth();

    const { data: notificacoes, error } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("usuario_id", session.user.id)
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("[API] Erro ao buscar notificações:", error);
      return NextResponse.json({ notificacoes: [] });
    }

    return NextResponse.json({ notificacoes: notificacoes || [] });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ notificacoes: [] });
  }
}
