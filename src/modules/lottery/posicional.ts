import { Loteria } from '@/types';
import {
  ContextoGeracao,
  JogoSorteado,
  RegraLoteria,
  ResultadoConferencia,
  ResultadoValidacao,
} from './index';

function distribuirColunas(
  loteria: Loteria,
  total: number,
  rng: () => number
): number[] | null {
  const cfg = loteria.colunas;
  if (!cfg) return null;

  const totalSeguro = Math.min(Math.max(total, cfg.min_total), cfg.max_total);
  const faixa = cfg.faixas_por_coluna.find(
    f => totalSeguro >= f.total_min && totalSeguro <= f.total_max
  );
  if (!faixa) return null;

  const counts = new Array(cfg.total_colunas).fill(faixa.min_coluna);
  let restante = totalSeguro - faixa.min_coluna * cfg.total_colunas;

  let guarda = 0;
  while (restante > 0 && guarda <= cfg.total_colunas * 10) {
    guarda++;
    const idx = Math.floor(rng() * cfg.total_colunas);
    if (counts[idx] < faixa.max_coluna) {
      counts[idx]++;
      restante--;
    }
  }
  return counts;
}

function faixaTotal(loteria: Loteria, total: number) {
  return loteria.colunas?.faixas_por_coluna.find(
    f => total >= f.total_min && total <= f.total_max
  );
}

export const regraPosicional: RegraLoteria = {
  mecanica: 'posicional',

  gerarAleatorio(ctx: ContextoGeracao): JogoSorteado {
    const rng = ctx.rng ?? Math.random;
    const { loteria, qtdDezenas } = ctx;
    const cfg = loteria.colunas;
    if (!cfg) return { dezenas: [] };

    const counts = ctx.qtdPorColuna ?? distribuirColunas(loteria, qtdDezenas, rng) ?? [];
    const colunas: number[][] = [];
    const dezenas: number[] = [];

    for (let col = 0; col < cfg.total_colunas; col++) {
      const qtd = counts[col] ?? 1;
      const universo: number[] = [];
      for (let i = cfg.universo_min; i <= cfg.universo_max; i++) universo.push(i);
      const marcados = new Set<number>();
      let guarda = 0;
      while (marcados.size < qtd && guarda < 100) {
        guarda++;
        marcados.add(Math.floor(rng() * (cfg.universo_max - cfg.universo_min + 1)) + cfg.universo_min);
      }
      const arr = Array.from(marcados).sort((a, b) => a - b);
      colunas.push(arr);
      dezenas.push(arr[0]);
    }

    return { dezenas, extras: ctx.extras, colunas };
  },

  validar(jogo: JogoSorteado, loteria: Loteria): ResultadoValidacao {
    const erros: string[] = [];
    const cfg = loteria.colunas;
    if (!cfg) return { valido: false, erros: ['Configuração de colunas ausente'] };

    if (jogo.dezenas.length !== cfg.total_colunas) {
      erros.push(`Esperado ${cfg.total_colunas} colunas, obtido ${jogo.dezenas.length}`);
    }
    if (jogo.dezenas.some(d => d < cfg.universo_min || d > cfg.universo_max)) {
      erros.push('Dígito fora do intervalo 0-9');
    }

    const colunas = jogo.colunas;
    if (colunas) {
      if (colunas.length !== cfg.total_colunas) {
        erros.push(`Esperado ${cfg.total_colunas} colunas marcadas`);
      }
      const total = colunas.reduce((s, c) => s + c.length, 0);
      const faixa = faixaTotal(loteria, total);
      if (!faixa) {
        erros.push(`Total de números ${total} fora de ${cfg.min_total}-${cfg.max_total}`);
      } else {
        colunas.forEach((c, i) => {
          if (c.length < faixa.min_coluna || c.length > faixa.max_coluna) {
            erros.push(`Coluna ${i + 1} com ${c.length} números (permitido ${faixa.min_coluna}-${faixa.max_coluna})`);
          }
          if (c.some(d => d < cfg.universo_min || d > cfg.universo_max)) {
            erros.push(`Coluna ${i + 1} com dígito fora de 0-9`);
          }
        });
      }
    }

    return { valido: erros.length === 0, erros };
  },

  conferir(jogo: JogoSorteado, sorteio: JogoSorteado): ResultadoConferencia {
    const acertosPosicionais: boolean[] = [];
    let acertos = 0;
    for (let col = 0; col < jogo.dezenas.length; col++) {
      const acertou = jogo.dezenas[col] === sorteio.dezenas[col];
      acertosPosicionais.push(acertou);
      if (acertou) acertos++;
    }
    const faixa = jogo.dezenas.length > 0
      ? { descricao: `${acertos} colunas certas`, acertos }
      : null;
    const percentual = jogo.dezenas.length > 0
      ? Math.round((acertos / jogo.dezenas.length) * 100)
      : 0;
    return { acertos, acertosPosicionais, faixa, percentual };
  },

  custo(jogo: JogoSorteado, loteria: Loteria): number {
    const base = loteria.preco_aposta_base;
    const colunas = jogo.colunas;
    if (colunas && colunas.length > 0) {
      const combinacoes = colunas.reduce((acc, c) => acc * Math.max(1, c.length), 1);
      return combinacoes * base;
    }
    return base;
  },

  chave(jogo: JogoSorteado): string {
    return jogo.dezenas.join(':');
  },
};
