import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { buscarResultado } from "@/modules/sync";
import { getSupabase } from "@/lib/db";

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

    const { concurso, fonte } = await buscarResultado(loteria);

    if (!concurso) {
      return NextResponse.json(
        { error: "Nenhum resultado encontrado" },
        { status: 404 }
      );
    }

    // Verificar se o concurso já existe
    const { data: existente } = await getSupabase()
      .from('concursos')
      .select('id')
      .eq('loteria_id', loteria.id)
      .eq('numero_concurso', concurso.numero_concurso)
      .single();

    if (!existente) {
      // Salvar novo concurso
      const { error } = await getSupabase()
        .from('concursos')
        .insert({
          loteria_id: loteria.id,
          numero_concurso: concurso.numero_concurso,
          data_sorteio: concurso.data_sorteio,
          dezenas_sorteadas: concurso.dezenas_sorteadas,
          acumulou: concurso.acumulou,
          valor_acumulado: concurso.valor_acumulado,
          valor_estimado_proximo: concurso.valor_estimado_proximo,
          data_proximo_concurso: concurso.data_proximo_concurso,
          local_sorteio: concurso.local_sorteio,
          premiacoes: concurso.premiacoes,
          raw_response: concurso.raw_response,
        });

      if (error) {
        console.error("[API] Erro ao salvar concurso:", error);
      }
    }

    return NextResponse.json({ concurso, fonte });
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
