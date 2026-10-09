import { NextRequest, NextResponse } from "next/server";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";
import { LOTERIAS } from "@/lib/loterias";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const supabase = await getSupabaseWithAuth();

    const { data: apostas, error } = await supabase
      .from("apostas")
      .select("*")
      .eq("usuario_id", session.user.id)
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("[API/apostas] Erro ao buscar apostas:", error);
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        return NextResponse.json({ apostas: [], setupRequired: true });
      }
      return NextResponse.json({ error: "Erro ao buscar apostas" }, { status: 500 });
    }

    return NextResponse.json({ apostas: apostas || [] });
  } catch (error) {
    console.error("[API/apostas] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { loteria_id, dezenas, valor_apostado, metadados } = body;

    if (!loteria_id || !dezenas?.length || valor_apostado == null) {
      return NextResponse.json(
        { error: "loteria_id, dezenas e valor_apostado são obrigatórios" },
        { status: 400 }
      );
    }

    if (!Array.isArray(dezenas) || dezenas.some((d: unknown) => typeof d !== "number")) {
      return NextResponse.json(
        { error: "dezenas deve ser um array de números" },
        { status: 400 }
      );
    }

    if (metadados != null && (typeof metadados !== "object" || Array.isArray(metadados))) {
      return NextResponse.json({ error: "metadados deve ser um objeto" }, { status: 400 });
    }

    const loteria = LOTERIAS.find((l) => l.id === loteria_id || l.slug === loteria_id);
    // Na mecânica posicional a ordem das dezenas importa (1 dígito por coluna);
    // em conjunto, ordenamos para manter o formato histórico da tabela.
    const dezenasSalvas = loteria?.mecanica === "posicional" ? dezenas : [...dezenas].sort((a: number, b: number) => a - b);

    const supabase = await getSupabaseWithAuth();

    const { data: aposta, error } = await supabase
      .from("apostas")
      .insert({
        usuario_id: session.user.id,
        loteria_id,
        dezenas: dezenasSalvas,
        valor_apostado,
        // A coluna só é enviada quando há metadados (e quando a migração
        // existir); apostas simples continuam funcionando sem ela.
        ...(metadados != null ? { metadados } : {}),
      })
      .select()
      .single();

    if (error) {
      console.error("[API/apostas] Erro ao salvar aposta:", error);
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        return NextResponse.json({ error: "Tabela apostas não existe. Execute a migração no painel do Supabase.", setupRequired: true }, { status: 503 });
      }
      if (error.code === "42703" || /metadados/i.test(error.message || "")) {
        return NextResponse.json({ error: "Migração pendente: a coluna apostas.metadados ainda não existe (colunas/extras não podem ser salvos).", setupRequired: true }, { status: 503 });
      }
      return NextResponse.json({ error: "Erro ao salvar aposta" }, { status: 500 });
    }

    return NextResponse.json({ aposta }, { status: 201 });
  } catch (error) {
    console.error("[API/apostas] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
