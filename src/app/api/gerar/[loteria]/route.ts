import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { getEstrategiaPorSlug } from "@/modules/strategies";
import { calcularScore } from "@/modules/scoring";
import { getSupabase } from "@/lib/db";
import { getUser, getSupabaseWithAuth } from "@/lib/supabase/auth/server";
import { buscarResultado, buscarHistoricoCompleto } from "@/modules/sync";
import { Estatisticas, Loteria } from "@/types";

interface GerarRequest {
  estrategias: string[];
  quantidade: number;
  score_minimo?: number;
  qtd_dezenas?: number;
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

function temDezenasValidas(dezenas: number[], loteria: Loteria, qtdEsperada: number): boolean {
  if (!dezenas || dezenas.length !== qtdEsperada) return false;
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
    const { estrategias, quantidade, score_minimo = 0, qtd_dezenas } = body;

    // Use qtd_dezenas if provided, otherwise default to loteria.qtd_dezenas_padrao
    const qtdDezenas = qtd_dezenas && qtd_dezenas >= loteria.qtd_dezenas_min && qtd_dezenas <= loteria.qtd_dezenas_max
      ? qtd_dezenas
      : loteria.qtd_dezenas_padrao;

    if (!estrategias || !Array.isArray(estrategias) || estrategias.length === 0 || quantidade < 1 || quantidade > 250) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const user = await getUser();
    const usuarioId = user?.id ?? null;
    const criadoPor = user?.user_metadata?.nome || user?.email?.split("@")[0] || null;

    let camuflagemAtiva = false;
    if (usuarioId) {
      const { data: perfil } = await getSupabase()
        .from('perfil_foto')
        .select('camuflagem_ativa')
        .eq('usuario_id', usuarioId)
        .single();
      camuflagemAtiva = perfil?.camuflagem_ativa ?? false;
    }

    const slugEstrategia = estrategias[0];
    const estrategiaConfig = getEstrategiaPorSlug(slugEstrategia);

    const estatisticas = await buscarEstatisticasReais(loteria);

    const jogos: Array<{
      dezenas: number[];
      score: number;
      breakdown: Record<string, unknown>;
    }> = [];

    const tentativasMaximas = Math.max(200000, quantidade * 4000);
    const timeoutMs = 50000; // dentro do timeout do Vercel (60s hobby)
    const inicio = Date.now();
    let tentativas = 0;
    let maiorScoreEncontrado = 0;
    const vistos = new Set<string>();

    const avaliarCandidato = (dezenas: number[], indicadores: Record<string, number>): { dezenas: number[]; score: number; breakdown: Record<string, unknown> } | null => {
      const sc = calcularScore(dezenas, loteria, estatisticas, indicadores);
      if (sc.total > maiorScoreEncontrado) maiorScoreEncontrado = sc.total;
      return {
        dezenas,
        score: sc.total,
        breakdown: sc as unknown as Record<string, unknown>,
      };
    };

    // Gera candidatos e aceita APENAS os que atingem o score mínimo.
    // Rejeita jogos abaixo da meta — só retorna jogos válidos.
    while (tentativas < tentativasMaximas && Date.now() - inicio < timeoutMs && jogos.length < quantidade) {
      tentativas++;

      // Gera até 60 candidatos por tentativa
      const candidatos: Array<{ dezenas: number[]; indicadores: Record<string, number> }> = [];

      if (estrategiaConfig) {
        try {
          const { funcoesEstrategias } = await import("@/modules/strategies/implementations");
          const funcao = funcoesEstrategias[slugEstrategia];
          for (let i = 0; i < 10 && funcao; i++) {
            const resultado = funcao(loteria, estatisticas, estrategiaConfig.parametros_padrao);
            if (temDezenasValidas(resultado.dezenas, loteria, qtdDezenas)) {
              candidatos.push({ dezenas: resultado.dezenas, indicadores: resultado.indicadores || {} });
            }
          }
        } catch { /* ignora */ }
      }

      for (let i = candidatos.length; i < 60; i++) {
        candidatos.push({ dezenas: gerarAleatorio(loteria, qtdDezenas), indicadores: { aleatoriamente: 0.5 } });
      }

      for (const c of candidatos) {
        const av = avaliarCandidato(c.dezenas, c.indicadores);
        if (av && av.score >= score_minimo) {
          const chave = av.dezenas.join("-");
          if (!vistos.has(chave)) {
            vistos.add(chave);
            jogos.push(av);
            if (jogos.length >= quantidade) break;
          }
        }
      }
    }

    // Aplicar camuflagem (ilusão) se ativado
    if (camuflagemAtiva && quantidade >= 30 && (slug === 'supersete' || slug === 'lotofacil')) {
      const maxFakes = 3;
      const fakesNeeded = Math.min(maxFakes, quantidade - jogos.length);
      for (let i = 0; i < fakesNeeded; i++) {
        // Cria um jogo fictício com score máximo (ex.: 100) e dezenas aleatórias
        const fakeDezenas = gerarAleatorio(loteria, qtdDezenas);
        jogos.push({
          dezenas: fakeDezenas,
          score: 100,
          breakdown: {},
        });
      }
    }

    jogos.sort((a, b) => b.score - a.score);

    const tempoExecucao = Date.now() - inicio;
    const criadorAvatar = user?.user_metadata?.avatar_url || null;

    let loteId: string | null = null;
    try {
      const saveClient = user ? await getSupabaseWithAuth() : getSupabase();
      const { data: lote, error: errorLote } = await saveClient
        .from('lotes_geracao')
        .insert({
          usuario_id: usuarioId,
          loteria_id: loteria.id,
          estrategia_id: estrategiaConfig?.id || null,
          score_minimo: score_minimo,
          quantidade_solicitada: quantidade,
          quantidade_gerada: jogos.length,
          tempo_execucao_ms: tempoExecucao,
          score_relaxado: jogos.length < quantidade,
          criado_por: criadoPor,
          criador_avatar_url: criadorAvatar,
        })
        .select()
        .single();

      if (!errorLote && lote) {
        loteId = lote.id;
        if (jogos.length === 0) {
          // Nenhum jogo aprovado: rollback do lote vazio
          await saveClient.from('lotes_geracao').delete().eq('id', lote.id);
          loteId = null;
        } else {
          const jogosParaSalvar = jogos.map(j => ({
            lote_id: lote.id,
            usuario_id: usuarioId,
            loteria_id: loteria.id,
            dezenas: j.dezenas,
            estrategia_id: estrategiaConfig?.id || null,
            score: j.score,
            score_breakdown: j.breakdown,
            origem: 'algoritmo' as const,
          }));

          const { error: jogosError } = await saveClient.from('jogos_gerados').insert(jogosParaSalvar);
          if (jogosError) {
            console.error("[API] Erro ao salvar jogos (jogos_gerados):", jogosError);
            // Rollback: remove o lote vazio
            await saveClient.from('lotes_geracao').delete().eq('id', lote.id);
            loteId = null;
          }
        }
      } else if (errorLote) {
        console.error("[API] Erro ao salvar lote (lotes_geracao):", errorLote.message);
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
      score_relaxado: jogos.length < quantidade || jogos.some(j => j.score < score_minimo),
      maior_score_encontrado: maiorScoreEncontrado,
      progresso: jogos.length, // jogos já aprovados, para a barra mostrar progresso real
    });
  } catch (error) {
    console.error("[API] Erro na geração:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
