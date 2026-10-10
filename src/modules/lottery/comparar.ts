import type { Loteria, Concurso } from '@/types';
import { extrasDoConcurso } from './sorteio';

export interface GradeAcerto {
  nome: string;
  qtd: number;
  descricao: string;
}

export interface ComparacaoResultado {
  nome?: string;
  dezenas: number[];
  acertos: number[];
  erros: number[];
  percentual: number;
  grades: GradeAcerto[];
  estatisticas: { soma: number; pares: number; impares: number; sequencias: number; maiorSequencia: number };
  premioEstimado: string;
  valorPremio: number;
  ganhadores: number;
  faixaPremio: string;
  camuflagem?: boolean;
  /** Dupla Sena: resultado do 2º sorteio. */
  acertos2?: number[];
  erros2?: number[];
  grades2?: GradeAcerto[];
  valorPremio2?: number;
  ganhadores2?: number;
  faixaPremio2?: string;
  /** Extras: "🍀 Trevos: 1/2" · "⚽ Time: ✓" etc. */
  extraInfo?: string[];
  /** Dados antigos sem metadados: o que não pôde ser conferido com segurança. */
  avisos?: string[];
}

/** Conta acertos de cada extra do jogo contra o sorteio. */
export function conferirExtras(
  loteria: Loteria,
  extrasJogo: Record<string, number[]>,
  extrasSorteio: Record<string, number[]>
): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const comp of loteria.componentes_extras ?? []) {
    const doJogo = extrasJogo[comp.tipo] ?? [];
    const doSorteio = extrasSorteio[comp.tipo] ?? [];
    if (doJogo.length && doSorteio.length) {
      contagem[comp.tipo] = doJogo.filter(v => doSorteio.includes(v)).length;
    }
  }
  return contagem;
}

export function encontrarRegraComExtras(
  loteria: Loteria,
  acertos: number,
  extrasAcertados: Record<string, number>
) {
  const candidatos = loteria.regras_vitoria.filter(
    (r) => acertos >= r.acertos_min && acertos <= r.acertos_max
  );
  if (candidatos.length <= 1) return candidatos[0] ?? null;
  if (loteria.slug === "maismilionaria") {
    const trevos = extrasAcertados.trevo ?? 0;
    const comDois = candidatos.find((c) => /2\s*trev/i.test(c.descricao));
    const semDois = candidatos.find((c) => !/2\s*trev/i.test(c.descricao));
    if (trevos >= 2) return comDois ?? candidatos[0];
    if (trevos >= 1 || (semDois && /nenhum/i.test(semDois.descricao))) {
      return semDois ?? null;
    }
    return null;
  }
  return candidatos[0];
}

export function melhorPremio(
  premiacoes: Concurso["premiacoes"],
  acertos: number
): { valor: number; ganhadores: number; descricao: string } {
  const ordenadas = [...premiacoes].sort((a, b) => b.acertos - a.acertos);
  for (const p of ordenadas) {
    if (acertos >= p.acertos && p.acertos > 0 && p.premio > 0) {
      return { valor: p.premio, ganhadores: p.ganhadores, descricao: p.descricao };
    }
  }
  return { valor: 0, ganhadores: 0, descricao: "" };
}

export function calcularEstatisticas(dezenas: number[]) {
  const soma = dezenas.reduce((a, b) => a + b, 0);
  const pares = dezenas.filter((d) => d % 2 === 0).length;
  const impares = dezenas.length - pares;
  const sorted = [...dezenas].sort((a, b) => a - b);
  let sequencias = 0;
  let maiorSequencia = 0;
  let atual = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) { atual++; }
    else { if (atual >= 2) sequencias++; maiorSequencia = Math.max(maiorSequencia, atual); atual = 1; }
  }
  if (atual >= 2) { sequencias++; maiorSequencia = Math.max(maiorSequencia, atual); }
  return { soma, pares, impares, sequencias, maiorSequencia };
}

export function calcularGrades(acertos: number, loteria: Loteria): GradeAcerto[] {
  const nomesGrades: Record<string, GradeAcerto[]> = {
    megasena: [
      { nome: "Sena", qtd: 6, descricao: "6 acertos - Prêmio máximo" },
      { nome: "Quina", qtd: 5, descricao: "5 acertos" },
      { nome: "Quadra", qtd: 4, descricao: "4 acertos" },
    ],
    quina: [
      { nome: "Quina", qtd: 5, descricao: "5 acertos - Prêmio máximo" },
      { nome: "4 acertos", qtd: 4, descricao: "4 acertos" },
      { nome: "3 acertos", qtd: 3, descricao: "3 acertos" },
      { nome: "2 acertos", qtd: 2, descricao: "2 acertos" },
    ],
    lotofacil: [
      { nome: "15 acertos", qtd: 15, descricao: "15 acertos - Prêmio máximo" },
      { nome: "14 acertos", qtd: 14, descricao: "14 acertos" },
      { nome: "13 acertos", qtd: 13, descricao: "13 acertos" },
      { nome: "12 acertos", qtd: 12, descricao: "12 acertos" },
      { nome: "11 acertos", qtd: 11, descricao: "11 acertos" },
    ],
    lotomania: [
      { nome: "20 acertos", qtd: 20, descricao: "20 acertos - Prêmio máximo" },
      { nome: "19 acertos", qtd: 19, descricao: "19 acertos" },
      { nome: "18 acertos", qtd: 18, descricao: "18 acertos" },
      { nome: "17 acertos", qtd: 17, descricao: "17 acertos" },
      { nome: "16 acertos", qtd: 16, descricao: "16 acertos" },
      { nome: "15 acertos", qtd: 15, descricao: "15 acertos" },
      { nome: "0 acertos", qtd: 0, descricao: "0 acertos - Prêmio especial" },
    ],
    supersete: [
      { nome: "7 colunas", qtd: 7, descricao: "7 colunas certas - Prêmio máximo" },
      { nome: "6 colunas", qtd: 6, descricao: "6 colunas certas" },
      { nome: "5 colunas", qtd: 5, descricao: "5 colunas certas" },
      { nome: "4 colunas", qtd: 4, descricao: "4 colunas certas" },
      { nome: "3 colunas", qtd: 3, descricao: "3 colunas certas - Prêmio fixo" },
    ],
  };
  const grades = nomesGrades[loteria.id] || [];
  return grades.filter((g) => acertos >= g.qtd && g.qtd > 0).slice(0, 1);
}

export function compararJogo(
  dezenas: number[],
  resultado: Concurso,
  loteria: Loteria,
  nome?: string,
  camuflagem?: boolean,
  metadados?: ({ colunas?: number[][] } & Record<string, unknown>) | null
): ComparacaoResultado {
  const posicional = loteria.mecanica === "posicional";

  // Extras do jogo (salvos em metadados) contra os sorteados (raw da fonte)
  const extrasJogo: Record<string, number[]> = {};
  for (const comp of loteria.componentes_extras ?? []) {
    const v = metadados?.[comp.tipo];
    if (Array.isArray(v)) extrasJogo[comp.tipo] = (v as unknown[]).map(Number);
  }
  const extrasSorteio = extrasDoConcurso(resultado);
  const extrasAcertados = conferirExtras(loteria, extrasJogo, extrasSorteio);
  const extraInfo: string[] = [];
  for (const comp of loteria.componentes_extras ?? []) {
    const doJogo = extrasJogo[comp.tipo] ?? [];
    const doSorteio = extrasSorteio[comp.tipo] ?? [];
    if (doJogo.length && doSorteio.length) {
      const n = extrasAcertados[comp.tipo] ?? 0;
      const icone = comp.tipo === "trevo" ? "🍀" : comp.tipo === "time" ? "⚽" : "📅";
      extraInfo.push(`${icone} ${comp.nome}: ${n}/${doJogo.length}`);
    }
  }

  const colunasJogo = Array.isArray(metadados?.colunas)
    ? (metadados.colunas as number[][])
    : undefined;

  // Jogo salvo no formato antigo (sem metadados): sinaliza o que ficou de fora.
  const avisos: string[] = [];
  if (posicional && !colunasJogo) {
    avisos.push("Formato antigo: sem colunas salvas — conferência aproximada por posição.");
  }
  const extrasFaltando = (loteria.componentes_extras ?? []).filter(
    (c) => c.obrigatorio && !(extrasJogo[c.tipo]?.length)
  );
  if (extrasFaltando.length) {
    avisos.push(
      `Formato antigo: ${extrasFaltando.map((c) => c.tipo).join(", ")} não conferido(s) — aposta sem metadados.`
    );
  }

  let acertos: number[] = [];
  let erros: number[] = [];
  let acertos2: number[] | undefined;
  let erros2: number[] | undefined;
  const sorteio = resultado.dezenas_sorteadas;

  if (posicional) {
    // Conferência coluna a coluna: aposta múltipla acerta se QUALQUER
    // dígito marcado na coluna coincidir com o sorteado na mesma posição.
    for (let col = 0; col < dezenas.length; col++) {
      const marcados = colunasJogo?.[col];
      const hit =
        marcados && marcados.length > 0
          ? marcados.includes(sorteio[col])
          : dezenas[col] === sorteio[col];
      if (hit) acertos.push(sorteio[col]);
      else erros.push(dezenas[col]);
    }
  } else if (loteria.slug === "duplasena" && sorteio.length === 12) {
    // Dupla Sena: 6 dezenas do 1º sorteio + 6 do 2º, conferidos à parte.
    const set1 = new Set(sorteio.slice(0, 6));
    const set2 = new Set(sorteio.slice(6, 12));
    acertos = dezenas.filter((d) => set1.has(d)).sort((a, b) => a - b);
    erros = dezenas.filter((d) => !set1.has(d)).sort((a, b) => a - b);
    acertos2 = dezenas.filter((d) => set2.has(d)).sort((a, b) => a - b);
    erros2 = dezenas.filter((d) => !set2.has(d)).sort((a, b) => a - b);
  } else {
    const resultadoSet = new Set(sorteio);
    acertos = dezenas.filter((d) => resultadoSet.has(d)).sort((a, b) => a - b);
    erros = dezenas.filter((d) => !resultadoSet.has(d)).sort((a, b) => a - b);
  }

  const acertosBase = posicional
    ? acertos.length
    : acertos2
      ? Math.max(acertos.length, acertos2.length)
      : acertos.length;
  const percentual = dezenas.length > 0 ? Math.round((acertosBase / dezenas.length) * 100) : 0;

  let grades = calcularGrades(acertos.length, loteria);
  let grades2: GradeAcerto[] | undefined;
  if (acertos2) {
    grades2 = calcularGrades(acertos2.length, loteria);
    // Junta as melhores classificações dos dois sorteios (sem duplicar).
    const vistos = new Set(grades.map((g) => g.nome));
    grades = [...grades, ...grades2.filter((g) => !vistos.has(g.nome))];
  }

  const estatisticas = calcularEstatisticas(dezenas);
  const regra = encontrarRegraComExtras(loteria, acertosBase, extrasAcertados);
  let faixaPremio = regra ? regra.descricao : "Sem premiação";

  const premiacoes = resultado.premiacoes ?? [];
  let valorPremio = 0;
  let ganhadores = 0;
  let valorPremio2 = 0;
  let ganhadores2 = 0;
  let faixaPremio2: string | undefined;

  if (acertos2 && premiacoes.length >= 4 && premiacoes.length % 2 === 0) {
    // Dupla Sena: metade das faixas para cada sorteio (6,5,4,3 × 2).
    const meio = Math.floor(premiacoes.length / 2);
    const p1 = melhorPremio(premiacoes.slice(0, meio), acertos.length);
    const p2 = melhorPremio(premiacoes.slice(meio), acertos2.length);
    valorPremio = p1.valor;
    ganhadores = p1.ganhadores;
    if (p1.descricao) faixaPremio = p1.descricao;
    valorPremio2 = p2.valor;
    ganhadores2 = p2.ganhadores;
    faixaPremio2 = p2.descricao || undefined;
  } else if (premiacoes.length > 0) {
    const p1 = melhorPremio(premiacoes, acertosBase);
    valorPremio = p1.valor;
    ganhadores = p1.ganhadores;
    if (p1.descricao) faixaPremio = p1.descricao;
  }

  return {
    nome,
    dezenas,
    acertos,
    erros,
    percentual,
    grades,
    estatisticas,
    premioEstimado: faixaPremio,
    valorPremio,
    ganhadores,
    faixaPremio,
    camuflagem,
    acertos2,
    erros2,
    grades2,
    valorPremio2,
    ganhadores2,
    faixaPremio2,
    extraInfo: extraInfo.length ? extraInfo : undefined,
    avisos: avisos.length ? avisos : undefined,
  };
}
