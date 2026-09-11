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
      return NextResponse.json({ error: "Loteria não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const { start, end } = body;

    if (typeof start !== "number" || typeof end !== "number" || start > end) {
      return NextResponse.json({ error: "Parâmetros start/end inválidos" }, { status: 400 });
    }

    // Sem limite fixo: permite sincronizar faixas arbitrárias.
    // O serverless tem timeout, então o frontend divide em chunks.

    const supabase = getSupabase();
    let saved = 0;
    let skipped = 0;
    let errors = 0;
    const errorsList: number[] = [];

    let dbAvailable = true;
    try {
      const { error: testError } = await supabase
        .from("concursos")
        .select("id", { count: "exact", head: true })
        .limit(0);
      if (testError) {
        dbAvailable = false;
        console.warn("[Batch] DB não disponível:", testError.message);
      }
    } catch {
      dbAvailable = false;
    }

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let numero = start; numero <= end; numero++) {
      try {
        if (dbAvailable) {
          const { data: existente } = await supabase
            .from("concursos")
            .select("id")
            .eq("loteria_id", loteria.id)
            .eq("numero_concurso", numero)
            .single();

          if (existente) {
            skipped++;
            continue;
          }
        }

        const { concurso } = await buscarResultado(loteria, numero);

        if (!concurso) {
          // Concurso não existe na API externa: não é erro, apenas indisponível
          skipped++;
          continue;
        }

        if (dbAvailable) {
          const { error: insertError } = await supabase
            .from("concursos")
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

          if (insertError) {
            console.error(`[Batch] Erro ao salvar concurso ${numero}:`, insertError.message);
            if (insertError.message?.includes("foreign key") || insertError.message?.includes("loteria")) {
              dbAvailable = false;
              console.warn("[Batch] Tabela loterias indisponível, continuando sem salvar...");
            }
            errors++;
            errorsList.push(numero);
          } else {
            saved++;
          }
        } else {
          saved++;
        }
      } catch (err) {
        console.error(`[Batch] Erro ao processar concurso ${numero}:`, err);
        // Erro de rede/throttle: não é "indisponível", registra como erro
        // mas sem estourar a lista de erros para faixas grandes
        if (errorsList.length < 200) errorsList.push(numero);
      }
    }

    return NextResponse.json({
      total: end - start + 1,
      saved,
      skipped,
      errors,
      errorsList,
      start,
      end,
      dbAvailable,
    });
  } catch (error) {
    console.error("[Batch] Erro geral:", error);
    return NextResponse.json({ error: "Erro ao processar sincronização em lote" }, { status: 500 });
  }
}
