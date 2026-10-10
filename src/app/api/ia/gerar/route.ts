import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { getEstrategiaPorSlug } from "@/modules/strategies";
import { calcularScore } from "@/modules/scoring";
import { obterRegra, type JogoSorteado } from "@/modules/lottery";
import {
  buscarEstatisticasReais,
  chamarModeloIA,
  montarMensagensIA,
  validarJogosIA,
  LIMITE_JOGOS_IA,
  topFrequencias,
  salvarLoteGeracao,
} from "@/modules/generation";

const LIMITE_FALLBACK_MS = 15000;

interface IARequest {
  loteria: string;
  quantidade: number;
  estrategias?: string[];
  score_minimo?: number;
  qtd_dezenas?: number;
}

/**
 * Geração com IA (MiMo V2.6 Flash, OpenAI-compatible).
 * - O modelo propõe os jogos; o MOTOR valida cada um antes de retornar.
 * - Falha da IA (sem chave / timeout / JSON inválido / zero válidos) → fallback
 *   para o motor local, com `aviso` visível (fallback ≠ sucesso).
 * - Sem AIMODEL_API_KEY → 503 `ia_sem_chave` (degraceiro, sem tentar).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as IARequest;
    const { loteria: slug, quantidade, estrategias, score_minimo = 0, qtd_dezenas } = body;

    const loteria = getLoteriaPorSlug(slug);
    if (!loteria) {
      return NextResponse.json({ error: "Loteria não encontrada" }, { status: 404 });
    }
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 250) {
      return NextResponse.json({ error: "quantidade deve ser um inteiro entre 1 e 250" }, { status: 400 });
    }

    const qtdDezenas =
      qtd_dezenas && qtd_dezenas >= loteria.qtd_dezenas_min && qtd_dezenas <= loteria.qtd_dezenas_max
        ? qtd_dezenas
        : loteria.qtd_dezenas_padrao;

    if (!process.env.AIMODEL_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "Geração por IA não configurada no servidor (AIMODEL_API_KEY).", code: "ia_sem_chave" },
        { status: 503 }
      );
    }

    const inicio = Date.now();
    const stats = await buscarEstatisticasReais(loteria);
    const regra = obterRegra(loteria);

    const slugEstrategia = Array.isArray(estrategias) && estrategias.length ? estrategias[0] : undefined;
    const estrategiaConfig = slugEstrategia ? getEstrategiaPorSlug(slugEstrategia) : undefined;
    const qtdPedida = Math.min(quantidade, LIMITE_JOGOS_IA);

    let fonte: "ia" | "motor-local" = "ia";
    let aviso: string | undefined;
    let jogos: JogoSorteado[] = [];

    try {
      const mensagens = montarMensagensIA(loteria, qtdPedida, {
        qtdDezenas,
        estrategia: estrategiaConfig,
        topFrequentes: topFrequencias(stats.frequencia, 12),
      });
      const conteudo = await chamarModeloIA(mensagens);
      const parsed: unknown = JSON.parse(conteudo);
      const { validos, descartados } = validarJogosIA(parsed, loteria, regra);
      if (validos.length === 0) {
        throw new Error(`modelo não gerou jogos válidos (descartados: ${descartados})`);
      }
      jogos = validos;
    } catch (e) {
      fonte = "motor-local";
      const motivo = e instanceof Error ? e.message : String(e);
      console.warn("[API/ia/gerar] IA indisponível, fallback motor local:", motivo);
      aviso = `IA indisponível (${motivo}) — jogos gerados pelo motor local.`;
      const vistos = new Set<string>();
      const limite = Date.now() + LIMITE_FALLBACK_MS;
      while (jogos.length < qtdPedida && Date.now() < limite) {
        const candidato = regra.gerarAleatorio({ loteria, estatisticas: stats, qtdDezenas });
        if (!regra.validar(candidato, loteria).valido) continue;
        const chave = regra.chave(candidato);
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        jogos.push(candidato);
      }
    }

    const pontuados = jogos
      .map((j) => {
        const sc = calcularScore(j.dezenas, loteria, stats, { aleatoriamente: 0.5 });
        return {
          dezenas: j.dezenas,
          score: sc.total,
          breakdown: sc as unknown as Record<string, unknown>,
          extras: j.extras,
          colunas: j.colunas,
        };
      })
      .sort((a, b) => b.score - a.score);

    const tempoExecucao = Date.now() - inicio;

    const { loteId } = await salvarLoteGeracao({
      loteria,
      estrategiaId: estrategiaConfig?.id || null,
      scoreMinimo: score_minimo,
      quantidadeSolicitada: quantidade,
      tempoExecucaoMs: tempoExecucao,
      origem: fonte === "ia" ? "ia_hibrida" : "algoritmo",
      jogos: pontuados,
    });

    return NextResponse.json({
      jogos: pontuados,
      lote_id: loteId,
      total_gerados: pontuados.length,
      total_solicitado: quantidade,
      score_minimo,
      tempo_execucao_ms: tempoExecucao,
      fonte,
      aviso,
      score_relaxado: pontuados.length < quantidade,
      maior_score_encontrado: pontuados[0]?.score ?? 0,
      progresso: pontuados.length,
    });
  } catch (error) {
    console.error("[API/ia/gerar] Erro na geração por IA:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
