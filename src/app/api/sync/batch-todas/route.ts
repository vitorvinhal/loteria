import { NextRequest, NextResponse } from "next/server";
import { getLoteriasAtivas } from "@/lib/loterias";
import { buscarResultado } from "@/modules/sync";
import { getSupabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
  const porLoteria = Math.max(1, Number(body?.porLoteria) || 50);

    const loterias = getLoteriasAtivas();
    const supabase = getSupabase();
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    let dbAvailable = true;
    try {
      const { error: testError } = await supabase
        .from("concursos")
        .select("id", { count: "exact", head: true })
        .limit(0);
      if (testError) dbAvailable = false;
    } catch {
      dbAvailable = false;
    }

    const resultados: Record<string, { salvos: number; skips: number; erros: number; ultimoConcurso: number | null }> = {};

    for (const loteria of loterias) {
      const stats = { salvos: 0, skips: 0, erros: 0, ultimoConcurso: null as number | null };
      const { concurso } = await buscarResultado(loteria);
      if (concurso) {
        stats.ultimoConcurso = concurso.numero_concurso;
        if (dbAvailable) {
          const { data: existente } = await supabase
            .from("concursos")
            .select("id")
            .eq("loteria_id", loteria.id)
            .eq("numero_concurso", concurso.numero_concurso)
            .single();
          if (!existente) {
            const { error } = await supabase.from("concursos").insert({
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
              stats.erros++;
            } else {
              stats.salvos++;
            }
          } else {
            stats.skips++;
          }
        } else {
          stats.salvos++;
        }
      }
      resultados[loteria.slug] = stats;
      await delay(250);
    }

    return NextResponse.json({
      ok: true,
      totalLoterias: loterias.length,
      resultados,
      dbAvailable,
    });
  } catch (error) {
    console.error("[BatchTodas] Erro geral:", error);
    return NextResponse.json({ error: "Erro ao sincronizar todas as loterias" }, { status: 500 });
  }
}