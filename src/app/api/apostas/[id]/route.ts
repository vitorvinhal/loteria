import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { getSession } from "@/lib/supabase/auth/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getSupabase();

    const { error } = await supabase
      .from("apostas")
      .delete()
      .eq("id", id)
      .eq("usuario_id", session.user.id);

    if (error) {
      console.error("[API/apostas/[id]] Erro ao excluir aposta:", error);
      return NextResponse.json({ error: "Erro ao excluir aposta" }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("[API/apostas/[id]] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
