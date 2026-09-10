import { Concurso, Loteria, Estatisticas } from '@/types';

export function calcularEstatisticas(
  concursos: Concurso[],
  loteria: Loteria,
  janela?: number
): Estatisticas {
  const concursosParaAnalise = janela
    ? concursos.slice(-janela)
    : concursos;

  if (concursosParaAnalise.length === 0) {
    return criarEstatisticasVazias(loteria);
  }

  const frequencia = new Map<number, number>();
  const atraso = new Map<number, number>();
  const distribuicaoParImpar: { par: number; impar: number }[] = [];
  const somaConcursos: number[] = [];
  const distribuicaoQuadrantes = new Map<number, number>();
  const repeticaoEntreConcursos: number[] = [];
  const sequenciasConsecutivas: number[] = [];
  const terminacoes = new Map<number, number>();

  const universo = gerarUniverso(loteria);
  universo.forEach(n => {
    frequencia.set(n, 0);
    atraso.set(n, concursosParaAnalise.length);
    distribuicaoQuadrantes.set(obterQuadrante(n, loteria), 0);
  });

  let concursoAnterior: number[] | null = null;

  concursosParaAnalise.forEach((concurso, index) => {
    const dezenas = concurso.dezenas_sorteadas;

    dezenas.forEach(dezena => {
      frequencia.set(dezena, (frequencia.get(dezena) || 0) + 1);
      atraso.set(dezena, index);
      distribuicaoQuadrantes.set(
        obterQuadrante(dezena, loteria),
        (distribuicaoQuadrantes.get(obterQuadrante(dezena, loteria)) || 0) + 1
      );
      const terminacao = dezena % 10;
      terminacoes.set(terminacao, (terminacoes.get(terminacao) || 0) + 1);
    });

    const pares = dezenas.filter(d => d % 2 === 0).length;
    const impares = dezenas.length - pares;
    distribuicaoParImpar.push({ par: pares, impar: impares });

    const soma = dezenas.reduce((acc, d) => acc + d, 0);
    somaConcursos.push(soma);

    if (concursoAnterior) {
      const repetidas = dezenas.filter(d => concursoAnterior!.includes(d)).length;
      repeticaoEntreConcursos.push(repetidas);

      const ordenadas = [...dezenas].sort((a, b) => a - b);
      let seqAtual = 1;
      for (let i = 1; i < ordenadas.length; i++) {
        if (ordenadas[i] === ordenadas[i - 1] + 1) {
          seqAtual++;
        } else {
          if (seqAtual >= 2) sequenciasConsecutivas.push(seqAtual);
          seqAtual = 1;
        }
      }
      if (seqAtual >= 2) sequenciasConsecutivas.push(seqAtual);
    }

    concursoAnterior = dezenas;
  });

  const somaMin = Math.min(...somaConcursos);
  const somaMax = Math.max(...somaConcursos);
  const somaMedia = somaConcursos.reduce((a, b) => a + b, 0) / somaConcursos.length;
  const somaDesvio = Math.sqrt(
    somaConcursos.reduce((acc, s) => acc + Math.pow(s - somaMedia, 2), 0) / somaConcursos.length
  );

  const faixaFrequente = calcularFaixaFrequente(somaConcursos);

  const frequenciaPercentual = new Map<number, number>();
  const totalDezenas = concursosParaAnalise.length * dezenasPorConcurso(loteria);
  frequencia.forEach((count, dezena) => {
    frequenciaPercentual.set(dezena, (count / totalDezenas) * 100);
  });

  return {
    frequencia,
    frequencia_percentual: frequenciaPercentual,
    atraso,
    distribuicao_par_impar: distribuicaoParImpar,
    soma_concursos: {
      min: somaMin,
      max: somaMax,
      media: somaMedia,
      desvio_padrao: somaDesvio,
      faixa_frequente: faixaFrequente,
    },
    distribuicao_quadrantes: distribuicaoQuadrantes,
    repeticao_entre_concursos: repeticaoEntreConcursos,
    sequencias_consecutivas: sequenciasConsecutivas,
    terminacoes,
  };
}

function criarEstatisticasVazias(loteria: Loteria): Estatisticas {
  const frequencia = new Map<number, number>();
  const atraso = new Map<number, number>();
  const distribuicaoQuadrantes = new Map<number, number>();
  const terminacoes = new Map<number, number>();

  const universo = gerarUniverso(loteria);
  universo.forEach(n => {
    frequencia.set(n, 0);
    atraso.set(n, 0);
    distribuicaoQuadrantes.set(obterQuadrante(n, loteria), 0);
  });

  return {
    frequencia,
    frequencia_percentual: new Map(),
    atraso,
    distribuicao_par_impar: [],
    soma_concursos: { min: 0, max: 0, media: 0, desvio_padrao: 0, faixa_frequente: [0, 0] },
    distribuicao_quadrantes: distribuicaoQuadrantes,
    repeticao_entre_concursos: [],
    sequencias_consecutivas: [],
    terminacoes,
  };
}

function gerarUniverso(loteria: Loteria): number[] {
  const universo: number[] = [];
  for (let i = loteria.universo_min; i <= loteria.universo_max; i++) {
    universo.push(i);
  }
  return universo;
}

function dezenasPorConcurso(loteria: Loteria): number {
  return loteria.qtd_dezenas_padrao;
}

function obterQuadrante(numero: number, loteria: Loteria): number {
  const total = loteria.universo_max - loteria.universo_min + 1;
  const tamanhoQuadrante = Math.ceil(total / 4);
  const normalizado = numero - loteria.universo_min;
  return Math.floor(normalizado / tamanhoQuadrante) + 1;
}

function calcularFaixaFrequente(somas: number[]): [number, number] {
  if (somas.length === 0) return [0, 0];

  const ordenadas = [...somas].sort((a, b) => a - b);
  const q1 = ordenadas[Math.floor(ordenadas.length * 0.25)];
  const q3 = ordenadas[Math.floor(ordenadas.length * 0.75)];

  return [q1, q3];
}

export function calcularFrequenciaEmJanela(
  concursos: Concurso[],
  janela: number
): Map<number, number> {
  const frequencia = new Map<number, number>();
  const recentes = concursos.slice(-janela);

  recentes.forEach(concurso => {
    concurso.dezenas_sorteadas.forEach(dezena => {
      frequencia.set(dezena, (frequencia.get(dezena) || 0) + 1);
    });
  });

  return frequencia;
}

export function calcularAtrasoAtual(
  concursos: Concurso[],
  universoMin: number,
  universoMax: number
): Map<number, number> {
  const atraso = new Map<number, number>();

  for (let i = universoMin; i <= universoMax; i++) {
    atraso.set(i, concursos.length);
  }

  concursos.forEach((concurso, index) => {
    concurso.dezenas_sorteadas.forEach(dezena => {
      atraso.set(dezena, index);
    });
  });

  return atraso;
}
