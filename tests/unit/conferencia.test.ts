import { describe, it, expect } from 'vitest';
import { getLoteriaPorSlug } from '@/lib/loterias';
import { obterRegra } from '@/modules/lottery';

describe('Conferência por modalidade', () => {
  it('Mega-Sena: 6 acertos = faixa máxima', () => {
    const l = getLoteriaPorSlug('megasena')!;
    const r = obterRegra(l).conferir(
      { dezenas: [1, 2, 3, 4, 5, 6] },
      { dezenas: [1, 2, 3, 4, 5, 6] },
      l
    );
    expect(r.acertos).toBe(6);
    expect(r.faixa?.descricao).toContain('Prêmio máximo');
  });

  it('Lotomania: 0 acertos é faixa especial', () => {
    const l = getLoteriaPorSlug('lotomania')!;
    const jogo = { dezenas: Array.from({ length: 50 }, (_, i) => i) };
    const sorteio = { dezenas: Array.from({ length: 20 }, (_, i) => 80 + i) };
    const r = obterRegra(l).conferir(jogo, sorteio, l);
    expect(r.acertos).toBe(0);
    expect(r.faixa?.descricao.toLowerCase()).toContain('0 acertos');
  });

  it('Timemania: acerto do Time do Coração', () => {
    const l = getLoteriaPorSlug('timemania')!;
    const jogo = { dezenas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], extras: { time: [5] } };
    const sorteio = { dezenas: [1, 2, 3, 11, 12, 13, 14], extras: { time: [5] } };
    const r = obterRegra(l).conferir(jogo, sorteio, l);
    expect(r.acertos).toBe(3);
    expect(r.extraAcertou).toBe(true);
  });

  it('Dia de Sorte: acerto do Mês da Sorte', () => {
    const l = getLoteriaPorSlug('diadesorte')!;
    const jogo = { dezenas: [1, 2, 3, 4, 5, 6, 7], extras: { mes: [3] } };
    const sorteio = { dezenas: [1, 2, 3, 4, 20, 21, 22], extras: { mes: [3] } };
    const r = obterRegra(l).conferir(jogo, sorteio, l);
    expect(r.acertos).toBe(4);
    expect(r.extraAcertou).toBe(true);
  });

  it('+Milionária: confere trevos', () => {
    const l = getLoteriaPorSlug('maismilionaria')!;
    const jogo = { dezenas: [1, 2, 3, 4, 5, 6], extras: { trevo: [1, 2] } };
    const sorteio = { dezenas: [1, 2, 3, 4, 5, 6], extras: { trevo: [1, 3] } };
    const r = obterRegra(l).conferir(jogo, sorteio, l);
    expect(r.acertos).toBe(6);
    expect(r.extraAcertou).toBe(true);
  });

  it('Dupla Sena: usa o sorteio informado (1º sorteio)', () => {
    const l = getLoteriaPorSlug('duplasena')!;
    const r = obterRegra(l).conferir(
      { dezenas: [1, 2, 3, 4, 5, 6] },
      { dezenas: [1, 2, 3, 41, 42, 43] },
      l
    );
    expect(r.acertos).toBe(3);
    expect(r.faixa?.descricao.toLowerCase()).toContain('3');
  });
});
