import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { getSession } from "@/lib/supabase/auth/server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ lotes: [], stats: { totalJogos: 0, totalLotes: 0, loteriasUsadas: [], melhorScore: 0, mediaScore: 0 } });
    }

    const supabase = getSupabase();

    const { data: lotes, error: lotesError } = await supabase
      .from("lotes_geracao")
      .select("*")
      .eq("usuario_id", session.user.id)
      .order("criado_em", { ascending: false });

    if (lotesError) {
      console.error("[API] Erro ao buscar lotes:", lotesError);
      return NextResponse.json({ lotes: [], stats: { totalJogos: 0, totalLotes: 0, loteriasUsadas: [], melhorScore: 0, mediaScore: 0 } });
    }

    const { data: jogos, error: jogosError } = await supabase
      .from("jogos_gerados")
      .select("*")
      .eq("usuario_id", session.user.id)
      .order("criado_em", { ascending: false });

    if (jogosError) {
      console.error("[API] Erro ao buscar jogos:", jogosError);
      return NextResponse.json({ lotes: [], stats: { totalJogos: 0, totalLotes: 0, loteriasUsadas: [], melhorScore: 0, mediaScore: 0 } });
    }

    const loteriaSet = new Set<string>();
    lotes?.forEach((lote) => loteriaSet.add(lote.loteria_id));

    const scores = jogos?.map((j) => j.score).filter((s): s is number => s !== null) || [];
    const melhorScore = scores.length > 0 ? Math.max(...scores) : 0;
    const mediaScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const stats = {
      totalJogos: jogos?.length || 0,
      totalLotes: lotes?.length || 0,
      loteriasUsadas: Array.from(loteriaSet),
      melhorScore,
      mediaScore,
    };

    const lotesComJogos = lotes?.map((lote) => ({
      ...lote,
      loteria: lote.loteria_id,
      estrategia: lote.estrategia_id || "manual",
      jogos: jogos?.filter((j) => j.lote_id === lote.id) || [],
    })) || [];

    return NextResponse.json({
      lotes: lotesComJogos,
      stats,
    });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ lotes: [], stats: { totalJogos: 0, totalLotes: 0, loteriasUsadas: [], melhorScore: 0, mediaScore: 0 } });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.user?.id ?? null;

    const body = await request.json();
    const { loteria, estrategia, jogos } = body;

    if (!loteria || !jogos || !Array.isArray(jogos) || jogos.length === 0) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Criar lote
    const { data: lote, error: loteError } = await supabase
      .from("lotes_geracao")
      .insert({
        usuario_id: userId,
        loteria_id: loteria,
        estrategia_id: null,
        score_minimo: 0,
        quantidade_solicitada: jogos.length,
        quantidade_gerada: jogos.length,
        tempo_execucao_ms: 0,
        score_relaxado: false,
        status: "concluido",
      })
      .select()
      .single();

    if (loteError) {
      console.error("[API] Erro ao criar lote:", loteError);
      return NextResponse.json({ error: "Erro ao criar lote" }, { status: 500 });
    }

    // Inserir jogos
    const jogosParaSalvar = jogos.map((j: { dezenas: number[]; score: number | null }) => ({
      lote_id: lote.id,
      usuario_id: userId,
      loteria_id: loteria,
      dezenas: j.dezenas,
      estrategia_id: null,
      score: j.score || 0,
      score_breakdown: {},
      origem: "manual",
    }));

    const { error: jogosError } = await supabase.from("jogos_gerados").insert(jogosParaSalvar);

    if (jogosError) {
      console.error("[API] Erro ao salvar jogos:", jogosError);
      return NextResponse.json({ error: "Erro ao salvar jogos" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      lote_id: lote.id,
      jogos_salvos: jogos.length,
    });
  } catch (error) {
    console.error("[API] Erro ao salvar lote:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
