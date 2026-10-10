import { getSupabaseWithAuth } from '@/lib/supabase/auth/server';
import { getLoteriasAtivas } from '@/lib/loterias';

export type TipoNotificacao = 'resultado' | 'score' | 'sistema';

interface NotificacaoParams {
  usuarioId: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  dados?: Record<string, unknown>;
}

export async function criarNotificacao({
  usuarioId,
  tipo,
  titulo,
  mensagem,
  dados,
}: NotificacaoParams): Promise<void> {
  // Cliente autenticado: RLS de notificacoes exige usuario_id = auth.uid(),
  // então o lote só notifica o próprio usuário logado.
  const supabase = await getSupabaseWithAuth();

  const { error } = await supabase.from('notificacoes').insert({
    usuario_id: usuarioId,
    tipo,
    titulo,
    mensagem,
    dados: dados ?? {},
    lida: false,
  });

  if (error) {
    console.error('[Notificacoes] Erro ao criar notificação:', error);
    throw error;
  }
}

export async function verificarNovosResultados(usuarioId: string): Promise<{
  processadas: number;
  notificacoesCriadas: number;
}> {
  const supabase = await getSupabaseWithAuth();
  const loterias = getLoteriasAtivas();
  let notificacoesCriadas = 0;

  for (const loteria of loterias) {
    const { data: ultimoConcurso } = await supabase
      .from('concursos')
      .select('id, numero_concurso, dezenas_sorteadas, data_sorteio')
      .eq('loteria_id', loteria.id)
      .order('numero_concurso', { ascending: false })
      .limit(1)
      .single();

    if (!ultimoConcurso) continue;

    const { data: apostas, error: errorApostas } = await supabase
      .from('apostas')
      .select('id, usuario_id, dezenas')
      .eq('loteria_id', loteria.id)
      .eq('usuario_id', usuarioId);

    if (errorApostas || !apostas?.length) continue;

    const dezenasSorteadas = new Set(ultimoConcurso.dezenas_sorteadas as number[]);

    const usuariosNotificados = new Set<string>();

    for (const aposta of apostas) {
      if (usuariosNotificados.has(aposta.usuario_id)) continue;

      const dezenasAposta = aposta.dezenas as number[];
      const acertos = dezenasAposta.filter(d => dezenasSorteadas.has(d)).length;

      if (acertos >= 3) {
        await criarNotificacao({
          usuarioId: aposta.usuario_id,
          tipo: 'resultado',
          titulo: `${loteria.nome} - ${acertos} acertos!`,
          mensagem: `Seu jogo na ${loteria.nome} acertou ${acertos} dezenas no concurso ${ultimoConcurso.numero_concurso}.`,
          dados: {
            loteria_id: loteria.id,
            concurso_id: ultimoConcurso.id,
            numero_concurso: ultimoConcurso.numero_concurso,
            acertos,
            dezenas_apostadas: dezenasAposta,
            dezenas_sorteadas: Array.from(dezenasSorteadas),
          },
        });

        usuariosNotificados.add(aposta.usuario_id);
        notificacoesCriadas++;
      }
    }
  }

  return { processadas: loterias.length, notificacoesCriadas };
}

export async function notificarAcumulacao(usuarioId: string): Promise<{
  loteriasComAcumulo: number;
  notificacoesCriadas: number;
}> {
  const supabase = await getSupabaseWithAuth();
  const loterias = getLoteriasAtivas();
  let notificacoesCriadas = 0;

  for (const loteria of loterias) {
    const { data: ultimoConcurso } = await supabase
      .from('concursos')
      .select('id, numero_concurso, acumulou, valor_acumulado')
      .eq('loteria_id', loteria.id)
      .order('numero_concurso', { ascending: false })
      .limit(1)
      .single();

    if (!ultimoConcurso || !ultimoConcurso.acumulou) continue;

    const valorAcumulado = Number(ultimoConcurso.valor_acumulado);
    if (valorAcumulado <= 0) continue;

    const { data: usuarios } = await supabase
      .from('apostas')
      .select('usuario_id')
      .eq('loteria_id', loteria.id)
      .eq('usuario_id', usuarioId);

    if (!usuarios?.length) continue;

    const usuarioIds = [...new Set(usuarios.map(u => u.usuario_id))];

    for (const usuarioId of usuarioIds) {
      const valorFormatado = valorAcumulado.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

      await criarNotificacao({
        usuarioId,
        tipo: 'sistema',
        titulo: `${loteria.nome} acumulou!`,
        mensagem: `A ${loteria.nome} acumulou ${valorFormatado} no concurso ${ultimoConcurso.numero_concurso}. Não perca o próximo sorteio!`,
        dados: {
          loteria_id: loteria.id,
          concurso_id: ultimoConcurso.id,
          numero_concurso: ultimoConcurso.numero_concurso,
          valor_acumulado: valorAcumulado,
        },
      });

      notificacoesCriadas++;
    }
  }

  return { loteriasComAcumulo: notificacoesCriadas > 0 ? 1 : 0, notificacoesCriadas };
}
