import { NextRequest, NextResponse } from "next/server";
import { createServerClientInstance } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClientInstance();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { nome, notificacoes_sorteio, notificacoes_score } = body;

    const updates: Record<string, unknown> = {};
    if (nome && typeof nome === "string" && nome.trim().length > 0) {
      updates.data = { ...user.user_metadata, nome: nome.trim() };
    }

    if (typeof notificacoes_sorteio === "boolean" || typeof notificacoes_score === "boolean") {
      const existingMeta = user.user_metadata || {};
      updates.data = {
        ...existingMeta,
        ...(nome && typeof nome === "string" ? { nome: nome.trim() } : {}),
        notificacoes_sorteio: typeof notificacoes_sorteio === "boolean" ? notificacoes_sorteio : existingMeta.notificacoes_sorteio,
        notificacoes_score: typeof notificacoes_score === "boolean" ? notificacoes_score : existingMeta.notificacoes_score,
      };
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum dado para atualizar" }, { status: 400 });
    }

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
