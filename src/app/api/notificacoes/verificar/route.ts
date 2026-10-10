import { NextResponse } from "next/server";
import { verificarNovosResultados, notificarAcumulacao } from "@/lib/notifications";
import { getSession } from "@/lib/supabase/auth/server";

export async function POST() {
  try {
    // RLS de notificacoes/apostas é por dono: a verificação roda apenas para
    // o usuário logado (sem sessão não há o que verificar).
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { sucesso: false, erro: "Sessão necessária para verificar notificações" },
        { status: 401 }
      );
    }

    console.log("[Notificacoes] Iniciando verificação...");

    const [resultado, acumulacao] = await Promise.allSettled([
      verificarNovosResultados(session.user.id),
      notificarAcumulacao(session.user.id),
    ]);

    const resumo = {
      resultados: resultado.status === "fulfilled"
        ? resultado.value
        : { erro: String(resultado.reason) },
      acumulacao: acumulacao.status === "fulfilled"
        ? acumulacao.value
        : { erro: String(acumulacao.reason) },
    };

    const totalNotificacoes =
      (typeof resumo.resultados === "object" && "notificacoesCriadas" in resumo.resultados
        ? resumo.resultados.notificacoesCriadas
        : 0) +
      (typeof resumo.acumulacao === "object" && "notificacoesCriadas" in resumo.acumulacao
        ? resumo.acumulacao.notificacoesCriadas
        : 0);

    console.log("[Notificacoes] Verificação concluída:", {
      totalNotificacoes,
    });

    return NextResponse.json({
      sucesso: true,
      timestamp: new Date().toISOString(),
      totalNotificacoes,
      detalhes: resumo,
    });
  } catch (error) {
    console.error("[Notificacoes] Erro na verificação:", error);
    return NextResponse.json(
      { sucesso: false, erro: "Erro na verificação de notificações" },
      { status: 500 }
    );
  }
}
