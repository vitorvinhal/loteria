import { NextRequest, NextResponse } from "next/server";

interface CompararRequest {
  dezenas: number[];
  resultado: number[];
}

export async function POST(request: NextRequest) {
  try {
    const body: CompararRequest = await request.json();
    const { dezenas, resultado } = body;

    if (!dezenas?.length || !resultado?.length) {
      return NextResponse.json(
        { error: "Dezenas e resultado são obrigatórios" },
        { status: 400 }
      );
    }

    const setResultado = new Set(resultado);
    const acertos = dezenas.filter(d => setResultado.has(d)).sort((a, b) => a - b);
    const erros = dezenas.filter(d => !setResultado.has(d)).sort((a, b) => a - b);
    const percentual = Math.round((acertos.length / dezenas.length) * 100);

    return NextResponse.json({
      acertos,
      erros,
      qtd_acertos: acertos.length,
      percentual,
    });
  } catch (error) {
    console.error("[API] Erro na comparação:", error);
    return NextResponse.json(
      { error: "Erro ao comparar jogos" },
      { status: 500 }
    );
  }
}
