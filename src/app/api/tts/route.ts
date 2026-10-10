import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VOZ = "pt-BR-FranciscaNeural";
const MAX_TEXTO = 2000;

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const texto = req.nextUrl.searchParams.get("text")?.trim() ?? "";
    if (!texto) {
      return NextResponse.json({ error: "text obrigatório" }, { status: 400 });
    }
    if (texto.length > MAX_TEXTO) {
      return NextResponse.json({ error: "Texto muito longo (máx. 2000 caracteres)" }, { status: 400 });
    }

    const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
    const tts = new MsEdgeTTS();
    await tts.setMetadata(VOZ, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(texto);

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    tts.close();

    const audio = Buffer.concat(chunks);
    if (!audio.length) {
      return NextResponse.json({ error: "Áudio vazio" }, { status: 502 });
    }

    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.length),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[api/tts] erro:", error);
    return NextResponse.json({ error: "Erro ao sintetizar áudio" }, { status: 502 });
  }
}
