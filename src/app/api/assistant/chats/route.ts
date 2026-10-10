import { NextResponse } from "next/server";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const supabase = await getSupabaseWithAuth();
    const { data, error } = await supabase
      .from("chats")
      .select("id, title, created_by_user, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[assistant/chats] erro ao listar:", error);
      return NextResponse.json({ error: "Erro ao listar chats" }, { status: 500 });
    }

    return NextResponse.json({ chats: data ?? [] });
  } catch (error) {
    console.error("[assistant/chats] erro geral:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
