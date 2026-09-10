import { createClient } from '@supabase/supabase-js';
import { Loteria, Concurso, Estrategia, JogoGerado, LoteGeracao } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getLoterias(): Promise<Loteria[]> {
  const { data, error } = await supabase
    .from('loterias')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (error) throw error;
  return data || [];
}

export async function getLoteriaPorId(id: string): Promise<Loteria | null> {
  const { data, error } = await supabase
    .from('loterias')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function getConcursosPorLoteria(
  loteriaId: string,
  limit = 50,
  offset = 0
): Promise<Concurso[]> {
  const { data, error } = await supabase
    .from('concursos')
    .select('*')
    .eq('loteria_id', loteriaId)
    .order('numero_concurso', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

export async function getUltimoConcurso(loteriaId: string): Promise<Concurso | null> {
  const { data, error } = await supabase
    .from('concursos')
    .select('*')
    .eq('loteria_id', loteriaId)
    .order('numero_concurso', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

export async function getEstrategias(): Promise<Estrategia[]> {
  const { data, error } = await supabase
    .from('estrategias')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (error) throw error;
  return data || [];
}

export async function salvarJogo(jogo: Omit<JogoGerado, 'id' | 'criado_em'>): Promise<JogoGerado> {
  const { data, error } = await supabase
    .from('jogos_gerados')
    .insert(jogo)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function salvarLote(lote: Omit<LoteGeracao, 'id' | 'criado_em'>): Promise<LoteGeracao> {
  const { data, error } = await supabase
    .from('lotes_geracao')
    .insert(lote)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getJogosPorLote(loteId: string): Promise<JogoGerado[]> {
  const { data, error } = await supabase
    .from('jogos_gerados')
    .select('*')
    .eq('lote_id', loteId)
    .order('score', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getJogosPorLoteria(
  loteriaId: string,
  limit = 50,
  offset = 0
): Promise<JogoGerado[]> {
  const { data, error } = await supabase
    .from('jogos_gerados')
    .select('*')
    .eq('loteria_id', loteriaId)
    .order('criado_em', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

export async function compararJogoComConcurso(
  jogoId: string,
  concursoId: string
): Promise<{ qtd_acertos: number; percentual: number }> {
  const { data: jogo, error: errorJogo } = await supabase
    .from('jogos_gerados')
    .select('dezenas')
    .eq('id', jogoId)
    .single();

  if (errorJogo) throw errorJogo;

  const { data: concurso, error: errorConcurso } = await supabase
    .from('concursos')
    .select('dezenas_sorteadas')
    .eq('id', concursoId)
    .single();

  if (errorConcurso) throw errorConcurso;

  const dezenasJogo = new Set(jogo.dezenas);
  const dezenasConcurso = new Set(concurso.dezenas_sorteadas);
  const acertos = Array.from(dezenasJogo).filter(d => dezenasConcurso.has(d)).length;
  const percentual = Math.round((acertos / jogo.dezenas.length) * 100);

  return { qtd_acertos: acertos, percentual };
}
