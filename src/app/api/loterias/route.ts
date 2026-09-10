import { NextResponse } from "next/server";
import { LOTERIAS } from "@/lib/loterias";

export async function GET() {
  return NextResponse.json({
    loterias: LOTERIAS.filter(l => l.ativo).map(l => ({
      id: l.id,
      slug: l.slug,
      nome: l.nome,
      universo: `${l.universo_min}-${l.universo_max}`,
      dezenas: l.qtd_dezenas_padrao,
    })),
  });
}
