import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { getSession } from "@/lib/supabase/auth/server";

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { nome } = body;

    const supabase = getSupabase();

    const { error } = await supabase.auth.updateUser({
      data: { nome },
    });

    if (error) {
      console.error("[API] Erro ao atualizar usuário:", error);
      return NextResponse.json({ error: "Erro ao atualizar configurações" }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
