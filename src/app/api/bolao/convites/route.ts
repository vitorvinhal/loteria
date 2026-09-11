import { NextRequest, NextResponse } from "next/server";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { email_convidado, loteria_id, quantidade_cotas, jogos } = body;

    if (!email_convidado || !loteria_id || !quantidade_cotas || quantidade_cotas < 1) {
      return NextResponse.json({ error: "email, loteria e cotas são obrigatórios" }, { status: 400 });
    }

    const supabase = await getSupabaseWithAuth();

    const remetenteNome =
      session.user.user_metadata?.nome ||
      session.user.email?.split("@")[0] ||
      "Usuário";

    const { data, error } = await supabase
      .from("convites_bolao")
      .insert({
        usuario_remetente: session.user.id,
        remetente_nome: remetenteNome,
        email_convidado: email_convidado.trim().toLowerCase(),
        loteria_id,
        quantidade_cotas,
        jogos: jogos || [],
        status: "pendente",
      })
      .select()
      .single();

    if (error) {
      console.error("[API/bolao/convites] Erro ao criar convite:", error);
      return NextResponse.json({ error: error.message || "Erro ao criar convite" }, { status: 500 });
    }

    return NextResponse.json({ convite: data }, { status: 201 });
  } catch (error) {
    console.error("[API/bolao/convites] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ convites: [] }, { status: 200 });
    }

    const supabase = await getSupabaseWithAuth();
    const email = session.user.email?.toLowerCase();

    const { data: convites, error } = await supabase
      .from("convites_bolao")
      .select("*")
      .eq("email_convidado", email)
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("[API/bolao/convites] Erro ao buscar convites:", error);
      return NextResponse.json({ convites: [] }, { status: 200 });
    }

    return NextResponse.json({ convites: convites || [] });
  } catch (error) {
    console.error("[API/bolao/convites] Erro geral:", error);
    return NextResponse.json({ convites: [] }, { status: 200 });
  }
}