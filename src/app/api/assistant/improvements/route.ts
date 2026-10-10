import { NextRequest, NextResponse } from "next/server";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const supabase = await getSupabaseWithAuth();
    const { data, error } = await supabase
      .from("site_improvements")
      .select("id, requested_by, original_feedback, generated_prompt, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[assistant/improvements] erro ao listar:", error);
      return NextResponse.json({ error: "Erro ao listar melhorias" }, { status: 500 });
    }

    return NextResponse.json({ melhorias: data ?? [] });
  } catch (error) {
    console.error("[assistant/improvements] erro geral:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

const STATUS_OK = new Set(["pendente", "em_andamento", "feito", "rejeitado"]);

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (!isAdminUser(session.user)) {
      return NextResponse.json({ error: "Apenas o admin pode alterar o status" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id : null;
    const status = typeof body?.status === "string" ? body.status : null;
    if (!id || !status || !STATUS_OK.has(status)) {
      return NextResponse.json({ error: "id ou status inválido" }, { status: 400 });
    }

    const supabase = await getSupabaseWithAuth();
    const { data, error } = await supabase
      .from("site_improvements")
      .update({ status })
      .eq("id", id)
      .select("id, status")
      .maybeSingle();
    if (error || !data) {
      console.error("[assistant/improvements] erro ao atualizar:", error);
      return NextResponse.json({ error: "Erro ao atualizar status" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: data.status });
  } catch (error) {
    console.error("[assistant/improvements] erro geral:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
