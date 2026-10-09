import { NextRequest, NextResponse } from "next/server";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { obterRegra } from "@/modules/lottery";
import type { JogoSorteado } from "@/modules/lottery";

type JogoBolao =
  | number[]
  | {
      dezenas: number[];
      colunas?: number[][];
      extras?: Record<string, number[]>;
    };

interface BolaoRequest {
  jogos: JogoBolao[];
  quantidade_cotas: number;
}

function paraJogoSorteado(j: JogoBolao): JogoSorteado {
  if (Array.isArray(j)) return { dezenas: j };
  return { dezenas: j.dezenas, colunas: j.colunas, extras: j.extras };
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

    // Custo real por jogo via o motor (múltipla do Super Sete, sistema da
    // Mega, trevos da +Milionária etc.), não o preço base × quantidade.
    const regra = obterRegra(loteria);
    const custoTotal = jogos.reduce(
      (soma, j) => soma + regra.custo(paraJogoSorteado(j), loteria),
      0
    );
    const custoPorCota = custoTotal / quantidade_cotas;

    // Projeções pelas faixas oficiais da modalidade; o valor do prêmio não é
    // fabricado — fica null até vir de um concurso real.
    const projecoes = loteria.regras_vitoria.map(regraVitoria => ({
      acertos: regraVitoria.acertos_min,
      descricao: regraVitoria.descricao,
      premio_estimado: null as number | null,
      por_cota: null as number | null,
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
