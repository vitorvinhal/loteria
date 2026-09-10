"use server";

import { revalidatePath } from "next/cache";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { funcoesEstrategias } from "@/modules/strategies/implementations";
import { calcularScore } from "@/modules/scoring";
import { Estatisticas } from "@/types";

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

export interface GerarResultado {
  success: boolean;
  jogos?: Array<{
    dezenas: number[];
    score: number;
    breakdown: Record<string, unknown>;
  }>;
  error?: string;
  metadata?: {
    total_gerados: number;
    tempo_execucao_ms: number;
    tentativas: number;
  };
}

export async function gerarJogos(
  loteriaSlug: string,
  estrategiaSlug: string,
  quantidade: number,
  scoreMinimo: number
): Promise<GerarResultado> {
  try {
    const loteria = getLoteriaPorSlug(loteriaSlug);
    if (!loteria) {
      return { success: false, error: "Loteria não encontrada" };
    }

    const funcao = funcoesEstrategias[estrategiaSlug];
    if (!funcao) {
      return { success: false, error: "Estratégia não encontrada" };
    }

    const jogos: Array<{
      dezenas: number[];
      score: number;
      breakdown: Record<string, unknown>;
    }> = [];

    let tentativas = 0;
    const maxTentativas = 50000;
    const inicio = Date.now();

    while (jogos.length < quantidade && tentativas < maxTentativas && Date.now() - inicio < 30000) {
      tentativas++;
      const resultado = funcao(loteria, statsVazias, {});
      const score = calcularScore(resultado.dezenas, loteria, statsVazias, resultado.indicadores);

      if (score.total >= scoreMinimo) {
        jogos.push({
          dezenas: resultado.dezenas,
          score: score.total,
          breakdown: score as unknown as Record<string, unknown>,
        });
      }
    }

    jogos.sort((a, b) => b.score - a.score);

    revalidatePath(`/gerar/${loteriaSlug}`);

    return {
      success: true,
      jogos,
      metadata: {
        total_gerados: jogos.length,
        tempo_execucao_ms: Date.now() - inicio,
        tentativas,
      },
    };
  } catch (error) {
    console.error("[Server Action] Erro na geração:", error);
    return { success: false, error: "Erro interno ao gerar jogos" };
  }
}

export interface AnalisarResultado {
  success: boolean;
  analise?: {
    score: number;
    explicacao: string;
    soma: number;
    pares: number;
    impares: number;
    quadrantes_cobertos: number;
    sequencia_maxima: number;
  };
  error?: string;
}

export async function analisarJogo(
  loteriaSlug: string,
  dezenas: number[]
): Promise<AnalisarResultado> {
  try {
    const loteria = getLoteriaPorSlug(loteriaSlug);
    if (!loteria) {
      return { success: false, error: "Loteria não encontrada" };
    }

    const score = calcularScore(dezenas, loteria, statsVazias);

    const soma = dezenas.reduce((a, b) => a + b, 0);
    const pares = dezenas.filter(d => d % 2 === 0).length;

    const total = loteria.universo_max - loteria.universo_min + 1;
    const tamanhoQuadrante = Math.ceil(total / 4);
    const quadrantes = new Set(
      dezenas.map(d => Math.floor((d - loteria.universo_min) / tamanhoQuadrante))
    );

    let sequenciaMax = 1;
    let sequenciaAtual = 1;
    const ordenadas = [...dezenas].sort((a, b) => a - b);
    for (let i = 1; i < ordenadas.length; i++) {
      if (ordenadas[i] === ordenadas[i - 1] + 1) {
        sequenciaAtual++;
        sequenciaMax = Math.max(sequenciaMax, sequenciaAtual);
      } else {
        sequenciaAtual = 1;
      }
    }

    const explicacao = `Score ${score.total}/100 — Soma: ${soma}, Pares: ${pares}, Ímpares: ${dezenas.length - pares}, Quadrantes: ${quadrantes.size}/4, Sequência máxima: ${sequenciaMax}.`;

    return {
      success: true,
      analise: {
        score: score.total,
        explicacao,
        soma,
        pares,
        impares: dezenas.length - pares,
        quadrantes_cobertos: quadrantes.size,
        sequencia_maxima: sequenciaMax,
      },
    };
  } catch (error) {
    console.error("[Server Action] Erro na análise:", error);
    return { success: false, error: "Erro interno ao analisar jogo" };
  }
}
