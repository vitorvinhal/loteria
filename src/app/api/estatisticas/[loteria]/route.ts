import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { getSupabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ loteria: string }> }
) {
  try {
    const { loteria: slug } = await params;
    const loteria = getLoteriaPorSlug(slug);

    if (!loteria) {
      return NextResponse.json(
        { error: "Loteria não encontrada" },
        { status: 404 }
      );
    }

    const supabase = getSupabase();

    const { data: concursos, error } = await supabase
      .from("concursos")
      .select("dezenas_sorteadas")
      .eq("loteria_id", loteria.id)
      .order("numero_concurso", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[API] Erro ao buscar concursos:", error);
      return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 });
    }

    if (!concursos || concursos.length === 0) {
      return NextResponse.json({
        numeros: [],
        mediaSoma: 0,
        desvioSoma: 0,
        parImpar: { pares: 0, impares: 0 },
        quadrantes: {},
        totalConcursos: 0,
      });
    }

    const totalConcursos = concursos.length;
    const frequenciaMap = new Map<number, number>();
    const atrasoMap = new Map<number, number>();
    let somaTotal = 0;
    let paresTotal = 0;
    let imparesTotal = 0;
    const quadrantes: { [key: number]: number } = {};

    for (let i = 0; i < totalConcursos; i++) {
      const concurso = concursos[i];
      const dezenas = concurso.dezenas_sorteadas;

      for (const d of dezenas) {
        frequenciaMap.set(d, (frequenciaMap.get(d) || 0) + 1);

        if (!atrasoMap.has(d)) {
          atrasoMap.set(d, i);
        }

        somaTotal += d;
        if (d % 2 === 0) paresTotal++;
        else imparesTotal++;

        const tamanhoQuadrante = Math.ceil(loteria.universo_max / 4);
        const quadrante = Math.floor((d - 1) / tamanhoQuadrante);
        quadrantes[quadrante] = (quadrantes[quadrante] || 0) + 1;
      }
    }

    const numeros = [];
    for (let i = loteria.universo_min; i <= loteria.universo_max; i++) {
      const freq = frequenciaMap.get(i) || 0;
      const percentual = Math.round((freq / totalConcursos) * 100);
      const atraso = atrasoMap.get(i) ?? totalConcursos;
      const mediaEsperada = loteria.qtd_dezenas_padrao / loteria.universo_max;

      let status: "quente" | "frio" | "neutro" = "neutro";
      if (percentual > mediaEsperada * 100 * 1.2) status = "quente";
      else if (percentual < mediaEsperada * 100 * 0.8) status = "frio";

      numeros.push({
        numero: i,
        frequencia: freq,
        percentual,
        atraso,
        status,
      });
    }

    const mediaSoma = Math.round(somaTotal / totalConcursos);
    const somasConcursos = concursos.map(c =>
      c.dezenas_sorteadas.reduce((a: number, b: number) => a + b, 0)
    );
    const mediaQuadrado = somasConcursos.reduce((a, b) => a + Math.pow(b - mediaSoma, 2), 0) / totalConcursos;
    const desvioSoma = Math.round(Math.sqrt(mediaQuadrado));

    return NextResponse.json({
      numeros,
      mediaSoma,
      desvioSoma,
      parImpar: { pares: paresTotal, impares: imparesTotal },
      quadrantes,
      totalConcursos,
    });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
