import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { getSession } from "@/lib/supabase/auth/server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const supabase = getSupabase();

    const { data: apostas, error } = await supabase
      .from("apostas")
      .select("*")
      .eq("usuario_id", session.user.id)
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("[API/apostas] Erro ao buscar apostas:", error);
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
    const { loteria_id, dezenas, valor_apostado } = body;

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

    const supabase = getSupabase();

    const { data: aposta, error } = await supabase
      .from("apostas")
      .insert({
        usuario_id: session.user.id,
        loteria_id,
        dezenas: dezenas.sort((a: number, b: number) => a - b),
        valor_apostado,
      })
      .select()
      .single();

    if (error) {
      console.error("[API/apostas] Erro ao salvar aposta:", error);
      return NextResponse.json({ error: "Erro ao salvar aposta" }, { status: 500 });
    }

    return NextResponse.json({ aposta }, { status: 201 });
  } catch (error) {
    console.error("[API/apostas] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
