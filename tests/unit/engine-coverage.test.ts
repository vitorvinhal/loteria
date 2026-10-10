import { describe, expect, it } from "vitest";
import { LOTERIAS } from "@/lib/loterias";
import { obterRegra } from "@/modules/lottery";

// Evidência de que o motor novo cobre as 9 modalidades oficiais:
// gera N jogos aleatórios por loteria e exige que TODOS passem em
// validar() + custo() > 0. Se uma regra estiver errada, este teste falha.
describe("cobertura do motor nas 9 modalidades", () => {
  expect(LOTERIAS.length).toBe(9);

  it.each(LOTERIAS.map((l) => [l.slug, l] as const))(
    "%s: 200 jogos aleatórios validam pelo motor",
    (slug, loteria) => {
      const regra = obterRegra(loteria);
      for (let i = 0; i < 200; i++) {
        const jogo = regra.gerarAleatorio({
          loteria,
          qtdDezenas: loteria.qtd_dezenas_padrao,
        });

        const validacao = regra.validar(jogo, loteria);
        expect(
          validacao.erros,
          `${slug} jogo #${i}: ${validacao.erros.join("; ")}`
        ).toEqual([]);

        expect(regra.custo(jogo, loteria), `${slug} custo #${i}`).toBeGreaterThan(0);
        expect(regra.chave(jogo).length, `${slug} chave #${i}`).toBeGreaterThan(0);
      }
    }
  );

  it("extras obrigatórios (timemania/dia de sorte/+milionária) sempre presentes", () => {
    for (const slug of ["timemania", "diadesorte", "maismilionaria"]) {
      const loteria = LOTERIAS.find((l) => l.slug === slug)!;
      const regra = obterRegra(loteria);
      for (let i = 0; i < 50; i++) {
        const jogo = regra.gerarAleatorio({ loteria, qtdDezenas: loteria.qtd_dezenas_padrao });
        expect(jogo.extras, `${slug} sem extras #${i}`).toBeTruthy();
        for (const comp of loteria.componentes_extras ?? []) {
          expect(jogo.extras?.[comp.tipo]?.length, `${slug}.${comp.tipo}`).toBeGreaterThanOrEqual(
            comp.qtd_min
          );
        }
      }
    }
  });

  it("Super Sete: colunas sempre geradas e dentro da faixa", () => {
    const loteria = LOTERIAS.find((l) => l.slug === "supersete")!;
    const regra = obterRegra(loteria);
    for (let i = 0; i < 100; i++) {
      const jogo = regra.gerarAleatorio({ loteria, qtdDezenas: loteria.qtd_dezenas_padrao });
      expect(jogo.colunas, `sem colunas #${i}`).toBeDefined();
      expect(jogo.colunas!.length, `colunas #${i}`).toBe(7);
      const total = jogo.colunas!.reduce((s, c) => s + c.length, 0);
      expect(total, `total #${i}`).toBeGreaterThanOrEqual(7);
      expect(regra.validar(jogo, loteria).erros).toEqual([]);
    }
  });

  it("custo Super Sete segue a tabela (produto × base)", () => {
    const loteria = LOTERIAS.find((l) => l.slug === "supersete")!;
    const regra = obterRegra(loteria);
    // simples: 1 por coluna → 1 × R$3
    expect(regra.custo({ dezenas: [1, 2, 3, 4, 5, 6, 7] }, loteria)).toBeCloseTo(3, 5);
    // múltipla: 2×1×1×1×1×1×1 → 2 × R$3
    expect(
      regra.custo(
        { dezenas: [1, 2, 3, 4, 5, 6, 7], colunas: [[1, 8], [2], [3], [4], [5], [6], [7]] },
        loteria
      )
    ).toBeCloseTo(6, 5);
  });
});
