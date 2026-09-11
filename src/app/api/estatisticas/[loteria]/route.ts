import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { getSupabase } from "@/lib/db";
import { buscarHistoricoCompleto } from "@/modules/sync";

function computeStats(dezenasArrays: number[][], universoMin: number, universoMax: number, qtdDezenasPadrao: number) {
  const totalConcursos = dezenasArrays.length;
  const frequenciaMap = new Map<number, number>();
  const atrasoMap = new Map<number, number>();
  let somaTotal = 0;
  let paresTotal = 0;
  let imparesTotal = 0;
  const quadrantes: { [key: number]: number } = {};

  for (let i = 0; i < totalConcursos; i++) {
    const dezenas = dezenasArrays[i];
    for (const d of dezenas) {
      frequenciaMap.set(d, (frequenciaMap.get(d) || 0) + 1);
      if (!atrasoMap.has(d)) {
        atrasoMap.set(d, i);
      }
      somaTotal += d;
      if (d % 2 === 0) paresTotal++;
      else imparesTotal++;

      const tamanhoQuadrante = Math.ceil(universoMax / 4);
      const quadrante = Math.floor((d - 1) / tamanhoQuadrante);
      quadrantes[quadrante] = (quadrantes[quadrante] || 0) + 1;
    }
  }

  const numeros = [];
  for (let i = universoMin; i <= universoMax; i++) {
    const freq = frequenciaMap.get(i) || 0;
    const percentual = Math.round((freq / totalConcursos) * 100);
    const atraso = atrasoMap.get(i) ?? totalConcursos;
    const mediaEsperada = qtdDezenasPadrao / universoMax;

    let status: "quente" | "frio" | "neutro" = "neutro";
    // Quente: acima da média esperada em +15%; Frio: abaixo em -15%.
    // Com poucos concursos, essa margem garante que sempre haja quentes/frios.
    if (percentual > mediaEsperada * 100 * 1.15) status = "quente";
    else if (percentual < mediaEsperada * 100 * 0.85) status = "frio";

    numeros.push({ numero: i, frequencia: freq, percentual, atraso, status });
  }

  const mediaSoma = Math.round(somaTotal / totalConcursos);
  const somasConcursos = dezenasArrays.map(d => d.reduce((a, b) => a + b, 0));
  const mediaQuadrado = somasConcursos.reduce((a, b) => a + Math.pow(b - mediaSoma, 2), 0) / totalConcursos;
  const desvioSoma = Math.round(Math.sqrt(mediaQuadrado));

  return {
    numeros,
    mediaSoma,
    desvioSoma,
    parImpar: { pares: paresTotal, impares: imparesTotal },
    quadrantes,
    totalConcursos,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ loteria: string }> }
) {
  try {
    const { loteria: slug } = await params;
    const loteria = getLoteriaPorSlug(slug);

    if (!loteria) {
      return NextResponse.json({ error: "Loteria não encontrada" }, { status: 404 });
    }

    const supabase = getSupabase();

    const { count } = await supabase
      .from("concursos")
      .select("id", { count: "exact", head: true })
      .eq("loteria_id", loteria.id);

    if (count && count > 0) {
      const { data: concursos, error } = await supabase
        .from("concursos")
        .select("dezenas_sorteadas")
        .eq("loteria_id", loteria.id)
        .order("numero_concurso", { ascending: true });

      if (!error && concursos && concursos.length > 0) {
        const dezenasArrays = concursos.map(c => c.dezenas_sorteadas);
        return NextResponse.json(computeStats(dezenasArrays, loteria.universo_min, loteria.universo_max, loteria.qtd_dezenas_padrao));
      }
    }

    console.log("[API Estatísticas] DB vazio, buscando histórico completo da API externa...");
    const dezenasArrays: number[][] = [];

    // Busca TODOS os concursos da loteria (bulk) — não só 50
    const { concursos: historico } = await buscarHistoricoCompleto(loteria);
    historico.forEach((c) => {
      if (c.dezenas_sorteadas.length > 0) dezenasArrays.push(c.dezenas_sorteadas);
    });

    if (dezenasArrays.length === 0) {
      return NextResponse.json({
        numeros: [], mediaSoma: 0, desvioSoma: 0,
        parImpar: { pares: 0, impares: 0 }, quadrantes: {}, totalConcursos: 0,
      });
    }

    return NextResponse.json(computeStats(dezenasArrays, loteria.universo_min, loteria.universo_max, loteria.qtd_dezenas_padrao));
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
