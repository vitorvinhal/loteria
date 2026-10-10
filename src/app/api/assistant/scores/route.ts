import { NextRequest, NextResponse } from "next/server";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import {
  contarAcertos,
  agregarRanking,
  ultimoConcurso,
  type PalpitePlacar,
} from "@/modules/assistant/scores";
import { nomeAmigavel } from "@/modules/assistant/identity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const supabase = await getSupabaseWithAuth();
    const { data, error } = await supabase
      .from("lottery_scores")
      .select("id, user_name, game_type, numbers, hits, contest_number, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[assistant/scores] erro ao listar:", error);
      return NextResponse.json({ error: "Erro ao carregar placar" }, { status: 500 });
    }

    const palpites = (data ?? []) as PalpitePlacar[];
    return NextResponse.json({ ranking: agregarRanking(palpites), palpites });
  } catch (error) {
    console.error("[assistant/scores] erro geral:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const gameType = typeof body?.game_type === "string" ? body.game_type : "";
    const numerosBruto = body?.numbers;
    const loteria = getLoteriaPorSlug(gameType);
    if (!loteria) {
      return NextResponse.json({ error: "Loteria inválida" }, { status: 400 });
    }
    if (
      !Array.isArray(numerosBruto) ||
      numerosBruto.length === 0 ||
      !numerosBruto.every((n) => typeof n === "number" && Number.isInteger(n))
    ) {
      return NextResponse.json({ error: "numbers deve ser array de inteiros" }, { status: 400 });
    }
    const numbers = [...new Set(numerosBruto as number[])].sort((a, b) => a - b);
    const maxDezenas = loteria.mecanica === "posicional" ? 20 : loteria.qtd_dezenas_max;
    if (numbers.length < 1 || numbers.length > maxDezenas) {
      return NextResponse.json({ error: "Quantidade de dezenas inválida" }, { status: 400 });
    }

    const concurso = await ultimoConcurso(loteria.slug);
    const hits = concurso ? contarAcertos(numbers, concurso.dezenas) : null;

    const userName = nomeAmigavel(session.user);
    const supabase = await getSupabaseWithAuth();
    const { data, error } = await supabase
      .from("lottery_scores")
      .insert({
        user_name: userName,
        game_type: loteria.slug,
        numbers,
        hits,
        contest_number: concurso?.numero ?? null,
      })
      .select("id, user_name, game_type, numbers, hits, contest_number, created_at")
      .single();

    if (error || !data) {
      console.error("[assistant/scores] erro ao salvar:", error);
      return NextResponse.json({ error: "Erro ao salvar palpite" }, { status: 500 });
    }

    return NextResponse.json({ palpite: data, conferido_contra: concurso?.numero ?? null });
  } catch (error) {
    console.error("[assistant/scores] erro geral:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
