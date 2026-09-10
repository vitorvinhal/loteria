import { NextResponse } from "next/server";
import { LOTERIAS } from "@/lib/loterias";
import { getSupabase } from "@/lib/db";

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

async function fetchConcursoFromDB(slug: string) {
  try {
    const supabase = getSupabase();
    const loteria = LOTERIAS.find(l => l.slug === slug);
    if (!loteria) return null;

    const { data } = await supabase
      .from("concursos")
      .select("*")
      .eq("loteria_id", loteria.id)
      .order("numero_concurso", { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;

    return {
      slug,
      nome: loteria.nome,
      numero_concurso: data.numero_concurso,
      dezenas_sorteadas: Array.isArray(data.dezenas_sorteadas) ? data.dezenas_sorteadas.map(Number) : [],
      valor_acumulado: Number(data.valor_acumulado) || 0,
      acumulou: Boolean(data.acumulou),
      data_sorteio: data.data_sorteio || "",
      proximo_concurso: data.valor_estimado_proximo ? {
        numero: data.numero_concurso + 1,
        data: data.data_proximo_concurso || "",
        acumulado: Number(data.valor_estimado_proximo),
      } : null,
      premiacoes: Array.isArray(data.premiacoes) ? data.premiacoes : [],
      fonte: "banco" as const,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const loterias = LOTERIAS.filter((l) => l.ativo);

  const resultados = await Promise.allSettled(
    loterias.map(async (loteria) => {
      // Try CAIXA API first
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

      // Fallback to DB
      const dbResult = await fetchConcursoFromDB(loteria.slug);
      if (dbResult) return dbResult;

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
