import { getSupabase } from "@/lib/db";
import { buscarHistoricoCompleto } from "@/modules/sync";
import type { Estatisticas, Loteria } from "@/types";

export function statsVazias(): Estatisticas {
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

export async function buscarEstatisticasReais(loteria: Loteria): Promise<Estatisticas> {
  const stats = statsVazias();
  try {
    const supabase = getSupabase();
    const { data: concursos, error } = await supabase
      .from('concursos')
      .select('dezenas_sorteadas')
      .eq('loteria_id', loteria.id)
      .order('numero_concurso', { ascending: false })
      .limit(50);

    if (!concursos || concursos.length === 0 || error) {
      // Fallback: histórico completo em UMA chamada (bulk), rápido e com dados reais
      const { concursos: historico } = await buscarHistoricoCompleto(loteria);
      const drawsDezenas = historico.slice(0, 50).map((c) => c.dezenas_sorteadas).filter(d => d.length > 0);

      if (drawsDezenas.length === 0) return stats;

      const freq = new Map<number, number>();
      const atraso = new Map<number, number>();
      for (let i = loteria.universo_min; i <= loteria.universo_max; i++) {
        atraso.set(i, drawsDezenas.length);
      }
      drawsDezenas.forEach((dezenas, idx) => {
        dezenas.forEach((d) => {
          freq.set(d, (freq.get(d) || 0) + 1);
          if (atraso.get(d) === drawsDezenas.length) atraso.set(d, idx);
        });
      });
      stats.frequencia = freq;
      stats.frequencia_percentual = new Map(
        Array.from(freq.entries()).map(([d, f]) => [d, (f / drawsDezenas.length) * 100])
      );
      stats.atraso = atraso;
      const somas = drawsDezenas.map(ds => ds.reduce((a, b) => a + b, 0));
      const media = somas.reduce((a, b) => a + b, 0) / somas.length;
      const variancia = somas.reduce((s, v) => s + Math.pow(v - media, 2), 0) / somas.length;
      stats.soma_concursos = {
        min: Math.min(...somas),
        max: Math.max(...somas),
        media,
        desvio_padrao: Math.sqrt(variancia),
        faixa_frequente: [Math.min(...somas), Math.max(...somas)],
      };
      return stats;
    }

    const frequencia = new Map<number, number>();
    const atraso = new Map<number, number>();
    for (let i = loteria.universo_min; i <= loteria.universo_max; i++) {
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
    console.error("[GERAÇÃO] Erro ao buscar estatísticas:", e);
  }
  return stats;
}
