import { Loteria, Estatisticas, ScoreBreakdown } from '@/types';

export interface ConfigScoring {
  pesos: {
    frequencia: number;
    atraso: number;
    par_impar: number;
    soma: number;
    distribuicao: number;
    exclusao_padroes: number;
    aderencia_estrategia: number;
  };
}

const PESOS_PADRAO: ConfigScoring['pesos'] = {
  frequencia: 0.15,
  atraso: 0.15,
  par_impar: 0.15,
  soma: 0.15,
  distribuicao: 0.15,
  exclusao_padroes: 0.10,
  aderencia_estrategia: 0.15,
};

export function calcularScore(
  dezenas: number[],
  loteria: Loteria,
  estatisticas: Estatisticas,
  indicadores: Record<string, number> = {},
  config?: Partial<ConfigScoring>
): ScoreBreakdown {
  const pesos = { ...PESOS_PADRAO, ...config?.pesos };

  const scoreFrequencia = calcularScoreFrequencia(dezenas, estatisticas);
  const scoreAtraso = calcularScoreAtraso(dezenas, estatisticas);
  const scoreParImpar = calcularScoreParImpar(dezenas, loteria);
  const scoreSoma = calcularScoreSoma(dezenas, loteria, estatisticas);
  const scoreDistribuicao = calcularScoreDistribuicao(dezenas, loteria, estatisticas);
  const scoreExclusao = calcularScoreExclusao(dezenas, loteria);
  const scoreAderencia = calcularScoreAderencia(indicadores);

  const total =
    scoreFrequencia * pesos.frequencia +
    scoreAtraso * pesos.atraso +
    scoreParImpar * pesos.par_impar +
    scoreSoma * pesos.soma +
    scoreDistribuicao * pesos.distribuicao +
    scoreExclusao * pesos.exclusao_padroes +
    scoreAderencia * pesos.aderencia_estrategia;

  return {
    frequencia: Math.round(scoreFrequencia * 100) / 100,
    atraso: Math.round(scoreAtraso * 100) / 100,
    par_impar: Math.round(scoreParImpar * 100) / 100,
    soma: Math.round(scoreSoma * 100) / 100,
    distribuicao: Math.round(scoreDistribuicao * 100) / 100,
    exclusao_padroes: Math.round(scoreExclusao * 100) / 100,
    aderencia_estrategia: Math.round(scoreAderencia * 100) / 100,
    pesos,
    total: Math.round(Math.min(100, Math.max(0, total * 100))),
  };
}

function calcularScoreFrequencia(dezenas: number[], estatisticas: Estatisticas): number {
  let somaFrequencia = 0;
  let count = 0;

  dezenas.forEach(dezena => {
    const freq = estatisticas.frequencia_percentual.get(dezena) || 0;
    somaFrequencia += freq;
    count++;
  });

  if (count === 0) return 0;
  const mediaFrequencia = somaFrequencia / count;
  return Math.min(1, mediaFrequencia / 10);
}

function calcularScoreAtraso(dezenas: number[], estatisticas: Estatisticas): number {
  let somaAtraso = 0;
  let count = 0;

  dezenas.forEach(dezena => {
    const atraso = estatisticas.atraso.get(dezena) || 0;
    somaAtraso += atraso;
    count++;
  });

  if (count === 0) return 0;
  const mediaAtraso = somaAtraso / count;
  const maxAtraso = Math.max(...Array.from(estatisticas.atraso.values()));
  return maxAtraso > 0 ? Math.min(1, mediaAtraso / maxAtraso) : 0;
}

function calcularScoreParImpar(dezenas: number[], loteria: Loteria): number {
  const pares = dezenas.filter(d => d % 2 === 0).length;
  const impares = dezenas.length - pares;
  const total = dezenas.length;

  if (total === 0) return 0;

  const ratio = pares / total;
  const ideal = 0.5;
  const desvio = Math.abs(ratio - ideal);

  return Math.max(0, 1 - desvio * 2);
}

function calcularScoreSoma(
  dezenas: number[],
  loteria: Loteria,
  estatisticas: Estatisticas
): number {
  const soma = dezenas.reduce((acc, d) => acc + d, 0);
  const { min, max, media, desvio_padrao } = estatisticas.soma_concursos;

  if (max === min) return 0.5;

  const zScore = desvio_padrao > 0 ? Math.abs(soma - media) / desvio_padrao : 0;
  return Math.max(0, 1 - zScore / 3);
}

function calcularScoreDistribuicao(
  dezenas: number[],
  loteria: Loteria,
  estatisticas: Estatisticas
): number {
  const quadrantes = new Map<number, number>();
  const totalQuadrantes = 4;

  dezenas.forEach(dezena => {
    const total = loteria.universo_max - loteria.universo_min + 1;
    const tamanhoQuadrante = Math.ceil(total / totalQuadrantes);
    const normalizado = dezena - loteria.universo_min;
    const quadrante = Math.floor(normalizado / tamanhoQuadrante) + 1;
    quadrantes.set(quadrante, (quadrantes.get(quadrante) || 0) + 1);
  });

  const cobertos = quadrantes.size;
  return cobertos / totalQuadrantes;
}

function calcularScoreExclusao(dezenas: number[], loteria: Loteria): number {
  let score = 1.0;

  const ordenadas = [...dezenas].sort((a, b) => a - b);

  let sequenciaMax = 1;
  let sequenciaAtual = 1;
  for (let i = 1; i < ordenadas.length; i++) {
    if (ordenadas[i] === ordenadas[i - 1] + 1) {
      sequenciaAtual++;
      sequenciaMax = Math.max(sequenciaMax, sequenciaAtual);
    } else {
      sequenciaAtual = 1;
    }
  }

  if (sequenciaMax >= 4) score *= 0.3;
  else if (sequenciaMax >= 3) score *= 0.6;
  else if (sequenciaMax >= 2) score *= 0.8;

  const saoMultiplos = ordenadas.every(d => d % ordenadas[0] === 0);
  if (saoMultiplos && ordenadas.length > 2) score *= 0.5;

  const todosMesmaTerminacao = ordenadas.every(d => d % 10 === ordenadas[0] % 10);
  if (todosMesmaTerminacao && ordenadas.length > 3) score *= 0.4;

  return Math.max(0, Math.min(1, score));
}

function calcularScoreAderencia(indicadores: Record<string, number>): number {
  const valores = Object.values(indicadores);
  if (valores.length === 0) return 0.5;

  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  return Math.min(1, Math.max(0, media));
}

export function gerarExplicacaoScore(
  breakdown: ScoreBreakdown,
  loteria: Loteria
): string {
  const partes: string[] = [];

  if (breakdown.frequencia > 0.7) {
    partes.push('Dezenas com boa frequência recente');
  } else if (breakdown.frequencia < 0.3) {
    partes.push('Dezenas com frequência abaixo da média');
  }

  if (breakdown.atraso > 0.7) {
    partes.push('Dezenas com alto atraso (não saem há tempo)');
  } else if (breakdown.atraso < 0.3) {
    partes.push('Dezenas com baixo atraso (saíram recentemente)');
  }

  if (breakdown.par_impar > 0.8) {
    partes.push('Excelente equilíbrio par/ímpar');
  } else if (breakdown.par_impar < 0.4) {
    partes.push('Distribuição par/ímpar abaixo do ideal');
  }

  if (breakdown.soma > 0.8) {
    partes.push('Soma dentro da faixa mais frequente');
  } else if (breakdown.soma < 0.3) {
    partes.push('Soma fora da faixa estatisticamente comum');
  }

  if (breakdown.distribuicao > 0.8) {
    partes.push('Boa distribuição pelo volante');
  } else if (breakdown.distribuicao < 0.4) {
    partes.push('Concentração excessiva em uma região do volante');
  }

  if (breakdown.exclusao_padroes > 0.8) {
    partes.push('Ausência de padrões óbvios');
  } else if (breakdown.exclusao_padroes < 0.4) {
    partes.push('Possui padrões visuais comuns entre apostadores');
  }

  if (partes.length === 0) {
    return `Score de ${breakdown.total}/100 de aderência aos padrões estatísticos e equilíbrio combinatório para ${loteria.nome}.`;
  }

  return `${breakdown.total}/100 — ${partes.join('; ')}.`;
}
