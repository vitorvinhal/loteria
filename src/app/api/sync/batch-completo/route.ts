import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug, getLoteriasAtivas } from "@/lib/loterias";
import { buscarHistoricoCompleto } from "@/modules/sync";
import { getSupabase } from "@/lib/db";

interface ConcursoRow {
  id: string;
  loteria_id: string;
  numero_concurso: number;
  data_sorteio: string;
  dezenas_sorteadas: number[];
  acumulou: boolean;
  valor_acumulado: number;
  valor_estimado_proximo: number;
  data_proximo_concurso: string;
  local_sorteio: string;
  premiacoes: unknown;
  raw_response: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const slugAlvo = body?.slug as string | undefined;

    const loterias = slugAlvo ? (() => {
      const l = getLoteriaPorSlug(slugAlvo);
      return l ? [l] : [];
    })() : getLoteriasAtivas();

    if (loterias.length === 0) {
      return NextResponse.json({ error: "Loteria não encontrada" }, { status: 404 });
    }

    const supabase = getSupabase();

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

    const resultados: Record<string, { total: number; novos: number; existentes: number; erros: number; fonte: string }> = {};

    const TAMANHO_BLOCO = Number(process.env.BATCH_BLOCK_SIZE) || 400;

    for (const loteria of loterias) {
      const { concursos, fonte } = await buscarHistoricoCompleto(loteria);
      const stats = { total: concursos.length, novos: 0, existentes: 0, erros: 0, fonte };

      if (dbAvailable && concursos.length > 0) {
        // Busca os números já existentes na loteria
        const { data: existentes } = await supabase
          .from("concursos")
          .select("numero_concurso")
          .eq("loteria_id", loteria.id);
        const existentesSet = new Set((existentes || []).map(r => r.numero_concurso));

        const linhas: ConcursoRow[] = concursos
          .filter(c => !existentesSet.has(c.numero_concurso))
          .map((c) => ({
            id: c.id,
            loteria_id: loteria.id,
            numero_concurso: c.numero_concurso,
            data_sorteio: c.data_sorteio,
            dezenas_sorteadas: c.dezenas_sorteadas,
            acumulou: c.acumulou,
            valor_acumulado: c.valor_acumulado,
            valor_estimado_proximo: c.valor_estimado_proximo,
            data_proximo_concurso: c.data_proximo_concurso,
            local_sorteio: c.local_sorteio,
            premiacoes: c.premiacoes,
            raw_response: c.raw_response,
          }));

        stats.existentes = concursos.length - linhas.length;

        for (let i = 0; i < linhas.length; i += TAMANHO_BLOCO) {
          const bloco = linhas.slice(i, i + TAMANHO_BLOCO);
          try {
            const { error } = await supabase
              .from("concursos")
              .insert(bloco);
            if (error) {
              stats.erros += bloco.length;
              console.error(`[BatchCompleto] Erro bloco ${loteria.slug}:`, error.message);
            } else {
              stats.novos += bloco.length;
            }
          } catch {
            stats.erros += bloco.length;
          }
        }
      } else if (dbAvailable) {
        stats.erros = concursos.length;
      }

      resultados[loteria.slug] = stats;
    }

    const totalNovos = Object.values(resultados).reduce((s, r) => s + r.novos, 0);
    const totalExistentes = Object.values(resultados).reduce((s, r) => s + r.existentes, 0);

    return NextResponse.json({
      ok: true,
      totalLoterias: loterias.length,
      totalNovos,
      totalExistentes,
      resultados,
      dbAvailable,
    });
  } catch (error) {
    console.error("[BatchCompleto] Erro geral:", error);
    return NextResponse.json({ error: "Erro ao sincronizar histórico completo" }, { status: 500 });
  }
}