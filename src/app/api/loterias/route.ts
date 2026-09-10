import { NextResponse } from "next/server";
import { LOTERIAS } from "@/lib/loterias";

interface CaixaResultado {
  tipo: string;
  concurso?: {
    numero: number;
    data: string;
    dezenas: string[];
    premiacoes: { descricao: string; numero: number; premio: number; ganhadores: number }[];
    valor_estimado: number;
    acumulou: boolean;
    proximo_concurso: { numero: number; data: string; acumulado: number };
  };
}

const CAIXA_SLUG_MAP: Record<string, string> = {
  lotofacil: "lotofacil",
  megasena: "megasena",
  quina: "quina",
  lotomania: "lotomania",
  duplasena: "duplasena",
  timemania: "timemania",
  diadesorte: "diadesorte",
  maismilionaria: "maismilionaria",
  supersete: "supersete",
};

async function fetchCaixaUltimoConcurso(slug: string): Promise<CaixaResultado | null> {
  const caixaSlug = CAIXA_SLUG_MAP[slug];
  if (!caixaSlug) return null;

  try {
    const res = await fetch(
      `https://servicebus2.caixa.gov.br/portaldeloterias/api/${caixaSlug}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.trim() === "") return null;
    try {
      return JSON.parse(text) as CaixaResultado;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export async function GET() {
  const loterias = LOTERIAS.filter((l) => l.ativo);

  const resultados = await Promise.allSettled(
    loterias.map(async (loteria) => {
      const caixaData = await fetchCaixaUltimoConcurso(loteria.slug);

      if (caixaData?.concurso) {
        const c = caixaData.concurso;
        return {
          slug: loteria.slug,
          nome: loteria.nome,
          numero_concurso: c.numero,
          dezenas_sorteadas: c.dezenas.map((d) => Number(d)),
          valor_acumulado: c.valor_estimado,
          acumulou: c.acumulou,
          data_sorteio: c.data,
          proximo_concurso: c.proximo_concurso,
          premiacoes: c.premiacoes,
          fonte: "caixa" as const,
        };
      }

      return {
        slug: loteria.slug,
        nome: loteria.nome,
        numero_concurso: 0,
        dezenas_sorteadas: [],
        valor_acumulado: 0,
        acumulou: false,
        data_sorteio: "",
        proximo_concurso: null,
        premiacoes: [],
        fonte: "indisponivel" as const,
      };
    })
  );

  const data = resultados.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : {
          slug: "erro",
          nome: "Erro",
          numero_concurso: 0,
          dezenas_sorteadas: [],
          valor_acumulado: 0,
          acumulou: false,
          data_sorteio: "",
          proximo_concurso: null,
          premiacoes: [],
          fonte: "erro" as const,
        }
  );

  return NextResponse.json({
    loterias: data,
    atualizado_em: new Date().toISOString(),
  });
}
