import { NextRequest, NextResponse } from "next/server";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { nome, notificacoes_sorteio, notificacoes_score, tema } = body;

    const supabase = await getSupabaseWithAuth();

    const existingMeta = session.user.user_metadata || {};
    const updates: Record<string, unknown> = {
      data: {
        ...existingMeta,
        ...(nome && typeof nome === "string" ? { nome: nome.trim() } : {}),
        ...(typeof notificacoes_sorteio === "boolean" ? { notificacoes_sorteio } : {}),
        ...(typeof notificacoes_score === "boolean" ? { notificacoes_score } : {}),
        ...(typeof tema === "string" && ["light", "dark", "system"].includes(tema) ? { tema } : {}),
      },
    };

    const { error } = await supabase.auth.updateUser(updates);

    if (error) {
      console.error("[API] Erro ao atualizar usuário:", error);
      return NextResponse.json({ error: error.message || "Erro ao atualizar configurações" }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return PUT(request);
}
