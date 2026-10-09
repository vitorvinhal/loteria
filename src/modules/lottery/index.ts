import { Loteria, Estatisticas } from '@/types';
import { regraConjunto, gerarExtras } from './conjunto';
import { regraPosicional } from './posicional';

export interface JogoSorteado {
  dezenas: number[];
  extras?: Record<string, number[]>;
  colunas?: number[][];
}

export interface ResultadoValidacao {
  valido: boolean;
  erros: string[];
}

export interface FaixaPremio {
  descricao: string;
  acertos: number;
}

export interface ResultadoConferencia {
  acertos: number;
  acertosPosicionais?: boolean[];
  faixa: FaixaPremio | null;
  extraAcertou?: boolean;
  percentual: number;
}

export interface ContextoGeracao {
  loteria: Loteria;
  estatisticas?: Estatisticas;
  qtdDezenas: number;
  qtdPorColuna?: number[];
  extras?: Record<string, number[]>;
  rng?: () => number;
}

export interface RegraLoteria {
  mecanica: 'conjunto' | 'posicional';
  gerarAleatorio(ctx: ContextoGeracao): JogoSorteado;
  validar(jogo: JogoSorteado, loteria: Loteria): ResultadoValidacao;
  conferir(jogo: JogoSorteado, sorteio: JogoSorteado, loteria: Loteria): ResultadoConferencia;
  custo(jogo: JogoSorteado, loteria: Loteria): number;
  chave(jogo: JogoSorteado): string;
}

export function obterRegra(loteria: Loteria): RegraLoteria {
  return loteria.mecanica === 'posicional' && loteria.colunas
    ? regraPosicional
    : regraConjunto;
}

export { gerarExtras };
export { combinacao } from './conjunto';
