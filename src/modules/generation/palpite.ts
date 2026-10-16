import type { Estatisticas, Loteria } from "@/types";
import { obterRegra } from "@/modules/lottery";

export interface MetricaPalpite {
  quentes: number;
  atrasadas: number;
  pares: number;
  impares: number;
  soma: number;
  somaMedia: number;
  faixa: [number, number];
}

export interface PalpiteForte {
  dezenas: number[];
  extras?: Record<string, number[]>;
  colunas?: number[][];
  motivo: string;
  metricas: MetricaPalpite;
}

function universo(loteria: Loteria): number[] {
  const nums: number[] = [];
  for (let i = loteria.universo_min; i <= loteria.universo_max; i++) nums.push(i);
  return nums;
}

function ordenarHot(loteria: Loteria, stats: Estatisticas): number[] {
  return universo(loteria).sort(
    (a, b) => (stats.frequencia.get(b) ?? 0) - (stats.frequencia.get(a) ?? 0) || a - b
  );
}

function ordenarAtrasadas(loteria: Loteria, stats: Estatisticas): number[] {
  return universo(loteria).sort(
    (a, b) => (stats.atraso.get(b) ?? 0) - (stats.atraso.get(a) ?? 0) || a - b
  );
}

function somar(dezenas: number[]): number {
  return dezenas.reduce((a, b) => a + b, 0);
}

function sorteioEntre<T>(pool: T[], quantos: number): T[] {
  const copia = [...pool];
  const sorteados: T[] = [];
  for (let i = 0; i < quantos && copia.length; i++) {
    const idx = Math.floor(Math.random() * copia.length);
    sorteados.push(copia.splice(idx, 1)[0]);
  }
  return sorteados;
}

function ajustarSoma(loteria: Loteria, selecionadas: number[], alvo: number, faixa: [number, number]): number[] {
  const dentro = (v: number) => v >= faixa[0] && v <= faixa[1];
  let atual = [...selecionadas].sort((a, b) => a - b);
  let soma = somar(atual);
  let guarda = 0;
  while (!dentro(soma) && guarda < 400) {
    guarda++;
    const conjunto = new Set(atual);
    const disponiveis = universo(loteria).filter((d) => !conjunto.has(d));
    if (!disponiveis.length) break;
    if (soma < faixa[0] && soma < alvo) {
      const menor = atual[0];
      const candidato = disponiveis.filter((d) => d > menor).sort((a, b) => b - a)[0];
      if (candidato === undefined) break;
      atual = [...atual.slice(1), candidato].sort((a, b) => a - b);
    } else if (soma > faixa[1]) {
      const maior = atual[atual.length - 1];
      const candidato = disponiveis.filter((d) => d < maior).sort((a, b) => a - b)[0];
      if (candidato === undefined) break;
      atual = [...atual.slice(0, -1), candidato].sort((a, b) => a - b);
    } else {
      break;
    }
    soma = somar(atual);
  }
  return atual;
}

export function gerarPalpiteForte(loteria: Loteria, stats: Estatisticas): PalpiteForte {
  const posicional = loteria.mecanica === "posicional" && !!loteria.colunas;
  const n = loteria.qtd_dezenas_padrao;
  const hot = ordenarHot(loteria, stats);
  const atrasadas = ordenarAtrasadas(loteria, stats);

  if (posicional && loteria.colunas) {
    const cfg = loteria.colunas;
    const digitos: number[] = [];
    for (let d = cfg.universo_min; d <= cfg.universo_max; d++) digitos.push(d);
    const ordenados = digitos.sort(
      (a, b) => (stats.atraso.get(b) ?? 0) - (stats.atraso.get(a) ?? 0) || a - b
    );
    const pool = ordenados.slice(0, Math.max(cfg.total_colunas, Math.min(ordenados.length, cfg.total_colunas * 2)));
    const sorteados = sorteioEntre(pool, cfg.total_colunas);
    const dezenas: number[] = [];
    for (let c = 0; c < cfg.total_colunas; c++) {
      dezenas.push(sorteados[c % sorteados.length]);
    }
    const soma = somar(dezenas);
    const pares = dezenas.filter((d) => d % 2 === 0).length;
    return {
      dezenas,
      colunas: dezenas.map((d) => [d]),
      motivo: `Dígitos mais atrasados, 1 por coluna (soma ${soma}; ${pares} pares).`,
      metricas: {
        quentes: dezenas.length,
        atrasadas: dezenas.length,
        pares,
        impares: dezenas.length - pares,
        soma,
        somaMedia: Math.round(stats.soma_concursos.media),
        faixa: stats.soma_concursos.faixa_frequente,
      },
    };
  }

  const rankHot = new Map(hot.map((d, i) => [d, i] as const));
  const rankAtras = new Map(atrasadas.map((d, i) => [d, i] as const));
  const universoArr = universo(loteria);
  const pontuados = universoArr
    .map((d) => {
      const sa = Math.min(rankHot.get(d) ?? 0, n) + Math.min(rankAtras.get(d) ?? 0, n);
      return { d, sa };
    })
    .sort((a, b) => a.sa - b.sa || a.d - b.d);

  const tamanhoPool = Math.min(universoArr.length, Math.max(n * 3, Math.ceil(universoArr.length * 0.25)));
  const pool = pontuados.slice(0, tamanhoPool).map((x) => x.d);
  const sorteadas = sorteioEntre(pool, n);
  const faixa = stats.soma_concursos.faixa_frequente;
  const dezenas = ajustarSoma(loteria, sorteadas, stats.soma_concursos.media, faixa);

  const topHot = new Set(hot.slice(0, Math.max(1, Math.ceil(n / 2))));
  const topAtras = new Set(atrasadas.slice(0, Math.max(1, Math.ceil(n / 2))));
  const quentes = dezenas.filter((d) => topHot.has(d)).length;
  const atrasadasCont = dezenas.filter((d) => topAtras.has(d)).length;
  const soma = somar(dezenas);
  const pares = dezenas.filter((d) => d % 2 === 0).length;

  let extras: Record<string, number[]> | undefined;
  if (loteria.componentes_extras?.length) {
    const base = obterRegra(loteria).gerarAleatorio({ loteria, estatisticas: stats, qtdDezenas: n });
    extras = base.extras;
  }

  return {
    dezenas,
    extras,
    motivo:
      `${quentes} quentes + ${atrasadasCont} atrasadas; ${pares} pares/${dezenas.length - pares} ímpares; ` +
      `soma ${soma} (faixa típica ${faixa[0]}–${faixa[1]}).`,
    metricas: {
      quentes,
      atrasadas: atrasadasCont,
      pares,
      impares: dezenas.length - pares,
      soma,
      somaMedia: Math.round(stats.soma_concursos.media),
      faixa,
    },
  };
}
