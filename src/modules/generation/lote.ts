import { getSupabase } from "@/lib/db";
import { getUser, getSupabaseWithAuth } from "@/lib/supabase/auth/server";
import type { Loteria } from "@/types";

export interface JogoParaSalvar {
  dezenas: number[];
  score: number;
  breakdown: Record<string, unknown>;
  extras?: Record<string, number[]>;
  colunas?: number[][];
}

export interface SalvarLoteParams {
  loteria: Loteria;
  estrategiaId: string | null;
  scoreMinimo: number;
  quantidadeSolicitada: number;
  tempoExecucaoMs: number;
  origem: "algoritmo" | "ia_hibrida";
  jogos: JogoParaSalvar[];
}

/**
 * Salva lote + jogos gerados (com avatar/criador) e faz rollback do lote
 * se a inserção dos jogos falhar. Retorna null quando nada foi persistido.
 */
export async function salvarLoteGeracao(params: SalvarLoteParams): Promise<{ loteId: string | null }> {
  const { loteria, estrategiaId, scoreMinimo, quantidadeSolicitada, tempoExecucaoMs, origem, jogos } = params;
  if (jogos.length === 0) return { loteId: null };

  try {
    const user = await getUser();
    const usuarioId = user?.id ?? null;
    const criadoPor = user?.user_metadata?.nome || user?.email?.split("@")[0] || null;

    const client = user ? await getSupabaseWithAuth() : getSupabase();

    let criadorAvatar = user?.user_metadata?.avatar_url || null;
    if (usuarioId) {
      try {
        const { data: fotoRow } = await client
          .from("perfil_foto")
          .select("avatar_base64")
          .eq("usuario_id", usuarioId)
          .single();
        if (fotoRow?.avatar_base64) criadorAvatar = fotoRow.avatar_base64;
      } catch (e) {
        console.error("[GERAÇÃO] Erro ao ler avatar:", e);
      }
    }

    const { data: lote, error: errorLote } = await client
      .from("lotes_geracao")
      .insert({
        usuario_id: usuarioId,
        loteria_id: loteria.id,
        estrategia_id: estrategiaId,
        score_minimo: scoreMinimo,
        quantidade_solicitada: quantidadeSolicitada,
        quantidade_gerada: jogos.length,
        tempo_execucao_ms: tempoExecucaoMs,
        score_relaxado: jogos.length < quantidadeSolicitada,
        criado_por: criadoPor,
        criador_avatar_url: criadorAvatar,
      })
      .select()
      .single();

    if (errorLote || !lote) {
      console.error("[GERAÇÃO] Erro ao salvar lote (lotes_geracao):", errorLote?.message);
      return { loteId: null };
    }

    const { error: jogosError } = await client.from("jogos_gerados").insert(
      jogos.map((j) => ({
        lote_id: lote.id,
        usuario_id: usuarioId,
        loteria_id: loteria.id,
        dezenas: j.dezenas,
        estrategia_id: estrategiaId,
        score: j.score,
        score_breakdown: j.breakdown,
        metadados: { ...(j.extras ?? {}), ...(j.colunas ? { colunas: j.colunas } : {}) },
        origem,
      }))
    );

    if (jogosError) {
      console.error("[GERAÇÃO] Erro ao salvar jogos (jogos_gerados):", jogosError);
      await client.from("lotes_geracao").delete().eq("id", lote.id);
      return { loteId: null };
    }

    return { loteId: lote.id };
  } catch (e) {
    console.error("[GERAÇÃO] Erro ao salvar:", e);
    return { loteId: null };
  }
}
