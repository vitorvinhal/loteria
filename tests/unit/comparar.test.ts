import { describe, expect, it } from "vitest";
import { compararJogo } from "@/modules/lottery/comparar";
import { LOTERIAS } from "@/lib/loterias";
import type { Concurso } from "@/types";

function loteria(slug: string) {
  const l = LOTERIAS.find((x) => x.slug === slug);
  if (!l) throw new Error(`loteria ${slug} não encontrada`);
  return l;
}

function concurso(sobre: Partial<Concurso> = {}): Concurso {
  return {
    id: "c1",
    loteria_id: "x",
    numero_concurso: 1,
    data_sorteio: "2026-01-01",
    dezenas_sorteadas: [],
    acumulou: false,
    valor_acumulado: 0,
    valor_estimado_proximo: 0,
    data_proximo_concurso: "",
    local_sorteio: "",
    premiacoes: [],
    raw_response: {},
    criado_em: "",
    atualizado_em: "",
    ...sobre,
  };
}

describe("compararJogo — conjunto (Lotofácil)", () => {
  it("conta acertos por interseção e monta a grade", () => {
    const jogo = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const r = compararJogo(
      jogo,
      concurso({ dezenas_sorteadas: jogo }),
      loteria("lotofacil")
    );
    expect(r.acertos).toHaveLength(15);
    expect(r.erros).toHaveLength(0);
    expect(r.percentual).toBe(100);
    expect(r.grades[0]?.nome).toBe("15 acertos");
    expect(r.faixaPremio).not.toBe("Sem premiação");
  });
});

describe("compararJogo — Super Sete posicional", () => {
  const sorteio = [1, 2, 3, 4, 5, 6, 7];

  it("simples: compara dígito a dígito por posição", () => {
    const r = compararJogo(
      [1, 9, 3, 8, 5, 0, 7],
      concurso({ dezenas_sorteadas: sorteio }),
      loteria("supersete")
    );
    expect(r.acertos).toEqual([1, 3, 5, 7]);
    expect(r.erros).toEqual([9, 8, 0]);
    expect(r.percentual).toBe(Math.round((4 / 7) * 100));
  });

  it("múltipla: coluna acerta se QUALQUER dígito marcado coincidir", () => {
    const r = compararJogo(
      [8, 9, 3, 4, 5, 6, 7],
      concurso({ dezenas_sorteadas: sorteio }),
      loteria("supersete"),
      undefined,
      undefined,
      { colunas: [[1, 8], [9], [3], [4], [5], [6], [7]] }
    );
    // coluna 0 marcada [1,8]: apesar de dezenas[0]=8, o sorteio é 1 → acerto
    expect(r.acertos).toEqual([1, 3, 4, 5, 6, 7]);
    expect(r.erros).toEqual([9]);
  });
});

describe("compararJogo — Dupla Sena (2 sorteios)", () => {
  const sorteio = [1, 2, 3, 4, 5, 6, 11, 12, 13, 14, 15, 20];
  const premiacoes = [
    { descricao: "6 acertos - 1º sorteio", acertos: 6, ganhadores: 1, premio: 50000 },
    { descricao: "5 acertos - 1º sorteio", acertos: 5, ganhadores: 2, premio: 2000 },
    { descricao: "4 acertos - 1º sorteio", acertos: 4, ganhadores: 3, premio: 500 },
    { descricao: "3 acertos - 1º sorteio", acertos: 3, ganhadores: 4, premio: 100 },
    { descricao: "6 acertos - 2º sorteio", acertos: 6, ganhadores: 1, premio: 40000 },
    { descricao: "5 acertos - 2º sorteio", acertos: 5, ganhadores: 2, premio: 3000 },
    { descricao: "4 acertos - 2º sorteio", acertos: 4, ganhadores: 3, premio: 400 },
    { descricao: "3 acertos - 2º sorteio", acertos: 3, ganhadores: 5, premio: 50 },
  ];

  it("divide as dezenas nos 2 sorteios e usa metade das faixas para cada", () => {
    const r = compararJogo(
      [1, 2, 3, 4, 5, 6, 11, 12, 13, 14, 15, 16],
      concurso({ dezenas_sorteadas: sorteio, premiacoes }),
      loteria("duplasena")
    );
    expect(r.acertos).toHaveLength(6);
    expect(r.acertos2).toEqual([11, 12, 13, 14, 15]);
    // mesma aposta disputa os 2 sorteios: erros2 = o que falhou no 2º
    expect(r.erros2).toEqual([1, 2, 3, 4, 5, 6, 16]);
    expect(r.valorPremio).toBe(50000);
    expect(r.valorPremio2).toBe(3000);
    expect(r.faixaPremio2).toBe("5 acertos - 2º sorteio");
    expect(r.percentual).toBe(50); // max(6,5)/12
  });
});

describe("compararJogo — extras conferidos contra o raw do concurso", () => {
  it("Timemania: time do coração", () => {
    const r = compararJogo(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      concurso({
        dezenas_sorteadas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        raw_response: { timeCoracao: 42 },
      }),
      loteria("timemania"),
      undefined,
      undefined,
      { time: [42] }
    );
    expect(r.extraInfo?.[0]).toContain("1/1");
    expect(r.extraInfo?.[0]).toContain("⚽");
  });

  it("+Milionária: 1 de 2 trevos acertados", () => {
    const r = compararJogo(
      [1, 2, 3, 4, 5, 6],
      concurso({
        dezenas_sorteadas: [1, 2, 3, 4, 5, 6],
        raw_response: { trevos: [5, 7] },
      }),
      loteria("maismilionaria"),
      undefined,
      undefined,
      { trevo: [2, 5] }
    );
    expect(r.extraInfo?.[0]).toContain("🍀");
    expect(r.extraInfo?.[0]).toContain("1/2");
  });
});

describe("compararJogo — avisos de formato antigo", () => {
  it("Super Sete sem metadados sinaliza conferência aproximada", () => {
    const r = compararJogo(
      [1, 9, 3, 8, 5, 0, 7],
      concurso({ dezenas_sorteadas: [1, 2, 3, 4, 5, 6, 7] }),
      loteria("supersete")
    );
    expect(r.avisos?.[0]).toContain("aproximada");
    expect(r.acertos).toHaveLength(4); // segue conferindo pelo fallback
  });

  it("extras obrigatórios ausentes geram aviso e não quebram a conferência", () => {
    const r = compararJogo(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      concurso({
        dezenas_sorteadas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        raw_response: { timeCoracao: 42 },
      }),
      loteria("timemania")
    );
    expect(r.acertos).toHaveLength(10);
    expect(r.avisos?.[0]).toContain("time");
    expect(r.extraInfo).toBeUndefined();
  });

  it("jogo completo não gera avisos", () => {
    const r = compararJogo(
      [1, 8, 3, 4, 5, 6, 7],
      concurso({ dezenas_sorteadas: [1, 2, 3, 4, 5, 6, 7] }),
      loteria("supersete"),
      undefined,
      undefined,
      { colunas: [[1], [2], [3], [4], [5], [6], [7]] }
    );
    expect(r.avisos).toBeUndefined();
  });
});
