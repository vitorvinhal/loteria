import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { getSession } from "@/lib/supabase/auth/server";

export async function PUT() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("usuario_id", session.user.id)
      .eq("lida", false);

    if (error) {
      console.error("[API] Erro ao marcar notificações:", error);
      return NextResponse.json({ error: "Erro ao marcar notificações" }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
