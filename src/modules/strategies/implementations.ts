import { Loteria, Estatisticas } from '@/types';
import { ResultadoGeracao, FuncaoEstrategia } from './index';

export const funcoesEstrategias: Record<string, FuncaoEstrategia> = {
  quentes: gerarQuentes,
  frias: gerarFrias,
  par_impar: gerarParImpar,
  soma: gerarSoma,
  quadrantes: gerarQuadrantes,
  delta: gerarDelta,
  exclusao_padroes: gerarExclusaoPadroes,
  repeticao_controlada: gerarRepeticaoControlada,
};

function gerarQuentes(
  loteria: Loteria,
  estatisticas: Estatisticas,
  parametros: Record<string, unknown>
): ResultadoGeracao {
  const janela = (parametros.janela as number) || 25;
  const dezenasNecessarias = loteria.qtd_dezenas_padrao;

  const ordenadas = Array.from(estatisticas.frequencia.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([dezena]) => dezena);

  const dezenas = ordenadas.slice(0, dezenasNecessarias).sort((a, b) => a - b);

  return {
    dezenas,
    indicadores: { frequencia_media: calcularMediaFrequencia(dezenas, estatisticas) },
  };
}

function gerarFrias(
  loteria: Loteria,
  estatisticas: Estatisticas,
  _parametros: Record<string, unknown>
): ResultadoGeracao {
  const dezenasNecessarias = loteria.qtd_dezenas_padrao;

  const ordenadas = Array.from(estatisticas.atraso.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([dezena]) => dezena);

  const dezenas = ordenadas.slice(0, dezenasNecessarias).sort((a, b) => a - b);

  return {
    dezenas,
    indicadores: { atraso_medio: calcularMedioAtraso(dezenas, estatisticas) },
  };
}

function gerarParImpar(
  loteria: Loteria,
  estatisticas: Estatisticas,
  _parametros: Record<string, unknown>
): ResultadoGeracao {
  const dezenasNecessarias = loteria.qtd_dezenas_padrao;
  const qtdPares = Math.floor(dezenasNecessarias / 2);
  const qtdImpares = dezenasNecessarias - qtdPares;

  const todosNumeros = gerarUniverso(loteria);
  const pares = todosNumeros.filter(n => n % 2 === 0);
  const impares = todosNumeros.filter(n => n % 2 !== 0);

  const sortear = (arr: number[], qtd: number) => {
    const copia = [...arr];
    const selecionados: number[] = [];
    for (let i = 0; i < qtd && copia.length > 0; i++) {
      const idx = Math.floor(Math.random() * copia.length);
      selecionados.push(copia.splice(idx, 1)[0]);
    }
    return selecionados;
  };

  const dezenas = [...sortear(pares, qtdPares), ...sortear(impares, qtdImpares)]
    .sort((a, b) => a - b);

  return {
    dezenas,
    indicadores: { equilibrio_par_impar: 1.0 },
  };
}

function gerarSoma(
  loteria: Loteria,
  estatisticas: Estatisticas,
  _parametros: Record<string, unknown>
): ResultadoGeracao {
  const dezenasNecessarias = loteria.qtd_dezenas_padrao;
  const { faixa_frequente } = estatisticas.soma_concursos;
  const [somaMin, somaMax] = faixa_frequente;

  let melhorTentativa: number[] = [];
  let melhorDesvio = Infinity;

  for (let tentativa = 0; tentativa < 1000; tentativa++) {
    const candidata = gerarCombinacaoAleatoria(loteria, dezenasNecessarias);
    const soma = candidata.reduce((a, b) => a + b, 0);

    if (soma >= somaMin && soma <= somaMax) {
      return {
        dezenas: candidata.sort((a, b) => a - b),
        indicadores: { soma_total: soma, dentro_faixa: 1.0 },
      };
    }

    const desvio = Math.min(Math.abs(soma - somaMin), Math.abs(soma - somaMax));
    if (desvio < melhorDesvio) {
      melhorDesvio = desvio;
      melhorTentativa = candidata;
    }
  }

  return {
    dezenas: melhorTentativa.sort((a, b) => a - b),
    indicadores: { soma_total: melhorTentativa.reduce((a, b) => a + b, 0), dentro_faixa: 0.5 },
  };
}

function gerarQuadrantes(
  loteria: Loteria,
  estatisticas: Estatisticas,
  _parametros: Record<string, unknown>
): ResultadoGeracao {
  const dezenasNecessarias = loteria.qtd_dezenas_padrao;
  const totalQuadrantes = 4;
  const total = loteria.universo_max - loteria.universo_min + 1;
  const tamanhoQuadrante = Math.ceil(total / totalQuadrantes);

  const quadrantes: number[][] = [];
  for (let q = 0; q < totalQuadrantes; q++) {
    const inicio = loteria.universo_min + q * tamanhoQuadrante;
    const fim = Math.min(inicio + tamanhoQuadrante - 1, loteria.universo_max);
    const numeros: number[] = [];
    for (let n = inicio; n <= fim; n++) numeros.push(n);
    quadrantes.push(numeros);
  }

  const dezenasPorQuadrante = Math.ceil(dezenasNecessarias / totalQuadrantes);
  const dezenas: number[] = [];

  quadrantes.forEach(q => {
    const sorteados = sortearAleatorio(q, Math.min(dezenasPorQuadrante, q.length));
    dezenas.push(...sorteados);
  });

  const resultado = dezenas
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, dezenasNecessarias)
    .sort((a, b) => a - b);

  return {
    dezenas: resultado,
    indicadores: { quadrantes_cobertos: new Set(resultado.map(d => {
      const normalizado = d - loteria.universo_min;
      return Math.floor(normalizado / tamanhoQuadrante);
    })).size / totalQuadrantes },
  };
}

function gerarDelta(
  loteria: Loteria,
  _estatisticas: Estatisticas,
  parametros: Record<string, unknown>
): ResultadoGeracao {
  const dezenasNecessarias = loteria.qtd_dezenas_padrao;
  const deltaMin = (parametros.delta_min as number) || 1;
  const deltaMax = (parametros.delta_max as number) || 15;

  const deltas: number[] = [Math.floor(Math.random() * (loteria.universo_min + deltaMax)) + loteria.universo_min];
  for (let i = 1; i < dezenasNecessarias; i++) {
    deltas.push(deltaMin + Math.floor(Math.random() * (deltaMax - deltaMin + 1)));
  }

  const dezenas: number[] = [deltas[0]];
  for (let i = 1; i < dezenasNecessarias; i++) {
    dezenas.push(dezenas[i - 1] + deltas[i]);
  }

  const filtradas = dezenas.filter(
    d => d >= loteria.universo_min && d <= loteria.universo_max
  );

  if (filtradas.length < dezenasNecessarias) {
    return gerarQuentes(loteria, _estatisticas, {});
  }

  return {
    dezenas: filtradas.slice(0, dezenasNecessarias).sort((a, b) => a - b),
    indicadores: { delta_medio: deltas.reduce((a, b) => a + b, 0) / deltas.length },
  };
}

function gerarExclusaoPadroes(
  loteria: Loteria,
  _estatisticas: Estatisticas,
  _parametros: Record<string, unknown>
): ResultadoGeracao {
  const dezenasNecessarias = loteria.qtd_dezenas_padrao;
  let melhorTentativa: number[] = [];
  let melhorScore = -1;

  for (let tentativa = 0; tentativa < 500; tentativa++) {
    const candidata = gerarCombinacaoAleatoria(loteria, dezenasNecessarias);
    const ordenada = [...candidata].sort((a, b) => a - b);

    let score = 1.0;

    let seqMax = 1;
    let seqAtual = 1;
    for (let i = 1; i < ordenada.length; i++) {
      if (ordenada[i] === ordenada[i - 1] + 1) {
        seqAtual++;
        seqMax = Math.max(seqMax, seqAtual);
      } else {
        seqAtual = 1;
      }
    }
    if (seqMax >= 4) score *= 0.3;
    else if (seqMax >= 3) score *= 0.6;

    const todosMesmaTerminacao = ordenada.every(d => d % 10 === ordenada[0] % 10);
    if (todosMesmaTerminacao && ordenada.length > 3) score *= 0.4;

    if (score > melhorScore) {
      melhorScore = score;
      melhorTentativa = candidata;
    }
  }

  return {
    dezenas: melhorTentativa.sort((a, b) => a - b),
    indicadores: { exclusao_score: melhorScore },
  };
}

function gerarRepeticaoControlada(
  loteria: Loteria,
  _estatisticas: Estatisticas,
  _parametros: Record<string, unknown>
): ResultadoGeracao {
  const dezenasNecessarias = loteria.qtd_dezenas_padrao;
  const todosNumeros = gerarUniverso(loteria);
  const novo = sortearAleatorio(todosNumeros, dezenasNecessarias);

  return {
    dezenas: novo.sort((a, b) => a - b),
    indicadores: { repeticao_score: 0.5 },
  };
}

function gerarUniverso(loteria: Loteria): number[] {
  const universo: number[] = [];
  for (let i = loteria.universo_min; i <= loteria.universo_max; i++) {
    universo.push(i);
  }
  return universo;
}

function gerarCombinacaoAleatoria(loteria: Loteria, quantidade: number): number[] {
  const universo = gerarUniverso(loteria);
  return sortearAleatorio(universo, quantidade);
}

function sortearAleatorio(arr: number[], quantidade: number): number[] {
  const copia = [...arr];
  const selecionados: number[] = [];
  for (let i = 0; i < quantidade && copia.length > 0; i++) {
    const idx = Math.floor(Math.random() * copia.length);
    selecionados.push(copia.splice(idx, 1)[0]);
  }
  return selecionados;
}

function calcularMediaFrequencia(dezenas: number[], estatisticas: Estatisticas): number {
  let soma = 0;
  dezenas.forEach(d => {
    soma += estatisticas.frequencia_percentual.get(d) || 0;
  });
  return dezenas.length > 0 ? soma / dezenas.length : 0;
}

function calcularMedioAtraso(dezenas: number[], estatisticas: Estatisticas): number {
  let soma = 0;
  dezenas.forEach(d => {
    soma += estatisticas.atraso.get(d) || 0;
  });
  return dezenas.length > 0 ? soma / dezenas.length : 0;
}
