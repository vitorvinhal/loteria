import { Loteria, Concurso, ResultadoSync } from '@/types';

const API_CAIXA_BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api';
const API_FALLBACK_1 = 'https://loteriascaixa-api.herokuapp.com/api';
const API_FALLBACK_2 = 'https://api.guidi.dev.br/loteria';

interface FonteDados {
  nome: string;
  url: string;
  parser: (data: unknown) => Concurso | null;
}

export async function buscarResultado(
  loteria: Loteria,
  numeroConcurso?: number
): Promise<{ concurso: Concurso | null; fonte: string }> {
  const fontes = criarFontes(loteria, numeroConcurso);

  for (const fonte of fontes) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(fonte.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LoteriasCaixa/1.0',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[Sync] Fonte ${fonte.nome} retornou status ${response.status}`);
        continue;
      }

      const data = await response.json();
      const concurso = fonte.parser(data);

      if (concurso) {
        console.log(`[Sync] Dados obtidos da fonte: ${fonte.nome}`);
        return { concurso, fonte: fonte.nome };
      }
    } catch (error) {
      console.warn(`[Sync] Falha na fonte ${fonte.nome}:`, error);
    }
  }

  console.error(`[Sync] Todas as fontes falharam para ${loteria.slug}`);
  return { concurso: null, fonte: 'nenhuma' };
}

function criarFontes(
  loteria: Loteria,
  numeroConcurso?: number
): FonteDados[] {
  const slug = loteria.slug;
  const endpoint = numeroConcurso ? `${slug}/${numeroConcurso}` : `${slug}`;

  return [
    {
      nome: 'CAIXA Oficial',
      url: `${API_CAIXA_BASE}/${endpoint}`,
      parser: (data: unknown) => parserCAIXA(data, loteria),
    },
    {
      nome: 'LoteriasCAIXA Heroku',
      url: `${API_FALLBACK_1}/${slug}/${numeroConcurso || 'latest'}`,
      parser: (data: unknown) => parserFallback(data, loteria),
    },
    {
      nome: 'Guidi Dev',
      url: `${API_FALLBACK_2}/${slug}/${numeroConcurso || 'ultimo'}`,
      parser: (data: unknown) => parserGuidi(data, loteria),
    },
  ];
}

function parserCAIXA(data: unknown, loteria: Loteria): Concurso | null {
  try {
    const d = data as Record<string, unknown>;
    const resultado = d.resultadoConcurso || d;
    const r = resultado as Record<string, unknown>;

    const dezenas = Array.isArray(r.dezenas)
      ? r.dezenas.map(Number)
      : typeof r.dezenas === 'string'
        ? (r.dezenas as string).split('-').map(Number)
        : [];

    if (dezenas.length === 0) return null;

    return {
      id: `${loteria.id}-${r.numeroConcurso}`,
      loteria_id: loteria.id,
      numero_concurso: Number(r.numeroConcurso),
      data_sorteio: r.dataApuracao as string,
      dezenas_sorteadas: dezenas,
      acumulou: Boolean(r.acumulou),
      valor_acumulado: Number(r.valorAcumulado) || 0,
      valor_estimado_proximo: Number(r.valorEstimadoProximoConcurso) || 0,
      data_proximo_concurso: r.dataProximoConcurso as string || '',
      local_sorteio: r.localApuracao as string || '',
      premiacoes: extrairPremiacoes(r),
      raw_response: data,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function parserFallback(data: unknown, loteria: Loteria): Concurso | null {
  try {
    const d = data as Record<string, unknown>;
    const dezenas = (d.dezenas as string[]) || [];

    if (dezenas.length === 0) return null;

    return {
      id: `${loteria.id}-${d.concurso}`,
      loteria_id: loteria.id,
      numero_concurso: Number(d.concurso),
      data_sorteio: d.data as string,
      dezenas_sorteadas: dezenas.map(Number),
      acumulou: Boolean(d.acumulou),
      valor_acumulado: Number(d.valor_acumulado) || 0,
      valor_estimado_proximo: Number(d.valor_estimado_proximo) || 0,
      data_proximo_concurso: d.data_proximo_concurso as string || '',
      local_sorteio: d.local_sorteio as string || '',
      premiacoes: [],
      raw_response: data,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function parserGuidi(data: unknown, loteria: Loteria): Concurso | null {
  try {
    const d = data as Record<string, unknown>;
    const dezenas = (d.dezenas as string[]) || [];

    if (dezenas.length === 0) return null;

    return {
      id: `${loteria.id}-${d.concurso}`,
      loteria_id: loteria.id,
      numero_concurso: Number(d.concurso),
      data_sorteio: d.data as string,
      dezenas_sorteadas: dezenas.map(Number),
      acumulou: Boolean(d.acumulou),
      valor_acumulado: Number(d.valor_acumulado) || 0,
      valor_estimado_proximo: Number(d.valor_estimado_proximo) || 0,
      data_proximo_concurso: '',
      local_sorteio: '',
      premiacoes: [],
      raw_response: data,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function extrairPremiacoes(data: Record<string, unknown>): Array<{
  descricao: string;
  acertos: number;
  ganhadores: number;
  premio: number;
}> {
  const premiacoes: Array<{
    descricao: string;
    acertos: number;
    ganhadores: number;
    premio: number;
  }> = [];

  if (Array.isArray(data.premiacoes)) {
    data.premiacoes.forEach((p: unknown) => {
      const premio = p as Record<string, unknown>;
      premiacoes.push({
        descricao: String(premio.descricao || ''),
        acertos: Number(premio.acertos || 0),
        ganhadores: Number(premio.ganhadores || 0),
        premio: Number(premio.valorPremio || 0),
      });
    });
  }

  return premiacoes;
}

export async function sincronizarLoteria(
  loteria: Loteria,
  ultimoConcursoConhecido?: number
): Promise<ResultadoSync> {
  const { concurso, fonte } = await buscarResultado(loteria);

  if (!concurso) {
    return {
      sucesso: false,
      fonte: 'nenhuma',
      concurso_atual: ultimoConcursoConhecido || 0,
      proximo_concurso: (ultimoConcursoConhecido || 0) + 1,
      data_proximo_sorteio: '',
      valor_acumulado: 0,
    };
  }

  return {
    sucesso: true,
    fonte,
    concurso_atual: concurso.numero_concurso,
    proximo_concurso: concurso.numero_concurso + 1,
    data_proximo_sorteio: concurso.data_proximo_concurso,
    valor_acumulado: concurso.valor_acumulado,
  };
}

export function calcularProximoSorteio(loteria: Loteria): Date {
  const agora = new Date();
  const [horas, minutos] = loteria.horario_sorteio.split(':').map(Number);

  const diasDaSemana: Record<string, number> = {
    domingo: 0,
    segunda: 1,
    terca: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
    sabado: 6,
  };

  let proximoSorteio: Date | null = null;

  for (let diasNoFuturo = 0; diasNoFuturo <= 7; diasNoFuturo++) {
    for (const diaStr of loteria.dias_sorteio) {
      const diaSemana = diasDaSemana[diaStr];
      if (diaSemana === undefined) continue;

      const candidata = new Date(agora);
      candidata.setDate(candidata.getDate() + diasNoFuturo);
      candidata.setHours(horas, minutos, 0, 0);

      if (candidata.getDay() === diaSemana && candidata > agora) {
        if (!proximoSorteio || candidata < proximoSorteio) {
          proximoSorteio = candidata;
        }
      }
    }
  }

  return proximoSorteio || new Date(agora.getTime() + 24 * 60 * 60 * 1000);
}
