import { NextRequest, NextResponse } from "next/server";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";
import { LOTERIAS } from "@/lib/loterias";
import { buscarResultado } from "@/modules/sync";
import { obterRegra } from "@/modules/lottery";
import { extrasDoConcurso } from "@/modules/lottery/sorteio";
import type { JogoSorteado } from "@/modules/lottery";
import type { Concurso, Loteria, ResultadoAposta } from "@/types";

type MetadadosAposta = { colunas?: number[][] } & Record<string, unknown>;

function encontrarFaixa(loteria: Loteria, acertos: number) {
  return (
    loteria.regras_vitoria.find(
      (r) => acertos >= r.acertos_min && acertos <= r.acertos_max
    ) ?? null
  );
}

/**
 * Confere uma aposta contra o concurso usando o motor oficial:
 * - posicional (Super Sete): coluna a coluna, aceitando múltipla via colunas;
 * - duplasena: dois sorteios independentes (6 + 6 dezenas);
 * - demais: conjunto com extras (time/mês/trevo) sorteados do raw.
 */
function conferirAposta(
  loteria: Loteria,
  jogo: JogoSorteado,
  concurso: Concurso
): { acertos: number; ganhou: boolean; detalhes: string; faixa: string | null } {
  const regra = obterRegra(loteria);
  const sorteio: JogoSorteado = {
    dezenas: concurso.dezenas_sorteadas,
    extras: extrasDoConcurso(concurso),
  };

  if (loteria.slug === "duplasena" && concurso.dezenas_sorteadas.length === 12) {
    const primeiro = { dezenas: concurso.dezenas_sorteadas.slice(0, 6) };
    const segundo = new Set(concurso.dezenas_sorteadas.slice(6, 12));
    const r1 = regra.conferir(jogo, primeiro, loteria);
    const a2 = jogo.dezenas.filter((d) => segundo.has(d)).length;
    const acertos = Math.max(r1.acertos, a2);
    const faixa = encontrarFaixa(loteria, acertos);
    return {
      acertos,
      ganhou: faixa !== null,
      faixa: faixa?.descricao ?? null,
      detalhes: `1º sorteio: ${r1.acertos} acertos · 2º sorteio: ${a2} acertos`,
    };
  }

  const res = regra.conferir(jogo, sorteio, loteria);
  const faixa = res.faixa ?? encontrarFaixa(loteria, res.acertos);
  const ganhou = faixa !== null;
  return {
    acertos: res.acertos,
    ganhou,
    faixa: faixa?.descricao ?? null,
    detalhes: ganhou
      ? `Parabéns! Você acertou ${res.acertos} dezena(s)!`
      : `Você acertou ${res.acertos} dezena(s). Tente novamente!`,
  };
}

function montarJogo(
  dezenas: number[],
  metadados: MetadadosAposta | null | undefined
): JogoSorteado {
  const colunas = Array.isArray(metadados?.colunas)
    ? (metadados.colunas as number[][])
    : undefined;
  const extras: Record<string, number[]> = {};
  if (metadados) {
    for (const [tipo, valor] of Object.entries(metadados)) {
      if (tipo === "colunas") continue;
      if (Array.isArray(valor) && valor.every((v) => typeof v === "number")) {
        extras[tipo] = valor as number[];
      }
    }
  }
  return { dezenas, colunas, extras: Object.keys(extras).length ? extras : undefined };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { aposta_id, loteria_id, dezenas, metadados } = body as {
      aposta_id?: string;
      loteria_id?: string;
      dezenas?: number[];
      metadados?: MetadadosAposta;
    };

    let loteria: Loteria | undefined;
    let jogo: JogoSorteado;
    let apostaSalva: { id: string } | null = null;

    if (aposta_id) {
      const supabase = await getSupabaseWithAuth();
      const { data: aposta, error } = await supabase
        .from("apostas")
        .select("*")
        .eq("id", aposta_id)
        .eq("usuario_id", session.user.id)
        .single();

      if (error || !aposta) {
        return NextResponse.json({ error: "Aposta não encontrada" }, { status: 404 });
      }
      loteria = LOTERIAS.find((l) => l.id === aposta.loteria_id);
      if (!loteria) {
        return NextResponse.json({ error: "Loteria não encontrada" }, { status: 404 });
      }
      jogo = montarJogo(aposta.dezenas as number[], aposta.metadados as MetadadosAposta | null);
      apostaSalva = { id: aposta.id };
    } else {
      if (!loteria_id || !Array.isArray(dezenas) || dezenas.length === 0) {
        return NextResponse.json(
          { error: "aposta_id ou (loteria_id + dezenas) são obrigatórios" },
          { status: 400 }
        );
      }
      loteria = LOTERIAS.find((l) => l.id === loteria_id || l.slug === loteria_id);
      if (!loteria) {
        return NextResponse.json({ error: "Loteria não encontrada" }, { status: 404 });
      }
      if (dezenas.some((d) => typeof d !== "number")) {
        return NextResponse.json({ error: "dezenas deve ser um array de números" }, { status: 400 });
      }
      jogo = montarJogo(dezenas, metadados);
    }

    const validacao = obterRegra(loteria!).validar(jogo, loteria!);
    if (!validacao.valido) {
      return NextResponse.json({ error: validacao.erros.join("; ") }, { status: 400 });
    }

    const { concurso } = await buscarResultado(loteria!);
    if (!concurso) {
      return NextResponse.json(
        { error: "Nenhum concurso encontrado para esta loteria" },
        { status: 404 }
      );
    }

    const { acertos, ganhou, detalhes } = conferirAposta(loteria!, jogo, concurso);

    const resultado: ResultadoAposta = {
      ganhou,
      acertos,
      total_dezenas: jogo.dezenas.length,
      dezenas_sorteadas: concurso.dezenas_sorteadas,
      concurso_numero: concurso.numero_concurso,
      detalhes,
    };

    if (apostaSalva) {
      const supabase = await getSupabaseWithAuth();
      const { error } = await supabase
        .from("apostas")
        .update({ resultado })
        .eq("id", apostaSalva.id)
        .eq("usuario_id", session.user.id);
      if (error) {
        console.error("[API/apostas/verificar] Erro ao salvar resultado:", error);
        return NextResponse.json({ error: "Erro ao salvar resultado da aposta" }, { status: 500 });
      }
    }

    const premiacao = concurso.premiacoes?.find((p) => p.acertos === acertos);
    return NextResponse.json({
      ...resultado,
      premio_estimado: premiacao?.premio ?? 0,
    });
  } catch (error) {
    console.error("[API/apostas/verificar] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
