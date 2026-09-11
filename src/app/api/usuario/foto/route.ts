import { NextRequest, NextResponse } from "next/server";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";

const MAX_AVATAR_BYTES = 120 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const imagem = body?.imagem as string | undefined;

    if (!imagem || !imagem.startsWith("data:image/")) {
      return NextResponse.json({ error: "Nenhuma imagem válida enviada" }, { status: 400 });
    }

    const base64 = imagem.split(",")[1] || "";
    if (base64.length > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: "Imagem muito grande (máx. 120KB)" }, { status: 400 });
    }

    const supabase = await getSupabaseWithAuth();
    const userId = session.user.id;

    // Salva a foto na tabela perfil_foto (banco), não no metadata (evita JWT gigante)
    const { error: upsertError } = await supabase
      .from("perfil_foto")
      .upsert({ usuario_id: userId, avatar_base64: imagem }, { onConflict: "usuario_id" });

    if (upsertError) {
      console.error("[API/usuario/foto] Erro ao salvar foto:", upsertError);
      return NextResponse.json({ error: `Erro ao salvar foto: ${upsertError.message}` }, { status: 500 });
    }

    // Limpa o avatar do metadata (mantém o JWT/cookie pequeno)
    if (session.user.user_metadata?.avatar_url || session.user.user_metadata?.avatar_path) {
      await supabase.auth.updateUser({ data: { avatar_url: null, avatar_path: null } });
    }

    // Retroatualiza TODOS os lotes do usuário com a nova foto
    await supabase
      .from("lotes_geracao")
      .update({ criador_avatar_url: imagem })
      .eq("usuario_id", userId);

    return NextResponse.json({ ok: true, avatar_url: imagem });
  } catch (error) {
    console.error("[API/usuario/foto] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const supabase = await getSupabaseWithAuth();
    const userId = session.user.id;

    const { error } = await supabase.from("perfil_foto").delete().eq("usuario_id", userId);
    if (error) {
      console.error("[API/usuario/foto] Erro ao remover foto:", error);
      return NextResponse.json({ error: "Erro ao remover foto" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API/usuario/foto] Erro ao remover foto:", error);
    return NextResponse.json({ error: "Erro ao remover foto" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ avatar_url: null }, { status: 200 });
    }

    const supabase = await getSupabaseWithAuth();
    const userId = session.user.id;

    const { data } = await supabase
      .from("perfil_foto")
      .select("avatar_base64")
      .eq("usuario_id", userId)
      .single();

    // Se a tabela não tem foto mas o metadata tem (foto antiga), migra para a tabela e limpa metadata
    if (!data?.avatar_base64) {
      const metadataFoto = session.user.user_metadata?.avatar_url;
      if (metadataFoto && typeof metadataFoto === "string" && metadataFoto.startsWith("data:image/")) {
        await supabase
          .from("perfil_foto")
          .upsert({ usuario_id: userId, avatar_base64: metadataFoto }, { onConflict: "usuario_id" });
        await supabase.auth.updateUser({ data: { avatar_url: null, avatar_path: null } });
        return NextResponse.json({ avatar_url: metadataFoto }, { status: 200 });
      }
    }

    return NextResponse.json({ avatar_url: data?.avatar_base64 || null });
  } catch (error) {
    console.error("[API/usuario/foto] Erro ao buscar foto:", error);
    return NextResponse.json({ avatar_url: null }, { status: 200 });
  }
}