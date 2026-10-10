import { NextRequest, NextResponse } from "next/server";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";
import {
  montarIdentidade,
  nomeAmigavel,
  detectarMelhoria,
  textoConfirmacaoMelhoria,
} from "@/modules/assistant/identity";
import { chamarChatIA, type AnexoChat, type MensagemChat } from "@/modules/assistant/assistant-chat";

export const dynamic = "force-dynamic";

const MAX_CONTEUDO = 4000;
const MAX_ANEXOS = 5;
const HISTORICO_MAX = 24;

interface LinhaMensagem {
  id: string;
  user_id: string | null;
  user_name: string;
  user_avatar: string | null;
  content: string;
  attachments: AnexoChat[] | null;
  created_at: string;
}

function validarAnexos(bruto: unknown): AnexoChat[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .slice(0, MAX_ANEXOS)
    .filter((a): a is AnexoChat => {
      if (!a || typeof a !== "object") return false;
      const x = a as Record<string, unknown>;
      return (
        typeof x.url === "string" &&
        x.url.startsWith("https://") &&
        typeof x.nome === "string" &&
        typeof x.mime === "string"
      );
    })
    .map((a) => ({
      nome: a.nome.slice(0, 120),
      url: a.url.slice(0, 500),
      mime: a.mime.slice(0, 80),
    }));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const conteudo = typeof body?.content === "string" ? body.content.trim() : "";
    const chatId = typeof body?.chat_id === "string" && body.chat_id ? body.chat_id : null;
    const anexos = validarAnexos(body?.attachments);
    if (!conteudo && !anexos.length) {
      return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
    }
    if (conteudo.length > MAX_CONTEUDO) {
      return NextResponse.json({ error: "Mensagem muito longa (máx. 4000 caracteres)" }, { status: 400 });
    }

    const userName = nomeAmigavel(session.user);
    const supabase = await getSupabaseWithAuth();
    const uid = session.user.id;
    const avatar =
      typeof session.user.user_metadata?.avatar_url === "string"
        ? session.user.user_metadata.avatar_url
        : null;

    let chatAtual = chatId;
    if (!chatAtual) {
      const titulo = conteudo ? conteudo.slice(0, 60) : "Novo chat";
      const { data: chat, error } = await supabase
        .from("chats")
        .insert({
          title: titulo,
          created_by_user: userName,
          created_by_uid: uid,
        })
        .select("id")
        .single();
      if (error || !chat) {
        console.error("[assistant/chat] erro ao criar chat:", error);
        return NextResponse.json({ error: "Erro ao criar chat" }, { status: 500 });
      }
      chatAtual = chat.id as string;
    } else {
      const { data: existe } = await supabase
        .from("chats")
        .select("id")
        .eq("id", chatAtual)
        .maybeSingle();
      if (!existe) {
        return NextResponse.json({ error: "Chat não encontrado" }, { status: 404 });
      }
    }

    const { error: erroMsg } = await supabase.from("messages").insert({
      chat_id: chatAtual,
      user_id: uid,
      user_name: userName,
      user_avatar: avatar,
      content: conteudo,
      attachments: anexos,
    });
    if (erroMsg) {
      console.error("[assistant/chat] erro ao salvar mensagem:", erroMsg);
      return NextResponse.json({ error: "Erro ao salvar mensagem" }, { status: 500 });
    }

    const { data: historico } = await supabase
      .from("messages")
      .select("id, user_id, user_name, content, attachments, created_at")
      .eq("chat_id", chatAtual)
      .order("created_at", { ascending: false })
      .limit(HISTORICO_MAX);

    const mensagens: MensagemChat[] = [
      { role: "system", content: montarIdentidade(userName) },
      ...((historico ?? []) as LinhaMensagem[])
        .slice()
        .reverse()
        .map((m) => ({
          role: (m.user_id ? "user" : "assistant") as "user" | "assistant",
          content: m.content,
          attachments: m.user_id ? (m.attachments ?? undefined) : undefined,
        })),
    ];

    let resposta: string;
    try {
      resposta = await chamarChatIA(mensagens);
    } catch (e) {
      console.error("[assistant/chat] IA falhou:", e);
      resposta =
        "Desculpe, não consegui processar agora — todos os meus provedores estão indisponíveis. Tente de novo em instantes.";
    }

    let melhoriaSalva = false;
    const melhoria = detectarMelhoria(resposta);
    if (melhoria) {
      const { error: erroMelhoria } = await supabase.from("site_improvements").insert({
        requested_by: userName,
        original_feedback: melhoria.feedback,
        generated_prompt: melhoria.promptTecnico,
      });
      melhoriaSalva = !erroMelhoria;
      if (erroMelhoria) console.error("[assistant/chat] erro ao salvar melhoria:", erroMelhoria);
      resposta = textoConfirmacaoMelhoria(userName);
    }

    await supabase.from("messages").insert({
      chat_id: chatAtual,
      user_id: null,
      user_name: "11",
      user_avatar: null,
      content: resposta,
      attachments: [],
    });

    return NextResponse.json({ chat_id: chatAtual, reply: resposta, melhoria_salva: melhoriaSalva });
  } catch (error) {
    console.error("[assistant/chat] erro geral:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
