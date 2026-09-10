import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { getEstrategiaPorSlug } from "@/modules/strategies";
import { funcoesEstrategias } from "@/modules/strategies/implementations";
import { calcularScore } from "@/modules/scoring";
import { getSupabase } from "@/lib/db";
import { getUser } from "@/lib/supabase/auth/server";
import { Estatisticas, Loteria } from "@/types";

interface GerarRequest {
  estrategias: string[];
  quantidade: number;
  score_minimo?: number;
}

function statsVazias(): Estatisticas {
  return {
    frequencia: new Map(),
    frequencia_percentual: new Map(),
    atraso: new Map(),
    distribuicao_par_impar: [],
    soma_concursos: { min: 0, max: 100, media: 50, desvio_padrao: 20, faixa_frequente: [30, 70] },
    distribuicao_quadrantes: new Map(),
    repeticao_entre_concursos: [],
    sequencias_consecutivas: [],
    terminacoes: new Map(),
  };
}

async function buscarEstatisticasReais(loteria: Loteria): Promise<Estatisticas> {
  const stats = statsVazias();
  try {
    const supabase = getSupabase();
    const { data: concursos } = await supabase
      .from('concursos')
      .select('dezenas_sorteadas')
      .eq('loteria_id', loteria.id)
      .order('numero_concurso', { ascending: false })
      .limit(50);

    if (!concursos || concursos.length === 0) return stats;

    const frequencia = new Map<number, number>();
    const atraso = new Map<number, number>();
    const universo: number[] = [];
    for (let i = loteria.universo_min; i <= loteria.universo_max; i++) {
      universo.push(i);
      atraso.set(i, concursos.length);
    }

    concursos.forEach((c, idx) => {
      const dezenas: number[] = Array.isArray(c.dezenas_sorteadas) ? c.dezenas_sorteadas : [];
      dezenas.forEach(d => {
        frequencia.set(d, (frequencia.get(d) || 0) + 1);
        if (atraso.get(d) === concursos.length) {
          atraso.set(d, idx);
        }
      });
    });

    const totalConcursos = concursos.length;
    const frequencia_percentual = new Map<number, number>();
    frequencia.forEach((freq, d) => {
      frequencia_percentual.set(d, (freq / totalConcursos) * 100);
    });

    const somaConcursos = concursos.map(c => {
      const dezenas: number[] = Array.isArray(c.dezenas_sorteadas) ? c.dezenas_sorteadas : [];
      return dezenas.reduce((a, b) => a + b, 0);
    });
    const somaMin = Math.min(...somaConcursos);
    const somaMax = Math.max(...somaConcursos);
    const somaMedia = somaConcursos.reduce((a, b) => a + b, 0) / somaConcursos.length;
    const somaVariancia = somaConcursos.reduce((s, v) => s + Math.pow(v - somaMedia, 2), 0) / somaConcursos.length;

    stats.frequencia = frequencia;
    stats.frequencia_percentual = frequencia_percentual;
    stats.atraso = atraso;
    stats.soma_concursos = {
      min: somaMin,
      max: somaMax,
      media: somaMedia,
      desvio_padrao: Math.sqrt(somaVariancia),
      faixa_frequente: [somaMin, somaMax],
    };
  } catch (e) {
    console.error("[GERAÇÃO] Erro ao buscar estatísticas reais:", e);
  }
  return stats;
}

function gerarAleatorio(loteria: Loteria, quantidade: number): number[] {
  const universo: number[] = [];
  for (let i = loteria.universo_min; i <= loteria.universo_max; i++) {
    universo.push(i);
  }
  const copia = [...universo];
  const selecionados: number[] = [];
  for (let i = 0; i < quantidade && copia.length > 0; i++) {
    const idx = Math.floor(Math.random() * copia.length);
    selecionados.push(copia.splice(idx, 1)[0]);
  }
  return selecionados.sort((a, b) => a - b);
}

function temDezenasValidas(dezenas: number[], loteria: Loteria): boolean {
  if (!dezenas || dezenas.length !== loteria.qtd_dezenas_padrao) return false;
  return dezenas.every(d => d >= loteria.universo_min && d <= loteria.universo_max);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ loteria: string }> }
) {
  try {
    const { loteria: slug } = await params;
    const loteria = getLoteriaPorSlug(slug);

    if (!loteria) {
      return NextResponse.json({ error: "Loteria não encontrada" }, { status: 404 });
    }

    const body: GerarRequest = await request.json();
    const { estrategias, quantidade, score_minimo = 0 } = body;

    if (!estrategias || !Array.isArray(estrategias) || estrategias.length === 0 || quantidade < 1 || quantidade > 100) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const slugEstrategia = estrategias[0];
    const estrategiaConfig = getEstrategiaPorSlug(slugEstrategia);
    if (!estrategiaConfig) {
      return NextResponse.json({ error: "Estratégia não encontrada" }, { status: 404 });
    }

    const funcao = funcoesEstrategias[slugEstrategia];
    if (!funcao) {
      return NextResponse.json({ error: "Estratégia não implementada" }, { status: 500 });
    }

    const estatisticas = await buscarEstatisticasReais(loteria);

    const jogos: Array<{
      dezenas: number[];
      score: number;
      breakdown: Record<string, unknown>;
    }> = [];

    const tentativasMaximas = 2000;
    const timeoutMs = 60000;
    const inicio = Date.now();
    let tentativas = 0;

    while (jogos.length < quantidade && tentativas < tentativasMaximas && Date.now() - inicio < timeoutMs) {
      tentativas++;

      let dezenas: number[];
      let indicadores: Record<string, number> = {};

      try {
        const resultado = funcao(loteria, estatisticas, estrategiaConfig.parametros_padrao);
        if (temDezenasValidas(resultado.dezenas, loteria)) {
          dezenas = resultado.dezenas;
          indicadores = resultado.indicadores || {};
        } else {
          dezenas = gerarAleatorio(loteria, loteria.qtd_dezenas_padrao);
        }
      } catch {
        dezenas = gerarAleatorio(loteria, loteria.qtd_dezenas_padrao);
      }

      const score = calcularScore(dezenas, loteria, estatisticas, indicadores);

      if (score.total >= score_minimo) {
        jogos.push({
          dezenas,
          score: score.total,
          breakdown: score as unknown as Record<string, unknown>,
        });
      }
    }

    jogos.sort((a, b) => b.score - a.score);

    const tempoExecucao = Date.now() - inicio;
    const user = await getUser();
    const usuarioId = user?.id ?? null;

    let loteId: string | null = null;
    try {
      const { data: lote, error: errorLote } = await getSupabase()
        .from('lotes_geracao')
        .insert({
          usuario_id: usuarioId,
          loteria_id: loteria.id,
          estrategia_id: estrategiaConfig.id,
          score_minimo: score_minimo,
          quantidade_solicitada: quantidade,
          quantidade_gerada: jogos.length,
          tempo_execucao_ms: tempoExecucao,
          score_relaxado: jogos.length < quantidade,
        })
        .select()
        .single();

      if (!errorLote && lote) {
        loteId = lote.id;
        const jogosParaSalvar = jogos.map(j => ({
          lote_id: lote.id,
          usuario_id: usuarioId,
          loteria_id: loteria.id,
          dezenas: j.dezenas,
          estrategia_id: estrategiaConfig.id,
          score: j.score,
          score_breakdown: j.breakdown,
          origem: 'algoritmo' as const,
        }));

        await getSupabase().from('jogos_gerados').insert(jogosParaSalvar);
      }
    } catch (e) {
      console.error("[API] Erro ao salvar:", e);
    }

    return NextResponse.json({
      jogos,
      lote_id: loteId,
      total_gerados: jogos.length,
      total_solicitado: quantidade,
      score_minimo,
      tempo_execucao_ms: tempoExecucao,
      tentativas,
      score_relaxado: jogos.length < quantidade,
    });
  } catch (error) {
    console.error("[API] Erro na geração:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
