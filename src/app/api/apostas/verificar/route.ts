import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getUltimoConcurso } from "@/lib/db";
import { getSession } from "@/lib/supabase/auth/server";
import { getLoteriaPorSlug } from "@/lib/loterias";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { loteria_id, dezenas } = body;

    if (!loteria_id || !dezenas?.length) {
      return NextResponse.json(
        { error: "loteria_id e dezenas são obrigatórios" },
        { status: 400 }
      );
    }

    if (!Array.isArray(dezenas) || dezenas.some((d: unknown) => typeof d !== "number")) {
      return NextResponse.json(
        { error: "dezenas deve ser um array de números" },
        { status: 400 }
      );
    }

    const loteria = getLoteriaPorSlug(loteria_id);
    if (!loteria) {
      return NextResponse.json(
        { error: "Loteria não encontrada" },
        { status: 404 }
      );
    }

    const concurso = await getUltimoConcurso(loteria.id);
    if (!concurso) {
      return NextResponse.json(
        { error: "Nenhum concurso encontrado para esta loteria" },
        { status: 404 }
      );
    }

    const dezenasSet = new Set(dezenas);
    const sorteadasSet = new Set(concurso.dezenas_sorteadas);
    const acertos = Array.from(dezenasSet).filter((d) => sorteadasSet.has(d)).length;

    const ganhou = loteria.regras_vitoria.some(
      (regra) => acertos >= regra.acertos_min && acertos <= regra.acertos_max
    );

    let premio_estimado = 0;
    if (ganhou && concurso.premiacoes?.length) {
      const premiacao = concurso.premiacoes.find(
        (p) => acertos >= p.acertos && acertos <= p.acertos
      );
      if (premiacao && premiacao.ganhadores > 0) {
        premio_estimado = premiacao.premio;
      }
    }

    const supabase = getSupabase();
    await supabase.from("apostas").insert({
      usuario_id: session.user.id,
      loteria_id: loteria.id,
      dezenas: dezenas.sort((a: number, b: number) => a - b),
      valor_apostado: loteria.preco_aposta_base,
      resultado: {
        ganhou,
        acertos,
        total_dezenas: dezenas.length,
        dezenas_sorteadas: concurso.dezenas_sorteadas,
        concurso_numero: concurso.numero_concurso,
        detalhes: ganhou
          ? `Parabéns! Você acertou ${acertos} dezena(s)!`
          : `Você acertou ${acertos} dezena(s). Tente novamente!`,
      },
    });

    return NextResponse.json({
      acertos,
      ganhou,
      dezenas_sorteadas: concurso.dezenas_sorteadas,
      premio_estimado,
    });
  } catch (error) {
    console.error("[API/apostas/verificar] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
