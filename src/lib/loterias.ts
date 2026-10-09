import { Loteria, ConfigColunas } from '@/types';
import { combinacao } from '@/modules/lottery';

export const LOTERIAS: Loteria[] = [
  {
    id: 'lotofacil',
    slug: 'lotofacil',
    nome: 'Lotofácil',
    universo_min: 1,
    universo_max: 25,
    qtd_dezenas_min: 15,
    qtd_dezenas_max: 20,
    qtd_dezenas_padrao: 15,
    qtd_sorteada: 15,
    mecanica: 'conjunto',
    dias_sorteio: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
    horario_sorteio: '20:00',
    preco_aposta_base: 3.50,
    regras_vitoria: [
      { acertos_min: 11, acertos_max: 11, descricao: '11 acertos - Prêmio fixo' },
      { acertos_min: 12, acertos_max: 12, descricao: '12 acertos - Prêmio fixo' },
      { acertos_min: 13, acertos_max: 13, descricao: '13 acertos - Prêmio fixo' },
      { acertos_min: 14, acertos_max: 14, descricao: '14 acertos - Prêmio maior' },
      { acertos_min: 15, acertos_max: 15, descricao: '15 acertos - Prêmio máximo' },
    ],
    ativo: true,
  },
  {
    id: 'lotomania',
    slug: 'lotomania',
    nome: 'Lotomania',
    universo_min: 0,
    universo_max: 99,
    qtd_dezenas_min: 50,
    qtd_dezenas_max: 50,
    qtd_dezenas_padrao: 50,
    qtd_sorteada: 20,
    mecanica: 'conjunto',
    dias_sorteio: ['segunda', 'quarta', 'sexta'],
    horario_sorteio: '20:00',
    preco_aposta_base: 3.00,
    regras_vitoria: [
      { acertos_min: 0, acertos_max: 0, descricao: '0 acertos - Prêmio especial' },
      { acertos_min: 15, acertos_max: 15, descricao: '15 acertos - Prêmio menor' },
      { acertos_min: 16, acertos_max: 16, descricao: '16 acertos' },
      { acertos_min: 17, acertos_max: 17, descricao: '17 acertos' },
      { acertos_min: 18, acertos_max: 18, descricao: '18 acertos' },
      { acertos_min: 19, acertos_max: 19, descricao: '19 acertos' },
      { acertos_min: 20, acertos_max: 20, descricao: '20 acertos - Prêmio máximo' },
    ],
    ativo: true,
  },
  {
    id: 'megasena',
    slug: 'megasena',
    nome: 'Mega-Sena',
    universo_min: 1,
    universo_max: 60,
    qtd_dezenas_min: 6,
    qtd_dezenas_max: 20,
    qtd_dezenas_padrao: 6,
    qtd_sorteada: 6,
    mecanica: 'conjunto',
    dias_sorteio: ['terca', 'quinta', 'domingo'],
    horario_sorteio: '20:00',
    preco_aposta_base: 6.00,
    regras_vitoria: [
      { acertos_min: 4, acertos_max: 4, descricao: '4 acertos - Quadra' },
      { acertos_min: 5, acertos_max: 5, descricao: '5 acertos - Quina' },
      { acertos_min: 6, acertos_max: 6, descricao: '6 acertos - Sena (Prêmio máximo)' },
    ],
    ativo: true,
  },
  {
    id: 'quina',
    slug: 'quina',
    nome: 'Quina',
    universo_min: 1,
    universo_max: 80,
    qtd_dezenas_min: 5,
    qtd_dezenas_max: 15,
    qtd_dezenas_padrao: 5,
    qtd_sorteada: 5,
    mecanica: 'conjunto',
    dias_sorteio: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'domingo'],
    horario_sorteio: '20:00',
    preco_aposta_base: 3.00,
    regras_vitoria: [
      { acertos_min: 2, acertos_max: 2, descricao: '2 acertos - Duque' },
      { acertos_min: 3, acertos_max: 3, descricao: '3 acertos - Terno' },
      { acertos_min: 4, acertos_max: 4, descricao: '4 acertos - Quadra' },
      { acertos_min: 5, acertos_max: 5, descricao: '5 acertos - Quina (Prêmio máximo)' },
    ],
    ativo: true,
  },
  {
    id: 'duplasena',
    slug: 'duplasena',
    nome: 'Dupla Sena',
    universo_min: 1,
    universo_max: 50,
    qtd_dezenas_min: 6,
    qtd_dezenas_max: 15,
    qtd_dezenas_padrao: 6,
    qtd_sorteada: 6,
    mecanica: 'conjunto',
    dias_sorteio: ['segunda', 'quarta', 'sexta'],
    horario_sorteio: '20:00',
    preco_aposta_base: 3.00,
    regras_vitoria: [
      { acertos_min: 3, acertos_max: 3, descricao: '3 acertos - Terno' },
      { acertos_min: 4, acertos_max: 4, descricao: '4 acertos - Quadra' },
      { acertos_min: 5, acertos_max: 5, descricao: '5 acertos - Quina' },
      { acertos_min: 6, acertos_max: 6, descricao: '6 acertos - Sena (Prêmio máximo)' },
    ],
    ativo: true,
  },
  {
    id: 'timemania',
    slug: 'timemania',
    nome: 'Timemania',
    universo_min: 1,
    universo_max: 80,
    qtd_dezenas_min: 10,
    qtd_dezenas_max: 10,
    qtd_dezenas_padrao: 10,
    qtd_sorteada: 7,
    mecanica: 'conjunto',
    componentes_extras: [
      { tipo: 'time', nome: 'Time do Coração', universo_min: 1, universo_max: 80, qtd_min: 1, qtd_max: 1, obrigatorio: true },
    ],
    dias_sorteio: ['terca', 'quinta', 'domingo'],
    horario_sorteio: '20:00',
    preco_aposta_base: 3.50,
    regras_vitoria: [
      { acertos_min: 3, acertos_max: 3, descricao: '3 acertos - Prêmio fixo' },
      { acertos_min: 4, acertos_max: 4, descricao: '4 acertos - Prêmio fixo' },
      { acertos_min: 5, acertos_max: 5, descricao: '5 acertos' },
      { acertos_min: 6, acertos_max: 6, descricao: '6 acertos' },
      { acertos_min: 7, acertos_max: 7, descricao: '7 acertos - Prêmio máximo' },
    ],
    ativo: true,
  },
  {
    id: 'diadesorte',
    slug: 'diadesorte',
    nome: 'Dia de Sorte',
    universo_min: 1,
    universo_max: 31,
    qtd_dezenas_min: 7,
    qtd_dezenas_max: 15,
    qtd_dezenas_padrao: 7,
    qtd_sorteada: 7,
    mecanica: 'conjunto',
    componentes_extras: [
      { tipo: 'mes', nome: 'Mês da Sorte', universo_min: 1, universo_max: 12, qtd_min: 1, qtd_max: 1, obrigatorio: true },
    ],
    dias_sorteio: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'domingo'],
    horario_sorteio: '20:00',
    preco_aposta_base: 2.50,
    regras_vitoria: [
      { acertos_min: 4, acertos_max: 4, descricao: '4 acertos - Prêmio fixo' },
      { acertos_min: 5, acertos_max: 5, descricao: '5 acertos - Prêmio fixo' },
      { acertos_min: 6, acertos_max: 6, descricao: '6 acertos' },
      { acertos_min: 7, acertos_max: 7, descricao: '7 acertos - Prêmio máximo' },
    ],
    ativo: true,
  },
  {
    id: 'maismilionaria',
    slug: 'maismilionaria',
    nome: '+Milionária',
    universo_min: 1,
    universo_max: 50,
    qtd_dezenas_min: 6,
    qtd_dezenas_max: 12,
    qtd_dezenas_padrao: 6,
    qtd_sorteada: 6,
    mecanica: 'conjunto',
    componentes_extras: [
      { tipo: 'trevo', nome: 'Trevos', universo_min: 1, universo_max: 6, qtd_min: 2, qtd_max: 6, obrigatorio: true },
    ],
    dias_sorteio: ['quarta', 'domingo'],
    horario_sorteio: '20:00',
    preco_aposta_base: 6.00,
    regras_vitoria: [
      { acertos_min: 6, acertos_max: 6, descricao: '6 acertos + 2 trevos - Faixa 1' },
      { acertos_min: 6, acertos_max: 6, descricao: '6 acertos + 1/0 trevo - Faixa 2' },
      { acertos_min: 5, acertos_max: 5, descricao: '5 acertos + 2 trevos - Faixa 3' },
      { acertos_min: 5, acertos_max: 5, descricao: '5 acertos + 1/0 trevo - Faixa 4' },
      { acertos_min: 4, acertos_max: 4, descricao: '4 acertos + 2 trevos - Faixa 5' },
      { acertos_min: 4, acertos_max: 4, descricao: '4 acertos + 1/0 trevo - Faixa 6' },
      { acertos_min: 3, acertos_max: 3, descricao: '3 acertos + 2 trevos - Faixa 7' },
      { acertos_min: 3, acertos_max: 3, descricao: '3 acertos + 1 trevo - Faixa 8' },
      { acertos_min: 2, acertos_max: 2, descricao: '2 acertos + 2 trevos - Faixa 9' },
      { acertos_min: 2, acertos_max: 2, descricao: '2 acertos + 1 trevo - Faixa 10' },
    ],
    ativo: true,
  },
  {
    id: 'supersete',
    slug: 'supersete',
    nome: 'Super Sete',
    universo_min: 0,
    universo_max: 9,
    qtd_dezenas_min: 7,
    qtd_dezenas_max: 21,
    qtd_dezenas_padrao: 7,
    qtd_sorteada: 7,
    mecanica: 'posicional',
    colunas: {
      total_colunas: 7,
      universo_min: 0,
      universo_max: 9,
      min_total: 7,
      max_total: 21,
      faixas_por_coluna: [
        { total_min: 7, total_max: 7, min_coluna: 1, max_coluna: 1 },
        { total_min: 8, total_max: 14, min_coluna: 1, max_coluna: 2 },
        { total_min: 15, total_max: 21, min_coluna: 2, max_coluna: 3 },
      ],
    },
    dias_sorteio: ['segunda', 'quarta', 'sexta'],
    horario_sorteio: '21:00',
    preco_aposta_base: 3.00,
    regras_vitoria: [
      { acertos_min: 3, acertos_max: 3, descricao: '3 colunas certas - Prêmio fixo' },
      { acertos_min: 4, acertos_max: 4, descricao: '4 colunas certas' },
      { acertos_min: 5, acertos_max: 5, descricao: '5 colunas certas' },
      { acertos_min: 6, acertos_max: 6, descricao: '6 colunas certas' },
      { acertos_min: 7, acertos_max: 7, descricao: '7 colunas certas - Prêmio máximo' },
    ],
    ativo: true,
  },
];

export function getLoteriaPorSlug(slug: string): Loteria | undefined {
  return LOTERIAS.find(l => l.slug === slug);
}

export function getLoteriasAtivas(): Loteria[] {
  return LOTERIAS.filter(l => l.ativo);
}

export function getOpcoesQtd(slug: string): number[] {
  const loteria = getLoteriaPorSlug(slug);
  if (!loteria) return [];
  const opcoes: number[] = [];
  for (let i = loteria.qtd_dezenas_min; i <= loteria.qtd_dezenas_max; i++) {
    opcoes.push(i);
  }
  return opcoes;
}

function distribuirCanonico(colunas: ConfigColunas, total: number): number[] {
  const totalSeguro = Math.min(Math.max(total, colunas.min_total), colunas.max_total);
  const faixa = colunas.faixas_por_coluna.find(
    f => totalSeguro >= f.total_min && totalSeguro <= f.total_max
  );
  if (!faixa) return [];
  const counts = new Array(colunas.total_colunas).fill(faixa.min_coluna);
  let restante = totalSeguro - faixa.min_coluna * colunas.total_colunas;
  for (let i = 0; i < counts.length && restante > 0; i++) {
    const add = Math.min(faixa.max_coluna - counts[i], restante);
    counts[i] += add;
    restante -= add;
  }
  return counts;
}

export function getPreco(slug: string, qtd: number): number {
  const loteria = getLoteriaPorSlug(slug);
  if (!loteria) return 0;
  const base = loteria.preco_aposta_base;

  if (loteria.mecanica === 'posicional' && loteria.colunas) {
    const counts = distribuirCanonico(loteria.colunas, qtd);
    if (counts.length === 0) return base;
    return counts.reduce((acc, c) => acc * Math.max(1, c), 1) * base;
  }
  if (slug === 'lotomania' || slug === 'timemania') return base;
  if (slug === 'maismilionaria') return combinacao(qtd, 6) * base;
  const qtdSorteada = loteria.qtd_sorteada || loteria.qtd_dezenas_padrao;
  return combinacao(qtd, qtdSorteada) * base;
}
