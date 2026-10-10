import { getSupabase } from "@/lib/db";

export interface PalpitePlacar {
  id: string;
  user_name: string;
  game_type: string;
  numbers: number[];
  hits: number | null;
  contest_number: number | null;
  created_at: string;
}

export interface LinhaRanking {
  user_name: string;
  total_acertos: number;
  total_palpites: number;
  melhor_acerto: number;
  ultimo_palpite_em: string | null;
}

export function contarAcertos(numeros: number[], sorteadas: number[]): number {
  const conjunto = new Set(numeros);
  let acertos = 0;
  for (const d of new Set(sorteadas)) {
    if (conjunto.has(d)) acertos++;
  }
  return acertos;
}

export function agregarRanking(palpites: PalpitePlacar[]): LinhaRanking[] {
  const porUsuario = new Map<string, LinhaRanking>();
  for (const p of palpites) {
    const chave = p.user_name.trim() || "anônimo";
    let linha = porUsuario.get(chave);
    if (!linha) {
      linha = {
        user_name: chave,
        total_acertos: 0,
        total_palpites: 0,
        melhor_acerto: 0,
        ultimo_palpite_em: null,
      };
      porUsuario.set(chave, linha);
    }
    linha.total_palpites++;
    const h = p.hits ?? 0;
    linha.total_acertos += h;
    if (h > linha.melhor_acerto) linha.melhor_acerto = h;
    if (!linha.ultimo_palpite_em || p.created_at > linha.ultimo_palpite_em) {
      linha.ultimo_palpite_em = p.created_at;
    }
  }
  return [...porUsuario.values()].sort(
    (a, b) =>
      b.total_acertos - a.total_acertos ||
      b.melhor_acerto - a.melhor_acerto ||
      b.total_palpites - a.total_palpites ||
      a.user_name.localeCompare(b.user_name)
  );
}

interface ConcursoLinha {
  numero_concurso: number | null;
  dezenas_sorteadas: number[] | null;
}

export async function ultimoConcurso(
  gameType: string
): Promise<{ numero: number; dezenas: number[] } | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("concursos")
    .select("numero_concurso, dezenas_sorteadas")
    .eq("loteria_id", gameType)
    .order("numero_concurso", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const linha = data as ConcursoLinha;
  if (!linha.numero_concurso || !Array.isArray(linha.dezenas_sorteadas)) return null;
  return { numero: linha.numero_concurso, dezenas: linha.dezenas_sorteadas.map(Number) };
}
