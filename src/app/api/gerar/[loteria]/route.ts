import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { getEstrategiasAtivas, getEstrategiaPorSlug } from "@/modules/strategies";
import { funcoesEstrategias } from "@/modules/strategies/implementations";
import { calcularScore } from "@/modules/scoring";
import { Loteria, Estatisticas } from "@/types";

interface GerarRequest {
  estrategia: string;
  quantidade: number;
  score_minimo?: number;
}

const statsVazias: Estatisticas = {
  frequencia: new Map(),
  frequencia_percentual: new Map(),
  atraso: new Map(),
  distribuicao_par_impar: [],
  soma_concursos: { min: 0, max: 100, media: 50, desvio_padrao: 20, faixa_frequente: [30, 70] },
  distribuicao_quadrantes: new Map(),
  repeticao_entre_concursos: [],
  sequencias_consecutivas: [],
  terminacoes: new Map(),
};

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

    const body: GerarRequest = await request.json();
    const { estrategia, quantidade, score_minimo = 0 } = body;

    if (!estrategia || quantidade < 1 || quantidade > 100) {
      return NextResponse.json(
        { error: "Parâmetros inválidos" },
        { status: 400 }
      );
    }

    const estrategiaConfig = getEstrategiaPorSlug(estrategia);
    if (!estrategiaConfig) {
      return NextResponse.json(
        { error: "Estratégia não encontrada" },
        { status: 404 }
      );
    }

    const funcao = funcoesEstrategias[estrategia];
    if (!funcao) {
      return NextResponse.json(
        { error: "Estratégia não implementada" },
        { status: 500 }
      );
    }

    const jogos: Array<{
      dezenas: number[];
      score: number;
      breakdown: Record<string, unknown>;
    }> = [];

    let tentativas = 0;
    const maxTentativas = 50000;
    const timeout = 30000;
    const inicio = Date.now();

    while (jogos.length < quantidade && tentativas < maxTentativas && Date.now() - inicio < timeout) {
      tentativas++;
      const resultado = funcao(loteria, statsVazias, estrategiaConfig.parametros_padrao);
      const score = calcularScore(resultado.dezenas, loteria, statsVazias, resultado.indicadores);

      if (score.total >= score_minimo) {
        jogos.push({
          dezenas: resultado.dezenas,
          score: score.total,
          breakdown: score as unknown as Record<string, unknown>,
        });
      }
    }

    jogos.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      jogos,
      total_gerados: jogos.length,
      total_solicitado: quantidade,
      score_minimo,
      tempo_execucao_ms: Date.now() - inicio,
      tentativas,
      score_relaxado: jogos.length < quantidade,
    });
  } catch (error) {
    console.error("[API] Erro na geração:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
