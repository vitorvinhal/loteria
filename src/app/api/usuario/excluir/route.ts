import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { getSession } from "@/lib/supabase/auth/server";

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const supabase = getSupabase();

    const { error: deleteError } = await supabase
      .from("jogos")
      .delete()
      .eq("usuario_id", session.user.id);

    if (deleteError) {
      console.error("[API] Erro ao deletar jogos:", deleteError);
    }

    const { error: lotesError } = await supabase
      .from("lotes")
      .delete()
      .eq("usuario_id", session.user.id);

    if (lotesError) {
      console.error("[API] Erro ao deletar lotes:", lotesError);
    }

    const { error } = await supabase.auth.admin.deleteUser(session.user.id);

    if (error) {
      console.error("[API] Erro ao deletar usuário:", error);
      return NextResponse.json({ error: "Erro ao excluir conta" }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
