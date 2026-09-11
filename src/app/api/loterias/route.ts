import { NextResponse } from "next/server";
import { LOTERIAS } from "@/lib/loterias";
import { getSupabase } from "@/lib/db";

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

interface CaixaResult {
  slug: string;
  nome: string;
  numero: number;
  dezenas: number[];
  acumulou: boolean;
  valorAcumulado: number;
  valorProximo: number;
  data: string;
  dataProximo: string;
  premiacoes: { desc: string; ganhadores: number; premio: number }[];
}

async function fetchCaixa(slug: string): Promise<CaixaResult | null> {
  const caixaSlug = CAIXA_SLUG_MAP[slug];
  if (!caixaSlug) return null;
  try {
    const res = await fetch(`https://servicebus2.caixa.gov.br/portaldeloterias/api/${caixaSlug}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const dezenas = (data.listaDezenas || []).map(Number);
    if (dezenas.length === 0) return null;
    const loteria = LOTERIAS.find(l => l.slug === slug);
    const numero = data.numeroConcurso || data.numero || data.id || 0;
    if (!numero) return null;
    return {
      slug,
      nome: loteria?.nome || slug,
      numero,
      dezenas,
      acumulou: Boolean(data.acumulado),
      valorAcumulado: Number(data.valorAcumulado) || 0,
      valorProximo: Number(data.valorEstimadoProximoConcurso) || 0,
      data: data.dataApuracao || "",
      dataProximo: data.dataProximoConcurso || "",
      premiacoes: (data.listaRateioPremio || []).map((p: Record<string, unknown>) => ({
        desc: String(p.descricao || ""),
        ganhadores: Number(p.numeroDeGanhadores || 0),
        premio: Number(p.valorPremio || 0),
      })),
    };
  } catch {
    return null;
  }
}

async function fetchHeroku(slug: string): Promise<CaixaResult | null> {
  try {
    const res = await fetch(`https://loteriascaixa-api.herokuapp.com/api/${slug}/latest`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const dezenas = (data.dezenas || []).map(Number);
    if (dezenas.length === 0) return null;
    const loteria = LOTERIAS.find(l => l.slug === slug);
    return {
      slug,
      nome: loteria?.nome || slug,
      numero: Number(data.concurso || 0),
      dezenas,
      acumulou: Boolean(data.acumulou),
      valorAcumulado: Number(data.valorAcumulado) || Number(data.valorArrecadado) || 0,
      valorProximo: Number(data.valorEstimadoProximoConcurso) || 0,
      data: data.data || "",
      dataProximo: data.dataProximoConcurso || "",
      premiacoes: (data.premiacoes || []).map((p: Record<string, unknown>) => ({
        desc: String(p.descricao || ""),
        ganhadores: Number(p.ganhadores || 0),
        premio: Number(p.valorPremio || 0),
      })),
    };
  } catch {
    return null;
  }
}

async function fetchGuidi(slug: string): Promise<CaixaResult | null> {
  try {
    const res = await fetch(`https://api.guidi.dev.br/loteria/${slug}/ultimo`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const dezenas = (data.dezenas || []).map(Number);
    if (dezenas.length === 0) return null;
    const loteria = LOTERIAS.find(l => l.slug === slug);
    return {
      slug,
      nome: loteria?.nome || slug,
      numero: Number(data.concurso || 0),
      dezenas,
      acumulou: Boolean(data.acumulou),
      valorAcumulado: Number(data.valorAcumulado) || 0,
      valorProximo: Number(data.valorEstimadoProximoConcurso) || Number(data.proximoConcursoValorEstimado) || 0,
      data: data.data || "",
      dataProximo: data.dataProximoConcurso || "",
      premiacoes: [],
    };
  } catch {
    return null;
  }
}

async function fetchFromDB(slug: string): Promise<CaixaResult | null> {
  try {
    const supabase = getSupabase();
    const loteria = LOTERIAS.find(l => l.slug === slug);
    if (!loteria) return null;
    const { data } = await supabase
      .from("concursos")
      .select("numero_concurso, data_sorteio, dezenas_sorteadas, acumulou, valor_acumulado, valor_estimado_proximo, data_proximo_concurso, premiacoes")
      .eq("loteria_id", loteria.id)
      .order("numero_concurso", { ascending: false })
      .limit(1)
      .single();
    if (!data) return null;
    return {
      slug,
      nome: loteria.nome,
      numero: data.numero_concurso,
      dezenas: Array.isArray(data.dezenas_sorteadas) ? data.dezenas_sorteadas.map(Number) : [],
      acumulou: Boolean(data.acumulou),
      valorAcumulado: Number(data.valor_acumulado) || 0,
      valorProximo: Number(data.valor_estimado_proximo) || 0,
      data: data.data_sorteio || "",
      dataProximo: data.data_proximo_concurso || "",
      premiacoes: Array.isArray(data.premiacoes) ? data.premiacoes : [],
    };
  } catch {
    return null;
  }
}

async function fetchLoteria(slug: string): Promise<CaixaResult | null> {
  const caixa = await fetchCaixa(slug);
  if (caixa) return caixa;
  const heroku = await fetchHeroku(slug);
  if (heroku) return heroku;
  const guidi = await fetchGuidi(slug);
  if (guidi) return guidi;
  const db = await fetchFromDB(slug);
  return db;
}

export async function GET() {
  const loterias = LOTERIAS.filter(l => l.ativo);

  const resultados = await Promise.allSettled(
    loterias.map(async (loteria) => {
      const result = await fetchLoteria(loteria.slug);
      if (result) {
        return {
          slug: result.slug,
          nome: result.nome,
          numero_concurso: result.numero,
          dezenas_sorteadas: result.dezenas,
          valor_acumulado: result.valorAcumulado,
          acumulou: result.acumulou,
          data_sorteio: result.data,
          proximo_concurso: result.valorProximo > 0 ? {
            numero: result.numero + 1,
            data: result.dataProximo,
            acumulado: result.valorProximo,
          } : null,
          premiacoes: result.premiacoes,
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

  const data = resultados.map(r =>
    r.status === "fulfilled" ? r.value : {
      slug: "erro", nome: "Erro", numero_concurso: 0, dezenas_sorteadas: [],
      valor_acumulado: 0, acumulou: false, data_sorteio: "", proximo_concurso: null,
      premiacoes: [], fonte: "erro" as const,
    }
  );

  return NextResponse.json({ loterias: data, atualizado_em: new Date().toISOString() });
}
