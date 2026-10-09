import { describe, it, expect } from 'vitest';
import { getLoteriaPorSlug } from '@/lib/loterias';
import { obterRegra } from '@/modules/lottery';
import type { JogoSorteado } from '@/modules/lottery';

const loteria = getLoteriaPorSlug('supersete')!;
const regra = obterRegra(loteria);

describe('Super Sete — regra posicional', () => {
  it('gera exatamente 7 colunas, cada uma com 1 dígito entre 0 e 9', () => {
    const jogo = regra.gerarAleatorio({ loteria, qtdDezenas: 7 });
    expect(jogo.dezenas).toHaveLength(7);
    jogo.dezenas.forEach(d => {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(9);
    });
    expect(jogo.colunas).toHaveLength(7);
    jogo.colunas!.forEach(c => expect(c).toHaveLength(1));
  });

  it('valida jogo simples correto e rejeita comprimento errado', () => {
    expect(regra.validar({ dezenas: [1, 2, 3, 4, 5, 6, 7] }, loteria).valido).toBe(true);
    expect(regra.validar({ dezenas: [1, 2, 3, 4, 5, 6] }, loteria).valido).toBe(false);
    expect(regra.validar({ dezenas: [1, 2, 3, 4, 5, 6, 10] }, loteria).valido).toBe(false);
  });

  it('aposta múltipla: 8–14 números usa 1–2 por coluna; 15–21 usa 2–3 por coluna', () => {
    const jogo8 = regra.gerarAleatorio({ loteria, qtdDezenas: 8 });
    const total8 = jogo8.colunas!.reduce((s, c) => s + c.length, 0);
    expect(total8).toBe(8);
    jogo8.colunas!.forEach(c => {
      expect(c.length).toBeGreaterThanOrEqual(1);
      expect(c.length).toBeLessThanOrEqual(2);
    });

    const jogo15 = regra.gerarAleatorio({ loteria, qtdDezenas: 15 });
    const total15 = jogo15.colunas!.reduce((s, c) => s + c.length, 0);
    expect(total15).toBe(15);
    jogo15.colunas!.forEach(c => {
      expect(c.length).toBeGreaterThanOrEqual(2);
      expect(c.length).toBeLessThanOrEqual(3);
    });
  });

  it('custo: simples = R$3,00; múltipla = produto das colunas × base', () => {
    expect(regra.custo({ dezenas: [1, 2, 3, 4, 5, 6, 7] }, loteria)).toBeCloseTo(3.0);
    const multipla: JogoSorteado = {
      dezenas: [1, 2, 3, 4, 5, 6, 7],
      colunas: [[1], [2], [3], [4], [5], [6], [7, 8]],
    };
    expect(regra.custo(multipla, loteria)).toBeCloseTo(6.0);
  });

  it('chave posicional distingue a mesma dezena em colunas diferentes', () => {
    const a = regra.chave({ dezenas: [1, 2, 3, 4, 5, 6, 7] });
    const b = regra.chave({ dezenas: [7, 2, 3, 4, 5, 6, 1] });
    expect(a).not.toBe(b);
  });

  it('conferência é posicional: dígito certo na coluna errada não conta', () => {
    const jogo: JogoSorteado = { dezenas: [1, 2, 3, 4, 5, 6, 7] };
    const sorteio: JogoSorteado = { dezenas: [1, 2, 3, 4, 5, 6, 7] };
    expect(regra.conferir(jogo, sorteio, loteria).acertos).toBe(7);

    // Mesmos dígitos, mas 1 e 7 trocados de coluna → 2 erros.
    const trocado: JogoSorteado = { dezenas: [7, 2, 3, 4, 5, 6, 1] };
    const r2 = regra.conferir(trocado, sorteio, loteria);
    expect(r2.acertos).toBe(5);
    expect(r2.acertosPosicionais).toEqual([false, true, true, true, true, true, false]);
  });

  it('aposta múltipla: coluna acerta se qualquer dígito marcado coincidir', () => {
    const jogo: JogoSorteado = {
      dezenas: [1, 2, 3, 4, 5, 6, 7],
      colunas: [[1], [2], [3], [4], [5], [6], [7, 8]],
    };
    // Sorteio marca 8 na 7ª coluna — aposta tem 7 e 8 → acerta.
    const sorteio: JogoSorteado = { dezenas: [1, 2, 3, 4, 5, 6, 8] };
    const r = regra.conferir(jogo, sorteio, loteria);
    expect(r.acertos).toBe(7);
    expect(r.acertosPosicionais).toEqual([true, true, true, true, true, true, true]);

    // Sorteio marca 9 na 7ª coluna → aposta não tem 9 → 6 acertos.
    const sorteio9: JogoSorteado = { dezenas: [1, 2, 3, 4, 5, 6, 9] };
    expect(regra.conferir(jogo, sorteio9, loteria).acertos).toBe(6);
  });

  it('chave de aposta múltipla distingue dezenas diferentes na mesma coluna', () => {
    const a: JogoSorteado = {
      dezenas: [1, 2, 3, 4, 5, 6, 7],
      colunas: [[1], [2], [3], [4], [5], [6], [7, 8]],
    };
    const b: JogoSorteado = {
      dezenas: [1, 2, 3, 4, 5, 6, 7],
      colunas: [[1], [2], [3], [4], [5], [6], [7, 9]],
    };
    expect(regra.chave(a)).not.toBe(regra.chave(b));
    expect(regra.chave(a)).not.toBe(regra.chave({ dezenas: [1, 2, 3, 4, 5, 6, 7] }));
  });
});
