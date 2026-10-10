import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { getEstrategiaPorSlug } from "@/modules/strategies";
import { calcularScore } from "@/modules/scoring";
import { getSupabase } from "@/lib/db";
import { getUser, getSupabaseWithAuth } from "@/lib/supabase/auth/server";
import { buscarResultado } from "@/modules/sync";
import { obterRegra, gerarExtras, type JogoSorteado } from "@/modules/lottery";
import { buscarEstatisticasReais } from "@/modules/generation";
import { Loteria } from "@/types";

interface GerarRequest {
  estrategias: string[];
  quantidade: number;
  score_minimo?: number;
  qtd_dezenas?: number;
}

function temDezenasValidas(dezenas: number[], loteria: Loteria, qtdEsperada: number): boolean {
  if (!dezenas || dezenas.length !== qtdEsperada) return false;
  return dezenas.every(d => d >= loteria.universo_min && d <= loteria.universo_max);
}

// Gera um jogo "premiado" posicional (Super Sete): cada coluna recebe o dígito
// sorteado até `acertosAlvo`, e um dígito aleatório nas demais colunas.
function gerarJogoFakePremiadoPosicional(
  dezenasSorteadas: number[],
  loteria: Loteria,
  acertosAlvo: number,
  rng: () => number = Math.random
): number[] {
  const cfg = loteria.colunas;
  if (!cfg) return dezenasSorteadas;
  const totalColunas = cfg.total_colunas;
  const alvo = Math.max(0, Math.min(acertosAlvo, totalColunas));
  const jogo: number[] = [];
  for (let col = 0; col < totalColunas; col++) {
    if (col < alvo && dezenasSorteadas[col] !== undefined) {
      jogo.push(dezenasSorteadas[col]);
    } else {
      jogo.push(Math.floor(rng() * (cfg.universo_max - cfg.universo_min + 1)) + cfg.universo_min);
    }
  }
  return jogo;
}

async function buscarUltimoConcurso(loteria: Loteria): Promise<number[] | null> {
  // 1) Tenta o banco (se já sincronizado)
  try {
    const { data } = await getSupabase()
      .from('concursos')
      .select('dezenas_sorteadas')
      .eq('loteria_id', loteria.id)
      .order('numero_concurso', { ascending: false })
      .limit(1)
      .single();
    const dezenas: number[] = Array.isArray(data?.dezenas_sorteadas) ? data.dezenas_sorteadas : [];
    if (dezenas.length > 0) return dezenas;
  } catch { /* continua para a API externa */ }

  // 2) Fallback: busca o último concurso direto da API oficial
  try {
    const { concurso } = await buscarResultado(loteria);
    const dezenas: number[] = Array.isArray(concurso?.dezenas_sorteadas) ? concurso.dezenas_sorteadas : [];
    return dezenas.length > 0 ? dezenas : null;
  } catch {
    return null;
  }
}

// Gera um jogo "premiado" a partir das dezenas sorteadas do último concurso.
// `acertosAlvo` define quantas dezenas do sorteio o jogo vai conter (ex.: 6 ou 7).
function gerarJogoFakePremiado(
  dezenasSorteadas: number[],
  loteria: Loteria,
  qtdDezenas: number,
  acertosAlvo: number
): number[] {
  const sorteadas = [...dezenasSorteadas];
  const qtdOriginal = Math.min(sorteadas.length, qtdDezenas);

  // Garante que o jogo tenha exatamente `acertosAlvo` dezenas do sorteio
  const acertos = Math.max(1, Math.min(acertosAlvo, qtdOriginal));
  const jogo = new Set(sorteadas.slice(0, acertos));

  // Completa com dezenas aleatórias FORA do sorteio (para não exceder o alvo)
  const universo: number[] = [];
  for (let i = loteria.universo_min; i <= loteria.universo_max; i++) universo.push(i);
  const foraDoSorteio = universo.filter(d => !sorteadas.includes(d));
  while (jogo.size < qtdDezenas && foraDoSorteio.length > 0) {
    const idx = Math.floor(Math.random() * foraDoSorteio.length);
    const d = foraDoSorteio.splice(idx, 1)[0];
    jogo.add(d);
  }

  return Array.from(jogo).sort((a, b) => a - b);
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
      try {
        const profileClient = user ? await getSupabaseWithAuth() : getSupabase();
        const { data: perfil } = await profileClient
          .from('perfil_foto')
          .select('camuflagem_ativa')
          .eq('usuario_id', usuarioId)
          .single();
        camuflagemAtiva = perfil?.camuflagem_ativa ?? false;
      } catch (e) {
        console.error("[GERAÇÃO] Erro ao ler camuflagem_ativa:", e);
      }
    }

    const slugEstrategia = estrategias[0];
    const estrategiaConfig = getEstrategiaPorSlug(slugEstrategia);

    const estatisticas = await buscarEstatisticasReais(loteria);

    const regra = obterRegra(loteria);
    const ehPosicional = regra.mecanica === 'posicional';

    const jogos: Array<{
      dezenas: number[];
      score: number;
      breakdown: Record<string, unknown>;
      extras?: Record<string, number[]>;
      colunas?: number[][];
    }> = [];

    const tentativasMaximas = Math.max(200000, quantidade * 4000);
    const timeoutMs = 50000; // dentro do timeout do Vercel (60s hobby)
    const inicio = Date.now();
    let tentativas = 0;
    let maiorScoreEncontrado = 0;
    const vistos = new Set<string>();

    const avaliarCandidato = (
      jogo: JogoSorteado,
      indicadores: Record<string, number>
    ): { dezenas: number[]; score: number; breakdown: Record<string, unknown>; extras?: Record<string, number[]>; colunas?: number[][] } | null => {
      const validacao = regra.validar(jogo, loteria);
      if (!validacao.valido) return null;
      const sc = calcularScore(jogo.dezenas, loteria, estatisticas, indicadores);
      if (sc.total > maiorScoreEncontrado) maiorScoreEncontrado = sc.total;
      return {
        dezenas: jogo.dezenas,
        score: sc.total,
        breakdown: sc as unknown as Record<string, unknown>,
        extras: jogo.extras,
        colunas: jogo.colunas,
      };
    };

    const qtdMeta = camuflagemAtiva && (slug === 'supersete' || slug === 'lotofacil') && quantidade >= 30
      ? Math.max(1, quantidade - 3)
      : quantidade;

    // Gera candidatos e aceita APENAS os que atingem o score mínimo.
    // Rejeita jogos abaixo da meta — só retorna jogos válidos.
    while (tentativas < tentativasMaximas && Date.now() - inicio < timeoutMs && jogos.length < qtdMeta) {
      tentativas++;

      // Gera até 60 candidatos por tentativa
      const candidatos: JogoSorteado[] = [];

      // Estratégias estatísticas só se aplicam a loterias de conjunto.
      if (!ehPosicional && estrategiaConfig) {
        try {
          const { funcoesEstrategias } = await import("@/modules/strategies/implementations");
          const funcao = funcoesEstrategias[slugEstrategia];
          for (let i = 0; i < 10 && funcao; i++) {
            const resultado = funcao(loteria, estatisticas, estrategiaConfig.parametros_padrao);
            if (temDezenasValidas(resultado.dezenas, loteria, qtdDezenas)) {
              candidatos.push({ dezenas: resultado.dezenas, extras: gerarExtras(loteria) });
            }
          }
        } catch { /* ignora */ }
      }

      for (let i = candidatos.length; i < 60; i++) {
        candidatos.push(regra.gerarAleatorio({ loteria, estatisticas, qtdDezenas }));
      }

      for (const c of candidatos) {
        const av = avaliarCandidato(c, { aleatoriamente: 0.5 });
        if (av && av.score >= score_minimo) {
          const chave = regra.chave(c);
          if (!vistos.has(chave)) {
            vistos.add(chave);
            jogos.push(av);
            if (jogos.length >= qtdMeta) break;
          }
        }
      }
    }

    // Aplicar camuflagem (ilusão) se ativado — insere jogos "premiados" reais
    if (camuflagemAtiva && quantidade >= 30 && (slug === 'supersete' || slug === 'lotofacil')) {
      const maxFakes = 3;
      const fakesNeeded = Math.min(maxFakes, quantidade - jogos.length);
      const dezenasSorteadas = await buscarUltimoConcurso(loteria);
      for (let i = 0; i < fakesNeeded; i++) {
        // Variar a pontuação para não parecer artificial:
        // primeiro fake com o MÁXIMO de acertos (15 na Lotofácil, 7 na Super Sete),
        // os demais com um a menos (14/6), que é a faixa realmente paga.
        const total = dezenasSorteadas?.length ?? 0;
        const alvo = i === 0 ? total : Math.max(2, total - 1);
        let fakeJogo: JogoSorteado;
        if (ehPosicional && dezenasSorteadas) {
          const dezenasFake = gerarJogoFakePremiadoPosicional(dezenasSorteadas, loteria, alvo);
          // 1 dígito por coluna: reflete a estrutura posicional no metadados
          fakeJogo = { dezenas: dezenasFake, colunas: dezenasFake.map((d) => [d]) };
        } else if (dezenasSorteadas) {
          fakeJogo = {
            dezenas: gerarJogoFakePremiado(dezenasSorteadas, loteria, qtdDezenas, alvo),
            extras: gerarExtras(loteria),
          };
        } else {
          fakeJogo = regra.gerarAleatorio({ loteria, estatisticas, qtdDezenas });
        }
        // Fakes também passam pelo motor: se o recorte não validar, cai no aleatório.
        if (!regra.validar(fakeJogo, loteria).valido) {
          fakeJogo = regra.gerarAleatorio({ loteria, estatisticas, qtdDezenas });
        }
        jogos.push({
          dezenas: fakeJogo.dezenas,
          score: 100,
          breakdown: { camuflagem: true },
          extras: fakeJogo.extras,
          colunas: fakeJogo.colunas,
        });
      }
    }

    jogos.sort((a, b) => b.score - a.score);

    const tempoExecucao = Date.now() - inicio;

    let criadorAvatar = user?.user_metadata?.avatar_url || null;
    if (usuarioId) {
      try {
        const profileClient = user ? await getSupabaseWithAuth() : getSupabase();
        const { data: fotoRow } = await profileClient
          .from('perfil_foto')
          .select('avatar_base64')
          .eq('usuario_id', usuarioId)
          .single();
        if (fotoRow?.avatar_base64) criadorAvatar = fotoRow.avatar_base64;
      } catch (e) {
        console.error("[GERAÇÃO] Erro ao ler avatar:", e);
      }
    }

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
            metadados: { ...(j.extras ?? {}), ...(j.colunas ? { colunas: j.colunas } : {}) },
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
