import { NextRequest, NextResponse } from "next/server";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";
import {
  montarIdentidade,
  nomeAmigavel,
  detectarMelhoria,
  detectarImagem,
  textoConfirmacaoMelhoria,
} from "@/modules/assistant/identity";
import { chamarChatIA, type AnexoChat, type MensagemChat } from "@/modules/assistant/assistant-chat";
import { gerarImagem, base64ParaBytes } from "@/modules/assistant/image-gen";
import { SALA_ID, SALA_TITULO } from "@/modules/assistant/sala";

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
    const anexos = validarAnexos(body?.attachments);
    if (!conteudo && !anexos.length) {
      return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
    }
    if (conteudo.length > MAX_CONTEUDO) {
      return NextResponse.json({ error: "Mensagem muito longa (máx. 4000 caracteres)" }, { status: 400 });
    }

    const supabase = await getSupabaseWithAuth();
    const { data: userData } = await supabase.auth.getUser();
    const freshUser = userData.user ?? session.user;
    const userName = nomeAmigavel(freshUser);
    const uid = freshUser.id;
    const { data: fotoRow } = await supabase
      .from("perfil_foto")
      .select("avatar_base64")
      .eq("usuario_id", uid)
      .maybeSingle();
    const avatar = fotoRow?.avatar_base64 || null;

    const chatAtual = SALA_ID;
    {
      const { data: existe } = await supabase
        .from("chats")
        .select("id")
        .eq("id", SALA_ID)
        .maybeSingle();
      if (!existe) {
        const { error: erroSala } = await supabase
          .from("chats")
          .insert({ id: SALA_ID, title: SALA_TITULO, created_by_user: "11", created_by_uid: null });
        if (erroSala && erroSala.code !== "23505") {
          console.error("[assistant/chat] erro ao criar sala:", erroSala);
        }
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

    const anexosResposta: AnexoChat[] = [];
    const imagem = !melhoria ? detectarImagem(resposta) : null;
    if (imagem) {
      try {
        const dataUrl = await gerarImagem(imagem.prompt);
        let urlPublica: string;
        let mimeImg = "image/png";
        let ext = "png";
        if (dataUrl.startsWith("data:")) {
          const { bytes, mime } = base64ParaBytes(dataUrl);
          mimeImg = mime;
          ext = mime.includes("png") ? "png" : "jpg";
          const caminho = `11/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: erroUpload } = await supabase.storage
            .from("assistant-attachments")
            .upload(caminho, bytes, { contentType: mime, upsert: false });
          if (erroUpload) throw erroUpload;
          const { data: pub } = supabase.storage.from("assistant-attachments").getPublicUrl(caminho);
          urlPublica = pub.publicUrl;
        } else {
          urlPublica = dataUrl;
        }
        anexosResposta.push({
          nome: `imagem-11.${ext}`,
          url: urlPublica.slice(0, 500),
          mime: mimeImg,
        });
        resposta = `Pronto, ${userName}! Criei essa imagem pra você. Quer que eu ajuste algo no prompt?`;
      } catch (e) {
        console.error("[assistant/chat] falha ao gerar imagem:", e);
        resposta =
          "Tentei gerar a imagem, mas o serviço de imagens está indisponível agora. Tente de novo em instantes.";
      }
    }

    await supabase.from("messages").insert({
      chat_id: chatAtual,
      user_id: null,
      user_name: "11",
      user_avatar: null,
      content: resposta,
      attachments: anexosResposta,
    });

    return NextResponse.json({
      chat_id: chatAtual,
      reply: resposta,
      melhoria_salva: melhoriaSalva,
      imagem_gerada: anexosResposta.length > 0,
      attachments: anexosResposta,
    });
  } catch (error) {
    console.error("[assistant/chat] erro geral:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
