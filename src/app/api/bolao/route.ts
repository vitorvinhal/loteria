import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";

interface BolaoRequest {
  jogos: number[][];
  quantidade_cotas: number;
}

export async function POST(
  request: NextRequest
) {
  try {
    const url = new URL(request.url);
    const slug = url.pathname.split('/').pop() || '';
    const loteria = getLoteriaPorSlug(slug);

    if (!loteria) {
      return NextResponse.json(
        { error: "Loteria não encontrada" },
        { status: 404 }
      );
    }

    const body: BolaoRequest = await request.json();
    const { jogos, quantidade_cotas } = body;

    if (!jogos?.length || quantidade_cotas < 1) {
      return NextResponse.json(
        { error: "Jogos e quantidade de cotas são obrigatórios" },
        { status: 400 }
      );
    }

    const custoTotal = loteria.preco_aposta_base * jogos.length;
    const custoPorCota = custoTotal / quantidade_cotas;

    const projecoes = [
      { acertos: 4, descricao: "Quadra" },
      { acertos: 5, descricao: "Quina" },
      { acertos: 6, descricao: "Sena" },
    ].map(p => ({
      ...p,
      premio_estimado: p.acertos === 4 ? 1500 : p.acertos === 5 ? 35000 : 3500000,
      por_cota: (p.acertos === 4 ? 1500 : p.acertos === 5 ? 35000 : 3500000) / quantidade_cotas,
    }));

    return NextResponse.json({
      quantidade_cotas,
      jogos_incluidos: jogos.length,
      custo_total: custoTotal,
      custo_por_cota: custoPorCota,
      projecoes,
    });
  } catch (error) {
    console.error("[API] Erro na simulação de bolão:", error);
    return NextResponse.json(
      { error: "Erro ao simular bolão" },
      { status: 500 }
    );
  }
}
