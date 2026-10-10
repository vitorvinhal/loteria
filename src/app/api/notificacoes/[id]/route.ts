import { NextRequest, NextResponse } from "next/server";
import { getSupabaseWithAuth, getSession } from "@/lib/supabase/auth/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await getSupabaseWithAuth();

    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("id", id)
      .eq("usuario_id", session.user.id);

    if (error) {
      console.error("[API] Erro ao atualizar notificação:", error);
      return NextResponse.json({ error: "Erro ao atualizar notificação" }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await getSupabaseWithAuth();

    const { error } = await supabase
      .from("notificacoes")
      .delete()
      .eq("id", id)
      .eq("usuario_id", session.user.id);

    if (error) {
      console.error("[API] Erro ao excluir notificação:", error);
      return NextResponse.json({ error: "Erro ao excluir notificação" }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
