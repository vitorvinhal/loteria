import { NextResponse } from "next/server";
import { LOTERIAS } from "@/lib/loterias";
import { buscarResultado } from "@/modules/sync";

export async function GET() {
  try {
    console.log("[Cron] Iniciando sincronização automática...");

    const resultados = await Promise.allSettled(
      LOTERIAS.filter(l => l.ativo).map(async (loteria) => {
        const { concurso, fonte } = await buscarResultado(loteria);
        return {
          loteria: loteria.slug,
          sucesso: !!concurso,
          fonte,
          numero: concurso?.numero_concurso,
        };
      })
    );

    const resumo = resultados.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { loteria: LOTERIAS[i].slug, sucesso: false, fonte: "erro", erro: String(r.reason) };
    });

    console.log("[Cron] Sincronização concluída:", resumo);

    return NextResponse.json({
      sucesso: true,
      timestamp: new Date().toISOString(),
      resultados: resumo,
    });
  } catch (error) {
    console.error("[Cron] Erro na sincronização:", error);
    return NextResponse.json(
      { sucesso: false, erro: "Erro na sincronização" },
      { status: 500 }
    );
  }
}
