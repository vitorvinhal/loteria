import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { buscarResultado, sincronizarLoteria } from "@/modules/sync";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ loteria: string }> }
) {
  try {
    const { loteria: slug } = await params;
    const loteria = getLoteriaPorSlug(slug);

    if (!loteria) {
      return NextResponse.json(
        { error: "Loteria não encontrada" },
        { status: 404 }
      );
    }

    const resultado = await sincronizarLoteria(loteria);

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("[API] Erro na sincronização:", error);
    return NextResponse.json(
      { error: "Erro ao sincronizar dados" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ loteria: string }> }
) {
  try {
    const { loteria: slug } = await params;
    const loteria = getLoteriaPorSlug(slug);

    if (!loteria) {
      return NextResponse.json(
        { error: "Loteria não encontrada" },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const numero = searchParams.get("numero");

    const { concurso, fonte } = await buscarResultado(
      loteria,
      numero ? parseInt(numero) : undefined
    );

    if (!concurso) {
      return NextResponse.json(
        { error: "Nenhum resultado encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ concurso, fonte });
  } catch (error) {
    console.error("[API] Erro ao buscar resultado:", error);
    return NextResponse.json(
      { error: "Erro ao buscar resultado" },
      { status: 500 }
    );
  }
}
