import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { getSession, getSupabaseWithAuth } from "@/lib/supabase/auth/server";
import { isAdminUser } from "@/lib/admin";

interface LoteRow {
  id: string;
  usuario_id: string | null;
  loteria_id: string;
  estrategia_id: string | null;
  criado_em: string;
  criado_por: string | null;
  criador_avatar_url: string | null;
}

interface JogoRow {
  id: string;
  lote_id: string | null;
  usuario_id: string | null;
  loteria_id: string;
  dezenas: number[];
  score: number | null;
  nome?: string | null;
  score_breakdown?: Record<string, unknown> | null;
  criado_em: string;
}

export async function GET() {
  try {
    const session = await getSession();

    // Cliente autenticado (carrega usuario_id real, respeita RLS com auth.uid())
    const supabase = session?.user ? await getSupabaseWithAuth() : getSupabase();
    const userId = session?.user?.id ?? null;
    const ehAdmin = isAdminUser(session?.user);

    // Foto atual do usuário logado (para lotes dele antigos sem foto gravada)
    let minhaFoto: string | null = null;
    if (userId) {
      const { data: fotoRow } = await supabase
        .from("perfil_foto")
        .select("avatar_base64")
        .eq("usuario_id", userId)
        .single();
      minhaFoto = fotoRow?.avatar_base64 || session?.user?.user_metadata?.avatar_url || null;
    }

    // Histórico COMPARTILHADO: busca TODOS os lotes/jogos em paginação
    // (sem limite, o PostgREST padrão limita a 1000 linhas por request)
    const TAMANHO_PAGINA = 1000;
    const lotes: LoteRow[] = [];
    const jogosAcumulados: JogoRow[] = [];

    for (let offset = 0; ; offset += TAMANHO_PAGINA) {
      const { data: paginaLotes, error } = await supabase
        .from("lotes_geracao")
        .select("*")
        .order("criado_em", { ascending: false })
        .range(offset, offset + TAMANHO_PAGINA - 1);
      if (error) {
        console.error("[API] Erro ao buscar lotes:", error);
        break;
      }
      if (!paginaLotes || paginaLotes.length === 0) break;
      lotes.push(...paginaLotes);
      if (paginaLotes.length < TAMANHO_PAGINA) break;
    }

    for (let offset = 0; ; offset += TAMANHO_PAGINA) {
      const { data: paginaJogos, error } = await supabase
        .from("jogos_gerados")
        .select("*")
        .order("criado_em", { ascending: false })
        .range(offset, offset + TAMANHO_PAGINA - 1);
      if (error) {
        console.error("[API] Erro ao buscar jogos:", error);
        break;
      }
      if (!paginaJogos || paginaJogos.length === 0) break;
      jogosAcumulados.push(...paginaJogos);
      if (paginaJogos.length < TAMANHO_PAGINA) break;
    }

    const loteriaSet = new Set<string>();
    lotes.forEach((lote) => loteriaSet.add(lote.loteria_id));

    const scores = jogosAcumulados.map((j) => j.score).filter((s): s is number => s !== null) || [];
    const melhorScore = scores.length > 0 ? Math.max(...scores) : 0;
    const mediaScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const stats = {
      totalJogos: jogosAcumulados.length,
      totalLotes: lotes.length,
      loteriasUsadas: Array.from(loteriaSet),
      melhorScore,
      mediaScore,
    };

    // jogos que pertencem ao usuário logado → podem ser excluídos
    const jogosPorLote = new Map<string, typeof jogosAcumulados>();
    jogosAcumulados.forEach((j) => {
      if (!j.lote_id) return;
      const lista = jogosPorLote.get(j.lote_id) || [];
      lista.push(j);
      jogosPorLote.set(j.lote_id, lista);
    });

    const lotesComJogos = lotes
    .map((lote) => {
      const ehMeuLote = userId != null && lote.usuario_id === userId;
      const foto = lote.criador_avatar_url || (ehMeuLote ? minhaFoto : null);
      return {
        ...lote,
        loteria: lote.loteria_id,
        estrategia: lote.estrategia_id || "manual",
        criado_por: lote.criado_por || (session?.user?.user_metadata?.nome || session?.user?.email?.split("@")[0] || null),
        criador_avatar_url: foto,
        eh_do_usuario: ehMeuLote,
        usuario_pode_excluir: ehAdmin || ehMeuLote,
        jogos: jogosPorLote.get(lote.id) || [],
      };
    })
    .filter((lote) => lote.jogos.length > 0) || []; // ignora lotes sem jogos

    return NextResponse.json({
      lotes: lotesComJogos,
      stats,
      is_admin: ehAdmin,
      usuario_atual: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        nome: session.user.user_metadata?.nome || session.user.email?.split("@")[0] || "Usuário",
        avatar_url: session.user.user_metadata?.avatar_url || null,
      } : null,
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
    const { loteria, jogos } = body as { loteria?: string; jogos?: Array<{ dezenas: number[]; score: number | null; nome?: string }> };

    if (!loteria || !jogos || !Array.isArray(jogos) || jogos.length === 0) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    // Usa cliente autenticado para respeitar RLS (auth.uid()) em INSERT
    const supabase = session?.user ? await getSupabaseWithAuth() : getSupabase();

    const criadoPor = session?.user?.user_metadata?.nome || session?.user?.email?.split("@")[0] || null;
    let avatarUrl = session?.user?.user_metadata?.avatar_url || null;
    if (userId) {
      const { data: fotoRow } = await supabase
        .from('perfil_foto')
        .select('avatar_base64')
        .eq('usuario_id', userId)
        .single();
      if (fotoRow?.avatar_base64) avatarUrl = fotoRow.avatar_base64;
    }

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
        criado_por: criadoPor,
        criador_avatar_url: avatarUrl,
      })
      .select()
      .single();

    if (loteError) {
      console.error("[API] Erro ao criar lote:", loteError);
      return NextResponse.json({ error: "Erro ao criar lote" }, { status: 500 });
    }

    // Inserir jogos
    const jogosParaSalvar = jogos.map((j: { dezenas: number[]; score: number | null; nome?: string }) => ({
      lote_id: lote.id,
      usuario_id: userId,
      loteria_id: loteria,
      dezenas: j.dezenas,
      estrategia_id: null,
      score: j.score || 0,
      score_breakdown: {},
      origem: "manual",
      nome: j.nome || null,
    }));

    const { error: jogosError } = await supabase.from("jogos_gerados").insert(jogosParaSalvar);

    if (jogosError) {
      console.error("[API] Erro ao salvar jogos:", jogosError);
      // Rollback: remove o lote vazio criado
      await supabase.from("lotes_geracao").delete().eq("id", lote.id);
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
