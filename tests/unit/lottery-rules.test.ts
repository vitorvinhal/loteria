import { describe, it, expect } from 'vitest';
import { LOTERIAS, getLoteriaPorSlug } from '@/lib/loterias';
import { obterRegra } from '@/modules/lottery';

describe('Regras por modalidade — geração válida', () => {
  for (const loteria of LOTERIAS) {
    it(`${loteria.nome}: gera jogo válido com a quantidade padrão`, () => {
      const regra = obterRegra(loteria);
      const qtd = loteria.qtd_dezenas_padrao;
      const jogo = regra.gerarAleatorio({ loteria, qtdDezenas: qtd });
      const validacao = regra.validar(jogo, loteria);
      expect(validacao.erros).toEqual([]);
      expect(validacao.valido).toBe(true);
    });
  }

  it('loterias de conjunto têm limite de aposta coerente', () => {
    expect(getLoteriaPorSlug('megasena')!.qtd_dezenas_max).toBe(20);
    expect(getLoteriaPorSlug('lotofacil')!.qtd_dezenas_max).toBe(20);
    expect(getLoteriaPorSlug('lotomania')!.qtd_dezenas_min).toBe(50);
    expect(getLoteriaPorSlug('maismilionaria')!.qtd_dezenas_max).toBe(12);
    expect(getLoteriaPorSlug('supersete')!.qtd_dezenas_max).toBe(21);
  });
});

describe('Preços oficiais (aposta simples)', () => {
  const simples: Record<string, { qtd: number; esperado: number }> = {
    lotofacil: { qtd: 15, esperado: 3.5 },
    megasena: { qtd: 6, esperado: 6.0 },
    quina: { qtd: 5, esperado: 3.0 },
    lotomania: { qtd: 50, esperado: 3.0 },
    duplasena: { qtd: 6, esperado: 3.0 },
    timemania: { qtd: 10, esperado: 3.5 },
    diadesorte: { qtd: 7, esperado: 2.5 },
    maismilionaria: { qtd: 6, esperado: 6.0 },
    supersete: { qtd: 7, esperado: 3.0 },
  };

  for (const [slug, { qtd, esperado }] of Object.entries(simples)) {
    it(`${slug}: simples = R$ ${esperado.toFixed(2)}`, () => {
      const loteria = getLoteriaPorSlug(slug)!;
      const regra = obterRegra(loteria);
      const jogo = regra.gerarAleatorio({ loteria, qtdDezenas: qtd });
      expect(regra.custo(jogo, loteria)).toBeCloseTo(esperado);
    });
  }

  it('Mega-Sena com 7 dezenas = 7 × R$6,00', () => {
    const loteria = getLoteriaPorSlug('megasena')!;
    const regra = obterRegra(loteria);
    const jogo = regra.gerarAleatorio({ loteria, qtdDezenas: 7 });
    expect(regra.custo(jogo, loteria)).toBeCloseTo(42.0);
  });
});
