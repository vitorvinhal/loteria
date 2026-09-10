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
  fechamento: gerarFechamento,
  hibrida_ia: gerarHibridaIA,
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

function gerarFechamento(
  loteria: Loteria,
  _estatisticas: Estatisticas,
  parametros: Record<string, unknown>
): ResultadoGeracao {
  const dezenasNecessarias = loteria.qtd_dezenas_padrao;
  const dezenasEscolhidas = (parametros.dezenas_escolhidas as number[]) || [];
  const acertosGarantidos = (parametros.acertos_garantidos as number) || 3;

  if (dezenasEscolhidas.length < dezenasNecessarias) {
    const todasDezenas = gerarUniverso(loteria);
    const preenchidas = [
      ...dezenasEscolhidas,
      ...sortearAleatorio(
        todasDezenas.filter(d => !dezenasEscolhidas.includes(d)),
        dezenasNecessarias - dezenasEscolhidas.length
      ),
    ];
    const dezenas = preenchidas.sort((a, b) => a - b);
    return {
      dezenas,
      indicadores: {
        cobertura_pares: dezenasEscolhidas.length > 1
          ? combinacao(dezenasEscolhidas.length, 2) / combinacao(dezenasNecessarias, 2)
          : 0,
        acertos_garantidos: 0,
        fechamento_ideal: 0,
      },
    };
  }

  const universoCoberto = dezenasEscolhidas.slice(0, Math.min(dezenasNecessarias * 2, dezenasEscolhidas.length));

  if (universoCoberto.length <= dezenasNecessarias) {
    return {
      dezenas: universoCoberto.sort((a, b) => a - b),
      indicadores: {
        cobertura_pares: 1.0,
        acertos_garantidos: dezenasNecessarias,
        fechamento_ideal: 1,
      },
    };
  }

  const subconjuntos = gerarSubconjuntos(universoCoberto, dezenasNecessarias);
  const todosParesCobertos = new Set<string>();
  let melhorConjunto: number[][] = [];
  let melhorCobertura = 0;

  for (let tentativa = 0; tentativa < 100; tentativa++) {
    const candidatos = subconjuntos.slice();
    candidatos.sort(() => Math.random() - 0.5);

    const cobertos = new Set<string>();
    const selecionados: number[][] = [];

    for (const sub of candidatos) {
      const novosPares = sub.flatMap((a, i) =>
        sub.slice(i + 1).map(b => `${Math.min(a, b)}-${Math.max(a, b)}`)
      );
      const temNovo = novosPares.some(p => !cobertos.has(p));

      if (temNovo || (selecionados.length < 10 && cobertos.size < combinacao(universoCoberto.length, 2))) {
        novosPares.forEach(p => cobertos.add(p));
        selecionados.push(sub);
      }
    }

    if (cobertos.size > melhorCobertura) {
      melhorCobertura = cobertos.size;
      melhorConjunto = selecionados;
      cobertos.forEach(p => todosParesCobertos.add(p));
    }
  }

  const jogoPrincipal = melhorConjunto.length > 0
    ? melhorConjunto[0].sort((a, b) => a - b)
    : sortearAleatorio(universoCoberto, dezenasNecessarias);

  return {
    dezenas: jogoPrincipal,
    indicadores: {
      cobertura_pares: combinacao(universoCoberto.length, 2) > 0
        ? melhorCobertura / combinacao(universoCoberto.length, 2)
        : 0,
      acertos_garantidos: Math.min(acertosGarantidos, dezenasNecessarias),
      fechamento_ideal: 0,
      jogos_fechamento: melhorConjunto.length,
    },
  };
}

function gerarHibridaIA(
  loteria: Loteria,
  estatisticas: Estatisticas,
  _parametros: Record<string, unknown>
): ResultadoGeracao {
  const dezenasNecessarias = loteria.qtd_dezenas_padrao;
  const todosNumeros = gerarUniverso(loteria);

  const scores = new Map<number, number>();

  for (const numero of todosNumeros) {
    scores.set(numero, 0);
  }

  const pesos = {
    quentes: 0.25,
    frias: 0.20,
    par_impar: 0.15,
    soma: 0.15,
    quadrantes: 0.15,
    aleatorio: 0.10,
  };

  const frequenciaOrdenada = Array.from(estatisticas.frequencia.entries())
    .sort((a, b) => b[1] - a[1]);
  const totalConcursos = frequenciaOrdenada.reduce((soma, [, freq]) => soma + freq, 0);

  if (totalConcursos > 0) {
    frequenciaOrdenada.forEach(([dezena, freq], idx) => {
      const score = (1 - idx / frequenciaOrdenada.length) * pesos.quentes;
      scores.set(dezena, (scores.get(dezena) || 0) + score);
    });
  } else {
    todosNumeros.forEach(n => {
      scores.set(n, (scores.get(n) || 0) + pesos.quentes * Math.random());
    });
  }

  const atrasoOrdenado = Array.from(estatisticas.atraso.entries())
    .sort((a, b) => b[1] - a[1]);

  if (atrasoOrdenado.length > 0) {
    atrasoOrdenado.forEach(([dezena, atr], idx) => {
      const score = (1 - idx / atrasoOrdenado.length) * pesos.frias;
      scores.set(dezena, (scores.get(dezena) || 0) + score);
    });
  } else {
    todosNumeros.forEach(n => {
      scores.set(n, (scores.get(n) || 0) + pesos.frias * Math.random());
    });
  }

  const pares = todosNumeros.filter(n => n % 2 === 0);
  const impares = todosNumeros.filter(n => n % 2 !== 0);
  pares.forEach(n => {
    scores.set(n, (scores.get(n) || 0) + pesos.par_impar * 0.5);
  });
  impares.forEach(n => {
    scores.set(n, (scores.get(n) || 0) + pesos.par_impar * 0.5);
  });

  const { faixa_frequente } = estatisticas.soma_concursos;
  const [somaMin, somaMax] = faixa_frequente;
  const somaMedia = (somaMin + somaMax) / 2;

  todosNumeros.forEach(n => {
    const contribuicao = 1 - Math.abs(n - somaMedia / dezenasNecessarias) / (loteria.universo_max / dezenasNecessarias);
    scores.set(n, (scores.get(n) || 0) + Math.max(0, contribuicao) * pesos.soma);
  });

  const total = loteria.universo_max - loteria.universo_min + 1;
  const tamanhoQuadrante = Math.ceil(total / 4);

  todosNumeros.forEach(n => {
    const idx = Math.floor((n - loteria.universo_min) / tamanhoQuadrante);
    const count = estatisticas.distribuicao_quadrantes.get(idx) || 1;
    const totalQuadrante = estatisticas.distribuicao_quadrantes.size || 1;
    const score = (count / totalQuadrante) * pesos.quadrantes;
    scores.set(n, (scores.get(n) || 0) + score);
  });

  todosNumeros.forEach(n => {
    scores.set(n, (scores.get(n) || 0) + pesos.aleatorio * Math.random());
  });

  const ranking = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1]);

  const dezenas = ranking.slice(0, dezenasNecessarias)
    .map(([dezena]) => dezena)
    .sort((a, b) => a - b);

  const scoreMedio = dezenas.reduce((s, d) => s + (scores.get(d) || 0), 0) / dezenas.length;

  return {
    dezenas,
    indicadores: {
      score_hibrido: scoreMedio,
      peso_frequencia: pesos.quentes,
      peso_atraso: pesos.frias,
      peso_par_impar: pesos.par_impar,
      peso_soma: pesos.soma,
      peso_distribuicao: pesos.quadrantes,
      peso_aleatorio: pesos.aleatorio,
    },
  };
}

function combinacao(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let resultado = 1;
  for (let i = 0; i < k; i++) {
    resultado = resultado * (n - i) / (i + 1);
  }
  return Math.round(resultado);
}

function gerarSubconjuntos(arr: number[], tamanho: number): number[][] {
  if (tamanho === 0) return [[]];
  if (arr.length < tamanho) return [];
  const resultado: number[][] = [];

  function backtrack(inicio: number, atual: number[]) {
    if (atual.length === tamanho) {
      resultado.push([...atual]);
      return;
    }
    const restantes = tamanho - atual.length;
    for (let i = inicio; i <= arr.length - restantes; i++) {
      atual.push(arr[i]);
      backtrack(i + 1, atual);
      atual.pop();
    }
  }

  backtrack(0, []);
  return resultado;
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
