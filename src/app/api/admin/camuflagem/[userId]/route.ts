import { NextRequest, NextResponse } from "next/server";
import { getSupabaseWithAuth } from "@/lib/supabase/auth/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId necessário" }, { status: 400 });
  const supabase = await getSupabaseWithAuth();
  const { data, error } = await supabase.from("perfil_foto").select("camuflagem_ativa").eq("usuario_id", userId).single();
  if (error) return NextResponse.json({ error: "Erro ao buscar" }, { status: 500 });
  return NextResponse.json({ camuflagem_ativa: data?.camuflagem_ativa ?? false });
}

export async function POST(request: NextRequest) {
  const { userId, ativo } = await request.json();
  if (!userId || typeof ativo !== "boolean") return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  const supabase = await getSupabaseWithAuth();
  const { error } = await supabase.from("perfil_foto").upsert({ usuario_id: userId, camuflagem_ativa: ativo }, { onConflict: "usuario_id" });
  if (error) return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
