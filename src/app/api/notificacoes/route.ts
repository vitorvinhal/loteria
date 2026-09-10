import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { getSession } from "@/lib/supabase/auth/server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const supabase = getSupabase();

    const { data: notificacoes, error } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("usuario_id", session.user.id)
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("[API] Erro ao buscar notificações:", error);
      return NextResponse.json({ error: "Erro ao buscar notificações" }, { status: 500 });
    }

    return NextResponse.json({ notificacoes: notificacoes || [] });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
