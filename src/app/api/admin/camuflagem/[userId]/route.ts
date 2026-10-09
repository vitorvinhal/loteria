import { NextRequest, NextResponse } from "next/server";
import { getSupabaseWithAuth, getSession, getUser } from "@/lib/supabase/auth/server";
import { isAdminUser } from "@/lib/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getSession();
    const user = session?.user ?? (await getUser());
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });

    const { userId } = await params;
    const supabase = await getSupabaseWithAuth();
    const { data, error } = await supabase
      .from("perfil_foto")
      .select("camuflagem_ativa")
      .eq("usuario_id", userId)
      .single();
    if (error) return NextResponse.json({ error: "Erro ao buscar" }, { status: 500 });
    return NextResponse.json({ camuflagem_ativa: data?.camuflagem_ativa ?? false });
  } catch (e) {
    console.error("[Camuflagem] Erro GET:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getSession();
    const user = session?.user ?? (await getUser());
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });

    const { userId } = await params;
    const body = await request.json().catch(() => null);

    const ativo = body?.ativo;
    if (!userId || typeof ativo !== "boolean") {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const supabase = await getSupabaseWithAuth();
    const { error } = await supabase
      .from("perfil_foto")
      .upsert({ usuario_id: userId, camuflagem_ativa: ativo }, { onConflict: "usuario_id" });
    if (error) return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
    return NextResponse.json({ ok: true, camuflagem_ativa: ativo });
  } catch (e) {
    console.error("[Camuflagem] Erro POST:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}