import { NextRequest, NextResponse } from "next/server";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";
import type { AnexoChat } from "@/modules/assistant/assistant-chat";

export const dynamic = "force-dynamic";

const HISTORICO_MAX = 60;

interface LinhaMensagem {
  id: string;
  user_id: string | null;
  user_name: string;
  user_avatar: string | null;
  content: string;
  attachments: AnexoChat[] | null;
  created_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const chatId = req.nextUrl.searchParams.get("chat_id");
    if (!chatId) {
      return NextResponse.json({ error: "chat_id obrigatório" }, { status: 400 });
    }

    const supabase = await getSupabaseWithAuth();
    const { data, error } = await supabase
      .from("messages")
      .select("id, user_id, user_name, user_avatar, content, attachments, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(HISTORICO_MAX);

    if (error) {
      console.error("[assistant/messages] erro ao listar:", error);
      return NextResponse.json({ error: "Erro ao listar mensagens" }, { status: 500 });
    }

    const mensagens = ((data ?? []) as LinhaMensagem[]).map((m) => ({
      ...m,
      attachments: m.attachments ?? [],
    }));
    return NextResponse.json({ mensagens });
  } catch (error) {
    console.error("[assistant/messages] erro geral:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
