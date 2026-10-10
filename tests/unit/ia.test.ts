import { describe, expect, it } from "vitest";
import {
  montarMensagensIA,
  limparConteudoIA,
  validarJogosIA,
  topFrequencias,
} from "@/modules/generation/ia";
import { obterRegra } from "@/modules/lottery";
import { LOTERIAS } from "@/lib/loterias";
import type { Loteria } from "@/types";

function loteria(slug: string): Loteria {
  const l = LOTERIAS.find((x) => x.slug === slug);
  if (!l) throw new Error(`loteria ${slug} não encontrada`);
  return l;
}

describe("montarMensagensIA", () => {
  it("inclui regras, quantidade e formato JSON", () => {
    const { system, user } = montarMensagensIA(loteria("megasena"), 5);
    expect(system).toContain("JSON");
    expect(user).toContain("Mega-Sena");
    expect(user).toContain("exatamente 6");
    expect(user).toContain("5 jogos distintos");
    expect(user).not.toContain("extras");
  });

  it("inclui extras obrigatórios com universo", () => {
    const { user } = montarMensagensIA(loteria("maismilionaria"), 3);
    expect(user).toContain('"trevo"');
    expect(user).toContain('"extras"');
  });

  it("descreve a mecânica posicional do Super Sete", () => {
    const { user } = montarMensagensIA(loteria("supersete"), 4);
    expect(user).toContain("posicional");
    expect(user).toContain("7 colunas");
  });

  it("inclui estratégia e top frequências quando fornecidas", () => {
    const { user } = montarMensagensIA(loteria("lotofacil"), 10, {
      estrategia: { nome: "Quentes", descricao_curta: "Prioriza dezenas sorteadas." },
      topFrequentes: [
        [12, 30],
        [7, 25],
      ],
    });
    expect(user).toContain("Quentes");
    expect(user).toContain("12 (30x)");
    expect(user).toContain("7 (25x)");
  });
});

describe("limparConteudoIA", () => {
  it("remove cercas de markdown", () => {
    expect(limparConteudoIA('```json\n{"jogos":[]}\n```')).toBe('{"jogos":[]}');
  });

  it("extrai o objeto JSON de meio de texto", () => {
    expect(limparConteudoIA('Aqui estão: {"jogos":[1]} obrigado!')).toBe('{"jogos":[1]}');
  });
});

describe("validarJogosIA", () => {
  const regraDe = (l: Loteria) => obterRegra(l);

  it("aceita jogo válido e descarta fora de regra", () => {
    const l = loteria("megasena");
    const r = validarJogosIA(
      { jogos: [{ dezenas: [1, 2, 3, 4, 5, 6] }, { dezenas: [1, 2, 3] }, { dezenas: [1, 1, 2, 3, 4, 5] }] },
      l,
      regraDe(l)
    );
    expect(r.validos).toHaveLength(1);
    expect(r.descartados).toBe(2);
    expect(r.validos[0].dezenas).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("remove duplicados entre jogos do modelo", () => {
    const l = loteria("megasena");
    const r = validarJogosIA(
      { jogos: [{ dezenas: [10, 20, 30, 40, 50, 60] }, { dezenas: [60, 50, 40, 30, 20, 10] }] },
      l,
      regraDe(l)
    );
    expect(r.validos).toHaveLength(1);
    expect(r.descartados).toBe(1);
  });

  it("monta colunas no formato posicional (Super Sete)", () => {
    const l = loteria("supersete");
    const r = validarJogosIA(
      { jogos: [{ dezenas: [1, 8, 3, 4, 5, 6, 7] }] },
      l,
      regraDe(l)
    );
    expect(r.validos).toHaveLength(1);
    expect(r.validos[0].colunas).toEqual([[1], [8], [3], [4], [5], [6], [7]]);
  });

  it("valida extras obrigatórios (aceita válido, descarta ausente/fora de faixa)", () => {
    const l = loteria("timemania");
    const r = validarJogosIA(
      {
        jogos: [
          { dezenas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], extras: { time: [42] } },
          { dezenas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11], extras: { time: [999] } },
          { dezenas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 12] },
        ],
      },
      l,
      regraDe(l)
    );
    expect(r.validos).toHaveLength(1);
    expect(r.validos[0].extras).toEqual({ time: [42] });
    expect(r.descartados).toBe(2);
  });

  it("retorna vazio para resposta malformada", () => {
    const l = loteria("megasena");
    expect(validarJogosIA(null, l, regraDe(l)).validos).toHaveLength(0);
    expect(validarJogosIA({ algo: [] }, l, regraDe(l)).validos).toHaveLength(0);
    expect(validarJogosIA({ jogos: "x" }, l, regraDe(l)).validos).toHaveLength(0);
  });
});

describe("topFrequencias", () => {
  it("ordena por frequência e limita", () => {
    const freq = new Map([
      [5, 10],
      [1, 30],
      [9, 30],
      [2, 5],
    ]);
    const top = topFrequencias(freq, 3);
    expect(top).toEqual([
      [1, 30],
      [9, 30],
      [5, 10],
    ]);
  });
});
