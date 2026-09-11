import { NextRequest, NextResponse } from "next/server";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";
import { isAdminUser } from "@/lib/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { nome } = body;

    if (typeof nome !== "string") {
      return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
    }

    const supabase = await getSupabaseWithAuth();

    const { data: jogo, error: fetchError } = await supabase
      .from("jogos_gerados")
      .select("id")
      .eq("id", id)
      .eq("usuario_id", session.user.id)
      .single();

    if (fetchError || !jogo) {
      return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
    }

    const { error } = await supabase
      .from("jogos_gerados")
      .update({ nome })
      .eq("id", id);

    if (error) {
      console.error("[API/lotes/[id]] Erro ao renomear jogo:", error);
      return NextResponse.json({ error: "Erro ao renomear jogo" }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("[API/lotes/[id]] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

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
    const supabase = await getSupabaseWithAuth();
    const ehAdmin = isAdminUser(session.user);

    // Verifica se o lote pertence ao usuário OU se é admin
    let loteQuery = supabase.from("lotes_geracao").select("id");
    if (ehAdmin) {
      loteQuery = loteQuery.eq("id", id);
    } else {
      loteQuery = loteQuery.eq("id", id).eq("usuario_id", session.user.id);
    }

    const { data: lote, error: loteError } = await loteQuery.single();

    if (loteError || !lote) {
      return NextResponse.json({ error: "Lote não encontrado ou você não tem permissão" }, { status: 404 });
    }

    // Exclui os jogos do lote (cascade manual para respeitar RLS)
    await supabase.from("jogos_gerados").delete().eq("lote_id", id);

    const { error } = await supabase.from("lotes_geracao").delete().eq("id", id);

    if (error) {
      console.error("[API/lotes/[id]] Erro ao excluir lote:", error);
      return NextResponse.json({ error: "Erro ao excluir lote" }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("[API/lotes/[id]] Erro ao excluir:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}