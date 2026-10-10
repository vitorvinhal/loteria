import { Loteria } from '@/types';
import {
  ContextoGeracao,
  JogoSorteado,
  RegraLoteria,
  ResultadoConferencia,
  ResultadoValidacao,
  FaixaPremio,
} from './index';

export function combinacao(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let resultado = 1;
  for (let i = 0; i < k; i++) {
    resultado = (resultado * (n - i)) / (i + 1);
  }
  return Math.round(resultado);
}

function amostrar(universo: number[], quantidade: number, rng: () => number): number[] {
  const copia = [...universo];
  const selecionados: number[] = [];
  for (let i = 0; i < quantidade && copia.length > 0; i++) {
    const idx = Math.floor(rng() * copia.length);
    selecionados.push(copia.splice(idx, 1)[0]);
  }
  return selecionados;
}

export function gerarExtras(
  loteria: Loteria,
  rng: () => number = Math.random
): Record<string, number[]> | undefined {
  if (!loteria.componentes_extras || loteria.componentes_extras.length === 0) return undefined;

  const extras: Record<string, number[]> = {};
  for (const comp of loteria.componentes_extras) {
    const universo: number[] = [];
    for (let i = comp.universo_min; i <= comp.universo_max; i++) universo.push(i);
    extras[comp.tipo] = amostrar(universo, comp.qtd_min, rng).sort((a, b) => a - b);
  }
  return extras;
}

export const regraConjunto: RegraLoteria = {
  mecanica: 'conjunto',

  gerarAleatorio(ctx: ContextoGeracao): JogoSorteado {
    const rng = ctx.rng ?? Math.random;
    const { loteria, qtdDezenas } = ctx;
    const universo: number[] = [];
    for (let i = loteria.universo_min; i <= loteria.universo_max; i++) universo.push(i);
    const dezenas = amostrar(universo, qtdDezenas, rng).sort((a, b) => a - b);
    return { dezenas, extras: ctx.extras ?? gerarExtras(loteria, rng) };
  },

  validar(jogo: JogoSorteado, loteria: Loteria): ResultadoValidacao {
    const erros: string[] = [];
    const { dezenas } = jogo;
    const unicos = new Set(dezenas);

    if (dezenas.length < loteria.qtd_dezenas_min || dezenas.length > loteria.qtd_dezenas_max) {
      erros.push(`Quantidade ${dezenas.length} fora do intervalo ${loteria.qtd_dezenas_min}-${loteria.qtd_dezenas_max}`);
    }
    if (unicos.size !== dezenas.length) erros.push('Dezenas duplicadas');
    if (dezenas.some(d => d < loteria.universo_min || d > loteria.universo_max)) {
      erros.push('Dezena fora do universo');
    }
    if (loteria.componentes_extras) {
      for (const comp of loteria.componentes_extras) {
        const val = jogo.extras?.[comp.tipo] ?? [];
        if (comp.obrigatorio && (val.length < comp.qtd_min || val.length > comp.qtd_max)) {
          erros.push(`Extra ${comp.tipo} fora do intervalo ${comp.qtd_min}-${comp.qtd_max}`);
        }
        if (val.length > 0 && val.some(v => v < comp.universo_min || v > comp.universo_max)) {
          erros.push(`Extra ${comp.tipo} valor fora do universo ${comp.universo_min}-${comp.universo_max}`);
        }
      }
    }
    return { valido: erros.length === 0, erros };
  },

  conferir(jogo: JogoSorteado, sorteio: JogoSorteado, loteria: Loteria): ResultadoConferencia {
    const setSorteio = new Set(sorteio.dezenas);
    const acertos = jogo.dezenas.filter(d => setSorteio.has(d)).length;
    const faixa = encontrarFaixa(acertos, loteria);
    const qtdSorteada = loteria.qtd_sorteada || loteria.qtd_dezenas_padrao;
    const percentual = qtdSorteada > 0 ? Math.round((acertos / qtdSorteada) * 100) : 0;

    let extraAcertou: boolean | undefined;
    if (loteria.componentes_extras) {
      for (const comp of loteria.componentes_extras) {
        const doJogo = jogo.extras?.[comp.tipo] ?? [];
        const doSorteio = sorteio.extras?.[comp.tipo] ?? [];
        if (doJogo.length && doSorteio.length) {
          const acerto = doJogo.some(v => doSorteio.includes(v));
          extraAcertou = (extraAcertou ?? true) && acerto;
        }
      }
    }

    return { acertos, faixa, extraAcertou, percentual };
  },

  custo(jogo: JogoSorteado, loteria: Loteria): number {
    const base = loteria.preco_aposta_base;
    const qtdSorteada = loteria.qtd_sorteada || loteria.qtd_dezenas_padrao;
    // Modalidades de preço fixo: a aposta é única independentemente da
    // quantidade de dezenas marcadas.
    if (loteria.slug === 'lotomania' || loteria.slug === 'timemania') {
      return base;
    }
    if (loteria.slug === 'maismilionaria') {
      const nTrevo = jogo.extras?.trevo?.length ?? 2;
      return combinacao(jogo.dezenas.length, 6) * combinacao(nTrevo, 2) * base;
    }
    return combinacao(jogo.dezenas.length, qtdSorteada) * base;
  },

  chave(jogo: JogoSorteado): string {
    return [...jogo.dezenas].sort((a, b) => a - b).join('-');
  },
};

function encontrarFaixa(acertos: number, loteria: Loteria): FaixaPremio | null {
  const regra = loteria.regras_vitoria.find(
    r => acertos >= r.acertos_min && acertos <= r.acertos_max
  );
  return regra ? { descricao: regra.descricao, acertos } : null;
}
