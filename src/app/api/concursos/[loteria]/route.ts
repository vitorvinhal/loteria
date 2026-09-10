import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { getSupabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ loteria: string }> }
) {
  try {
    const { loteria: slug } = await params;
    const loteria = getLoteriaPorSlug(slug);

    if (!loteria) {
      return NextResponse.json(
        { error: "Loteria não encontrada" },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    const supabase = getSupabase();

    const { count } = await supabase
      .from("concursos")
      .select("id", { count: "exact", head: true })
      .eq("loteria_id", loteria.id);

    const { data: concursos, error } = await supabase
      .from("concursos")
      .select("*")
      .eq("loteria_id", loteria.id)
      .order("numero_concurso", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[API] Erro ao buscar concursos:", error);
      return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 });
    }

    return NextResponse.json({
      concursos: concursos || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
