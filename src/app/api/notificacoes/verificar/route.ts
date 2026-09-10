import { NextResponse } from "next/server";
import { verificarNovosResultados, notificarAcumulacao } from "@/lib/notifications";

export async function POST() {
  try {
    console.log("[Notificacoes] Iniciando verificação...");

    const [resultado, acumulacao] = await Promise.allSettled([
      verificarNovosResultados(),
      notificarAcumulacao(),
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
