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

const CAIXA_IDS: Record<string, number> = {
  lotofacil: 1,
  megasena: 2,
  quina: 3,
  lotomania: 4,
  duplasena: 5,
  timemania: 6,
  diadesorte: 7,
  "maismilionaria": 8,
  supersete: 9,
};

async function fetchCaixaResultado(slug: string): Promise<CaixaResultado | null> {
  const caixaId = CAIXA_IDS[slug];
  if (!caixaId) return null;

  try {
      const res = await fetch(
        `https://servicebus2.caixa.gov.br/portaldeloterias/api/${slug}/${caixaId}`,
        { headers: { Accept: "application/json" } }
      );
    if (!res.ok) return null;
    const data = await res.json();
    return data as CaixaResultado;
  } catch {
    return null;
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export async function GET() {
  const loterias = LOTERIAS.filter((l) => l.ativo);

  const resultados = await Promise.allSettled(
    loterias.map(async (loteria) => {
      const caixaData = await fetchCaixaResultado(loteria.slug);

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
          fonte: "erro" as const,
        }
  );

  return NextResponse.json({
    loterias: data,
    atualizado_em: new Date().toISOString(),
  });
}
