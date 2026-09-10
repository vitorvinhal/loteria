import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { calcularScore, gerarExplicacaoScore } from "@/modules/scoring";
import { Estatisticas } from "@/types";

interface AnalisarRequest {
  dezenas: number[];
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

    const body: AnalisarRequest = await request.json();
    const { dezenas } = body;

    if (!dezenas?.length) {
      return NextResponse.json(
        { error: "Dezenas são obrigatórias" },
        { status: 400 }
      );
    }

    const invalidas = dezenas.filter(
      d => d < loteria.universo_min || d > loteria.universo_max
    );
    if (invalidas.length > 0) {
      return NextResponse.json(
        { error: `Dezenas inválidas para ${loteria.nome}: ${invalidas.join(', ')}` },
        { status: 400 }
      );
    }

    const score = calcularScore(dezenas, loteria, statsVazias);
    const explicacao = gerarExplicacaoScore(score, loteria);

    const soma = dezenas.reduce((a, b) => a + b, 0);
    const media = Math.round(soma / dezenas.length);
    const pares = dezenas.filter(d => d % 2 === 0).length;
    const impares = dezenas.length - pares;

    const total = loteria.universo_max - loteria.universo_min + 1;
    const tamanhoQuadrante = Math.ceil(total / 4);
    const quadrantes = new Set(
      dezenas.map(d => Math.floor((d - loteria.universo_min) / tamanhoQuadrante))
    );

    let sequencias = 0;
    let sequenciaAtual = 1;
    const ordenadas = [...dezenas].sort((a, b) => a - b);
    for (let i = 1; i < ordenadas.length; i++) {
      if (ordenadas[i] === ordenadas[i - 1] + 1) {
        sequenciaAtual++;
      } else {
        if (sequenciaAtual > 1) sequencias++;
        sequenciaAtual = 1;
      }
    }
    if (sequenciaAtual > 1) sequencias++;

    const spread = ordenadas[ordenadas.length - 1] - ordenadas[0];

    return NextResponse.json({
      dezenas: ordenadas,
      score: score.total,
      breakdown: {
        frequencia: score.frequencia,
        atraso: score.atraso,
        par_impar: score.par_impar,
        soma: score.soma,
        distribuicao: score.distribuicao,
        exclusao_padroes: score.exclusao_padroes,
        aderencia_estrategia: score.aderencia_estrategia,
        total: score.total,
      },
      explicacao,
      estatisticas: {
        soma,
        media,
        pares,
        impares,
        quadrantes_cobertos: quadrantes.size,
        sequencias,
        spread,
      },
    });
  } catch (error) {
    console.error("[API] Erro na análise:", error);
    return NextResponse.json(
      { error: "Erro ao analisar jogo" },
      { status: 500 }
    );
  }
}
