export type Mecanica = 'conjunto' | 'posicional';

export interface ComponenteExtra {
  tipo: 'time' | 'mes' | 'trevo';
  nome: string;
  universo_min: number;
  universo_max: number;
  qtd_min: number;
  qtd_max: number;
  obrigatorio: boolean;
}

export interface FaixaColuna {
  total_min: number;
  total_max: number;
  min_coluna: number;
  max_coluna: number;
}

export interface ConfigColunas {
  total_colunas: number;
  universo_min: number;
  universo_max: number;
  min_total: number;
  max_total: number;
  faixas_por_coluna: FaixaColuna[];
}

export interface Loteria {
  id: string;
  slug: string;
  nome: string;
  universo_min: number;
  universo_max: number;
  qtd_dezenas_min: number;
  qtd_dezenas_max: number;
  qtd_dezenas_padrao: number;
  dias_sorteio: string[];
  horario_sorteio: string;
  preco_aposta_base: number;
  regras_vitoria: RegraVitoria[];
  ativo: boolean;
  mecanica?: Mecanica;
  qtd_sorteada?: number;
  componentes_extras?: ComponenteExtra[];
  colunas?: ConfigColunas;
}

export interface RegraVitoria {
  acertos_min: number;
  acertos_max: number;
  descricao: string;
}

export interface Concurso {
  id: string;
  loteria_id: string;
  numero_concurso: number;
  data_sorteio: string;
  dezenas_sorteadas: number[];
  acumulou: boolean;
  valor_acumulado: number;
  valor_estimado_proximo: number;
  data_proximo_concurso: string;
  local_sorteio: string;
  premiacoes: Premiacao[];
  raw_response: unknown;
  criado_em: string;
  atualizado_em: string;
}

export interface Premiacao {
  descricao: string;
  acertos: number;
  ganhadores: number;
  premio: number;
}

export interface ResultadoAposta {
  ganhou: boolean;
  acertos: number;
  total_dezenas: number;
  dezenas_sorteadas: number[];
  concurso_numero: number;
  detalhes: string;
}

export interface Estrategia {
  id: string;
  slug: string;
  nome: string;
  descricao_curta: string;
  descricao_completa: string;
  categoria: 'frequencia' | 'atraso' | 'equilibrio' | 'soma' | 'distribuicao' | 'sistema' | 'exclusao' | 'repeticao' | 'fechamento' | 'hibrida';
  parametros_padrao: Record<string, unknown>;
  ativo: boolean;
}

export interface LoteGeracao {
  id: string;
  usuario_id: string;
  loteria_id: string;
  estrategia_id: string;
  score_minimo: number;
  quantidade_solicitada: number;
  quantidade_gerada: number;
  tempo_execucao_ms: number;
  score_relaxado: boolean;
  criado_em: string;
}

export interface JogoGerado {
  id: string;
  lote_id: string | null;
  usuario_id: string | null;
  loteria_id: string;
  dezenas: number[];
  estrategia_id: string;
  score: number;
  score_breakdown: ScoreBreakdown;
  origem: 'algoritmo' | 'manual' | 'ia_hibrida';
  criado_em: string;
}

export interface ScoreBreakdown {
  frequencia: number;
  atraso: number;
  par_impar: number;
  soma: number;
  distribuicao: number;
  exclusao_padroes: number;
  aderencia_estrategia: number;
  pesos: Record<string, number>;
  total: number;
}

export interface Comparacao {
  id: string;
  jogo_id: string;
  concurso_id: string;
  qtd_acertos: number;
  percentual_acerto: number;
  ja_foi_sorteado_identico: boolean;
  criado_em: string;
}

export interface Bolao {
  id: string;
  usuario_id: string;
  loteria_id: string;
  quantidade_cotas: number;
  custo_total: number;
  jogos_incluidos: string[];
  criado_em: string;
}

export interface Estatisticas {
  frequencia: Map<number, number>;
  frequencia_percentual: Map<number, number>;
  atraso: Map<number, number>;
  distribuicao_par_impar: { par: number; impar: number }[];
  soma_concursos: { min: number; max: number; media: number; desvio_padrao: number; faixa_frequente: [number, number] };
  distribuicao_quadrantes: Map<number, number>;
  repeticao_entre_concursos: number[];
  sequencias_consecutivas: number[];
  terminacoes: Map<number, number>;
}

export interface ResultadoSync {
  sucesso: boolean;
  fonte: string;
  concurso_atual: number;
  proximo_concurso: number;
  data_proximo_sorteio: string;
  valor_acumulado: number;
}
