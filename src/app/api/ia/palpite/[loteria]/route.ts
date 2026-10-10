import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { buscarEstatisticasReais } from "@/modules/generation";
import { gerarPalpiteForte } from "@/modules/generation/palpite";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ loteria: string }> }
) {
  try {
    const { loteria: slug } = await params;
    const loteria = getLoteriaPorSlug(slug);
    if (!loteria) {
      return NextResponse.json({ error: "Loteria não encontrada" }, { status: 404 });
    }

    const stats = await buscarEstatisticasReais(loteria);
    const palpite = gerarPalpiteForte(loteria, stats);

    return NextResponse.json({
      loteria: loteria.slug,
      nome: loteria.nome,
      ...palpite,
    });
  } catch (error) {
    console.error("[API/ia/palpite] Erro:", error);
    return NextResponse.json({ error: "Erro ao calcular o palpite" }, { status: 500 });
  }
}
