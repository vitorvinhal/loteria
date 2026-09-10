import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { getSession } from "@/lib/supabase/auth/server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const supabase = getSupabase();

    const { data: lotes, error: lotesError } = await supabase
      .from("lotes")
      .select("*")
      .eq("usuario_id", session.user.id)
      .order("criado_em", { ascending: false });

    if (lotesError) {
      console.error("[API] Erro ao buscar lotes:", lotesError);
      return NextResponse.json({ error: "Erro ao buscar lotes" }, { status: 500 });
    }

    const { data: jogos, error: jogosError } = await supabase
      .from("jogos")
      .select("*")
      .eq("usuario_id", session.user.id)
      .order("criado_em", { ascending: false });

    if (jogosError) {
      console.error("[API] Erro ao buscar jogos:", jogosError);
      return NextResponse.json({ error: "Erro ao buscar jogos" }, { status: 500 });
    }

    const loteriaSet = new Set<string>();
    lotes?.forEach((lote) => loteriaSet.add(lote.loteria));

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
      jogos: jogos?.filter((j) => j.lote_id === lote.id) || [],
    })) || [];

    return NextResponse.json({
      lotes: lotesComJogos,
      stats,
    });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
