import { describe, expect, it } from "vitest";
import { gerarPalpiteForte } from "@/modules/generation/palpite";
import { LOTERIAS } from "@/lib/loterias";
import type { Estatisticas, Loteria } from "@/types";

function loteria(slug: string): Loteria {
  const l = LOTERIAS.find((x) => x.slug === slug);
  if (!l) throw new Error(`loteria ${slug} não encontrada`);
  return l;
}

function statsFake(l: Loteria): Estatisticas {
  const frequencia = new Map<number, number>();
  const atraso = new Map<number, number>();
  for (let i = l.universo_min; i <= l.universo_max; i++) {
    frequencia.set(i, (i * 7) % 20);
    atraso.set(i, (l.universo_max - i) % 30);
  }
  const media = ((l.universo_min + l.universo_max) / 2) * l.qtd_dezenas_padrao;
  return {
    frequencia,
    frequencia_percentual: new Map(),
    atraso,
    distribuicao_par_impar: [],
    soma_concursos: { min: 0, max: 0, media, desvio_padrao: 0, faixa_frequente: [0, 999999] },
    distribuicao_quadrantes: new Map(),
    repeticao_entre_concursos: [],
    sequencias_consecutivas: [],
    terminacoes: new Map(),
  };
}

describe("gerarPalpiteForte", () => {
  it("gera a quantidade padrão de dezenas, únicas e dentro do universo", () => {
    const l = loteria("megasena");
    const p = gerarPalpiteForte(l, statsFake(l));
    expect(p.dezenas).toHaveLength(l.qtd_dezenas_padrao);
    expect(new Set(p.dezenas).size).toBe(p.dezenas.length);
    expect(p.dezenas.every((d) => d >= l.universo_min && d <= l.universo_max)).toBe(true);
    expect(p.dezenas).toEqual([...p.dezenas].sort((a, b) => a - b));
  });

  it("motivo e métricas coerentes com as dezenas", () => {
    const l = loteria("lotofacil");
    const p = gerarPalpiteForte(l, statsFake(l));
    const soma = p.dezenas.reduce((a, b) => a + b, 0);
    expect(p.motivo.length).toBeGreaterThan(0);
    expect(p.metricas.soma).toBe(soma);
    expect(p.metricas.pares + p.metricas.impares).toBe(p.dezenas.length);
  });

  it("é determinístico para as mesmas estatísticas", () => {
    const l = loteria("quina");
    const s = statsFake(l);
    expect(gerarPalpiteForte(l, s).dezenas).toEqual(gerarPalpiteForte(l, s).dezenas);
  });

  it("no Super Sete gera colunas posicionais (1 dígito por coluna)", () => {
    const l = loteria("supersete");
    const p = gerarPalpiteForte(l, statsFake(l));
    expect(p.colunas).toBeDefined();
    expect(p.colunas).toHaveLength(l.colunas!.total_colunas);
    expect(p.colunas!.every((c) => c.length === 1)).toBe(true);
    expect(p.dezenas).toHaveLength(l.colunas!.total_colunas);
  });

  it("inclui extras obrigatórios quando a loteria exige (Timemania)", () => {
    const l = loteria("timemania");
    const p = gerarPalpiteForte(l, statsFake(l));
    expect(p.extras?.time).toBeDefined();
    expect(p.extras?.time.length).toBeGreaterThanOrEqual(1);
  });
});
