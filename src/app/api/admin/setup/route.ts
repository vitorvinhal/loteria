import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";

export async function GET() {
  try {
    const supabase = getSupabase();

    const { count: strategiesCount } = await supabase
      .from("estrategias")
      .select("id", { count: "exact", head: true });

    const { count: concursosCount } = await supabase
      .from("concursos")
      .select("id", { count: "exact", head: true });

    const { count: lotesCount } = await supabase
      .from("lotes_geracao")
      .select("id", { count: "exact", head: true });

    return NextResponse.json({
      ok: true,
      strategies: strategiesCount || 0,
      concursos: concursosCount || 0,
      lotes: lotesCount || 0,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = getSupabase();
    const results: string[] = [];

    // 1. Seed strategies
    const estrategias = [
      { id: "est_quentes", slug: "quentes", nome: "Números Quentes", descricao_curta: "Números mais frequentes", descricao_completa: "Seleciona os números com maior frequência nos últimos concursos.", categoria: "frequencia", parametros_padrao: { janela: 20 } },
      { id: "est_frias", slug: "frias", nome: "Números Frios", descricao_curta: "Números mais atrasados", descricao_completa: "Seleciona os números que mais demoraram a sair.", categoria: "atraso", parametros_padrao: { janela: 20 } },
      { id: "est_par_impar", slug: "par_impar", nome: "Par/Ímpar Equilibrado", descricao_curta: "Equilíbrio entre pares e ímpares", descricao_completa: "Distribuição equilibrada entre números pares e ímpares.", categoria: "combinacao", parametros_padrao: {} },
      { id: "est_soma", slug: "soma", nome: "Soma Ideal", descricao_curta: "Soma dentro da faixa", descricao_completa: "Seleciona números cuja soma total está dentro da faixa estatística ideal.", categoria: "soma", parametros_padrao: {} },
      { id: "est_quadrantes", slug: "quadrantes", nome: "Quadrantes", descricao_curta: "Distribuição por zona", descricao_completa: "Distribui os números uniformemente nas faixas do universo.", categoria: "distribuicao", parametros_padrao: {} },
      { id: "est_delta", slug: "delta", nome: "Sequências", descricao_curta: "Números consecutivos", descricao_completa: "Inclui pares de números consecutivos quando estatisticamente favorecido.", categoria: "padrao", parametros_padrao: {} },
      { id: "est_exclusao", slug: "exclusao_padroes", nome: "Exclusão de Padrões", descricao_curta: "Remove padrões fracos", descricao_completa: "Exclui combinações que violam padrões estatísticos.", categoria: "exclusao", parametros_padrao: {} },
      { id: "est_repeticao", slug: "repeticao_controlada", nome: "Repetição Controlada", descricao_curta: "Repetição entre concursos", descricao_completa: "Controla a repetição de números entre concursos consecutivos.", categoria: "repeticao", parametros_padrao: {} },
      { id: "est_fechamento", slug: "fechamento", nome: "Fechamento", descricao_curta: "Sistema de rolagem", descricao_completa: "Gera fechamento matemático para garantir cobertura mínima.", categoria: "fechamento", parametros_padrao: { acertos_min: 5 } },
      { id: "est_hibrida", slug: "hibrida_ia", nome: "Híbrida IA", descricao_curta: "Combinação inteligente", descricao_completa: "Combina todas as estratégias com pesos otimizados por IA.", categoria: "hibrida", parametros_padrao: {} },
      { id: "est_estatistica", slug: "estatistica", nome: "Estatística Ponderada", descricao_curta: "Métricas combinadas", descricao_completa: "Combinação ponderada de todas as métricas estatísticas.", categoria: "estatistica", parametros_padrao: {} },
      { id: "est_aleatorio", slug: "aleatorio", nome: "Aleatório", descricao_curta: "Seleção aleatória", descricao_completa: "Seleção aleatória limpa sem influência estatística.", categoria: "aleatorio", parametros_padrao: {} },
    ];

    for (const e of estrategias) {
      try {
        const { error } = await supabase.from("estrategias").upsert({
          id: e.id,
          slug: e.slug,
          nome: e.nome,
          descricao_curta: e.descricao_curta,
          descricao_completa: e.descricao_completa,
          categoria: e.categoria,
          parametros_padrao: e.parametros_padrao,
          ativo: true,
        }, { onConflict: "slug" });

        if (error) {
          results.push(`Estratégia ${e.slug}: ${error.message}`);
        } else {
          results.push(`Estratégia ${e.slug} OK`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push(`Estratégia ${e.slug}: ${msg}`);
      }
    }

    // 2. Try to make estrategia_id nullable via RPC
    try {
      const { error } = await supabase.rpc("exec_sql", {
        sql: "ALTER TABLE lotes_geracao ALTER COLUMN estrategia_id DROP NOT NULL; ALTER TABLE jogos_gerados ALTER COLUMN estrategia_id DROP NOT NULL;"
      });
      if (error) {
        results.push(`RPC exec_sql: ${error.message} (Execute manualmente no Supabase SQL Editor)`);
      } else {
        results.push("Colunas estrategia_id alteradas para nullable OK");
      }
    } catch {
      results.push("RPC exec_sql não disponível (Execute manualmente no Supabase SQL Editor)");
    }

    // 3. Check current state
    const { count: strategiesCount } = await supabase
      .from("estrategias")
      .select("id", { count: "exact", head: true });

    return NextResponse.json({
      ok: true,
      results,
      totalEstrategias: strategiesCount || 0,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
