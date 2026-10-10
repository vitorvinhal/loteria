import { NextRequest, NextResponse } from "next/server";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const MIME_OK = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const form = await req.formData().catch(() => null);
    const arquivo = form?.get("arquivo");
    if (!(arquivo instanceof File)) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }
    if (arquivo.size > MAX_BYTES) {
      return NextResponse.json({ error: "Arquivo muito grande (máx. 10MB)" }, { status: 400 });
    }
    if (!MIME_OK.has(arquivo.type)) {
      return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 400 });
    }

    const uid = session.user.id;
    const ext = arquivo.name.includes(".")
      ? arquivo.name.split(".").pop()!.toLowerCase().slice(0, 8)
      : "bin";
    const caminho = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const supabase = await getSupabaseWithAuth();
    const { error } = await supabase.storage
      .from("assistant-attachments")
      .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
    if (error) {
      console.error("[assistant/upload] erro no upload:", error);
      return NextResponse.json({ error: `Erro no upload: ${error.message}` }, { status: 500 });
    }

    const { data } = supabase.storage.from("assistant-attachments").getPublicUrl(caminho);
    return NextResponse.json({
      url: data.publicUrl,
      nome: arquivo.name.slice(0, 120),
      mime: arquivo.type,
    });
  } catch (error) {
    console.error("[assistant/upload] erro geral:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
