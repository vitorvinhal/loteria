import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { getSupabase } from "@/lib/db";
import { buscarResultado } from "@/modules/sync";

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

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const supabase = getSupabase();

    const { count } = await supabase
      .from("concursos")
      .select("id", { count: "exact", head: true })
      .eq("loteria_id", loteria.id);

    if (count && count > 0) {
      const offset = (page - 1) * limit;
      const { data: concursos, error } = await supabase
        .from("concursos")
        .select("*")
        .eq("loteria_id", loteria.id)
        .order("numero_concurso", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("[API] Erro ao buscar concursos:", error);
        return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 });
      }

      return NextResponse.json({
        concursos: concursos || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        source: "database",
      });
    }

    console.log("[API] Concursos vazios no DB, buscando da API externa...");
    const fallbackConcursos: Array<{
      id: string;
      numero_concurso: number;
      data_sorteio: string;
      dezenas_sorteadas: number[];
      acumulou: boolean;
      valor_acumulado: number | null;
      valor_estimado_proximo: number | null;
      premiacoes: unknown;
    }> = [];

    const startConcurso = Math.max(1, (page - 1) * limit + 1);
    const endConcurso = startConcurso + limit - 1;

    for (let num = startConcurso; num <= endConcurso; num++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 350));
        const { concurso } = await buscarResultado(loteria, num);
        if (concurso) {
          fallbackConcursos.push({
            id: concurso.id,
            numero_concurso: concurso.numero_concurso,
            data_sorteio: concurso.data_sorteio,
            dezenas_sorteadas: concurso.dezenas_sorteadas,
            acumulou: concurso.acumulou,
            valor_acumulado: concurso.valor_acumulado || null,
            valor_estimado_proximo: concurso.valor_estimado_proximo || null,
            premiacoes: concurso.premiacoes,
          });
        }
      } catch {
        break;
      }
    }

    const latestResult = await buscarResultado(loteria);
    const latestNum = latestResult.concurso?.numero_concurso || endConcurso + 50;

    return NextResponse.json({
      concursos: fallbackConcursos,
      total: latestNum,
      page,
      limit,
      totalPages: Math.ceil(latestNum / limit),
      source: "external_api",
    });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
