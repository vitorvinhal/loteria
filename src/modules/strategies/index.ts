import { Loteria, Estatisticas, Estrategia } from '@/types';

export interface ResultadoGeracao {
  dezenas: number[];
  indicadores: Record<string, number>;
}

export type FuncaoEstrategia = (
  loteria: Loteria,
  estatisticas: Estatisticas,
  parametros: Record<string, unknown>
) => ResultadoGeracao;

export const ESTRATEGIAS: Estrategia[] = [
  {
    id: 'quentes',
    slug: 'quentes',
    nome: 'Dezenas Quentes',
    descricao_curta: 'Prioriza dezenas mais sorteadas recentemente.',
    descricao_completa: 'Esta estratégia seleciona as dezenas que apareceram com maior frequência nas últimas N concursos (janela configurável). É ideal para apostadores que seguem tendências recentes e acreditam que dezenas com alta frequência recente tendem a continuar aparecendo no curto prazo.',
    categoria: 'frequencia',
    parametros_padrao: { janela: 25, peso: 1.0 },
    ativo: true,
  },
  {
    id: 'frias',
    slug: 'frias',
    nome: 'Dezenas Frias / Atraso',
    descricao_curta: 'Prioriza dezenas que não saem há mais tempo.',
    descricao_completa: 'Esta estratégia prioriza dezenas que estão há mais concursos sem serem sorteadas (alto atraso). Baseia-se na observação histórica de que, no longo prazo, todas as dezenas tendem a aparecer com frequência similar. É uma das estratégias mais populares entre apostadores tradicionais.',
    categoria: 'atraso',
    parametros_padrao: { peso: 1.0 },
    ativo: true,
  },
  {
    id: 'par_impar',
    slug: 'par_impar',
    nome: 'Equilíbrio Par/Ímpar',
    descricao_curta: 'Busca a proporção pares/ímpares historicamente mais comum.',
    descricao_completa: 'Esta estratégia gera combinações que respeitam a distribuição par/ímpar mais frequente no histórico da loteria escolhida. Por exemplo, na Mega-Sena, a combinação com 3 pares e 3 ímpares é a mais comum. Isso não aumenta a chance de acerto, mas produz jogos com distribuição estatisticamente representativa.',
    categoria: 'equilibrio',
    parametros_padrao: { tolerancia: 1 },
    ativo: true,
  },
  {
    id: 'soma',
    slug: 'soma',
    nome: 'Faixa de Soma',
    descricao_curta: 'Filtra combinações cuja soma cai na faixa mais frequente.',
    descricao_completa: 'Esta estratégia gera combinações cuja soma total das dezenas está dentro da faixa estatisticamente mais frequente no histórico (geralmente entre Q1 e Q3 da distribuição de somas). É uma forma de garantir que o jogo não tenha uma soma_extremamente alta ou baixa, que são estatisticamente raras.',
    categoria: 'soma',
    parametros_padrao: { margem: 0.1 },
    ativo: true,
  },
  {
    id: 'quadrantes',
    slug: 'quadrantes',
    nome: 'Distribuição por Quadrantes',
    descricao_curta: 'Distribui dezenas equilibradamente pelo volante.',
    descricao_completa: 'Esta estratégia divide o volante de aposta em quadrantes (ou regiões) e garante que pelo menos uma dezena seja selecionada de cada região. Isso evita concentração de números numa única parte do volante, o que é uma tendência comum entre apostadores que escolhem visualmente.',
    categoria: 'distribuicao',
    parametros_padrao: { min_por_quadrante: 1 },
    ativo: true,
  },
  {
    id: 'delta',
    slug: 'delta',
    nome: 'Delta System',
    descricao_curta: 'Controla diferenças entre dezenas consecutivas.',
    descricao_completa: 'O sistema Delta controla a diferença entre dezenas consecutivas da combinação ordenada. Por exemplo, se a combinação é [3, 7, 12, 18, 23], os deltas são [4, 5, 6, 5]. Esta estratégia gera jogos com padrões de espaçamento pouco comuns entre apostadores, o que pode reduzir a chance de dividir o prêmio em caso de acerto.',
    categoria: 'sistema',
    parametros_padrao: { delta_min: 1, delta_max: 15 },
    ativo: true,
  },
  {
    id: 'exclusao_padroes',
    slug: 'exclusao_padroes',
    nome: 'Exclusão de Padrões Óbvios',
    descricao_curta: 'Evita sequências, múltiplos e padrões visuais populares.',
    descricao_completa: 'Esta estratégia exclui combinações que seguem padrões visuais populares: sequências consecutivas (1-2-3-4-5-6), múltiplos de um número, diagonais do volante, e outros padrões que muitos apostadores escolhem visualmente. O objetivo não é "ganhar mais fácil", mas sim reduzir a probabilidade de dividir o prêmio com outros apostadores em caso de acerto.',
    categoria: 'exclusao',
    parametros_padrao: { max_sequencia: 2, evitar_multiplos: true },
    ativo: true,
  },
  {
    id: 'repeticao_controlada',
    slug: 'repeticao_controlada',
    nome: 'Repetição Controlada do Concurso Anterior',
    descricao_curta: 'Define quantas dezenas do último sorteio devem se repetir.',
    descricao_completa: 'Esta estratégia analisa a frequência histórica de repetição de dezenas entre concursos consecutivos e gera combinações que respeitam essa média. Por exemplo, se historicamente 40% das vezes sai pelo menos 1 dezena repetida, a estratégia gera jogos com 0 a 2 dezenas do concurso anterior, proporcionalmente.',
    categoria: 'repeticao',
    parametros_padrao: { media_repeticao: 1 },
    ativo: true,
  },
  {
    id: 'fechamento',
    slug: 'fechamento',
    nome: 'Fechamento Combinatório (Wheeling)',
    descricao_curta: 'Garante cobertura mínima de acertos para um subconjunto escolhido.',
    descricao_completa: 'O fechamento combinatório (wheeling) é a estratégia mais sólida para bolões. Em vez de gerar jogos individuais, ele gera um CONJUNTO de jogos que garante que, se um subconjunto de dezenas escolhidas for sorteado, pelo menos um jogo do conjunto acertará um número mínimo de dezenas. É matematicamente provável e a única estratégia que oferece garantia de cobertura.',
    categoria: 'fechamento',
    parametros_padrao: { dezenas_escolhidas: [], acertos_garantidos: 3 },
    ativo: true,
  },
  {
    id: 'hibrida_ia',
    slug: 'hibrida_ia',
    nome: 'Híbrida com IA',
    descricao_curta: 'Combina estatísticas e usa IA para ponderar critérios.',
    descricao_completa: 'Esta estratégia avançada combina múltiplos indicadores estatísticos (frequência, atraso, soma, paridade, distribuição) e utiliza Inteligência Artificial (via API da Anthropic) para ponderar os critérios com base no contexto atual da loteria. A IA gera uma justificativa em linguagem natural explicando o racional por trás da combinação escolhida.',
    categoria: 'hibrida',
    parametros_padrao: { modelo: 'claude-sonnet-4-6', temperatura: 0.7 },
    ativo: true,
  },
];

export function getEstrategiaPorSlug(slug: string): Estrategia | undefined {
  return ESTRATEGIAS.find(e => e.slug === slug);
}

export function getEstrategiasAtivas(): Estrategia[] {
  return ESTRATEGIAS.filter(e => e.ativo);
}
