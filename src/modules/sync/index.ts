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

/**
 * Busca o histórico COMPLETO de concursos de uma loteria em uma única chamada.
 * Usa o endpoint bulk da API loteriascaixa que retorna todos os concursos.
 */
export async function buscarHistoricoCompleto(
  loteria: Loteria
): Promise<{ concursos: Concurso[]; fonte: string }> {
  const fontes = [
    {
      nome: 'LoteriasCAIXA Heroku Bulk',
      url: `${API_FALLBACK_1}/${loteria.slug}`,
      parser: (data: unknown): Concurso[] => {
        if (!Array.isArray(data)) return [];
        const concursos: Concurso[] = [];
        data.forEach((item) => {
          const c = parserFallback(item as Record<string, unknown>, loteria);
          if (c) concursos.push(c);
        });
        return concursos;
      },
    },
    {
      nome: 'Guidi Dev Bulk',
      url: `${API_FALLBACK_2}/${loteria.slug}`,
      parser: (data: unknown): Concurso[] => {
        if (!Array.isArray(data)) return [];
        const concursos: Concurso[] = [];
        data.forEach((item) => {
          const c = parserGuidi(item as Record<string, unknown>, loteria);
          if (c) concursos.push(c);
        });
        return concursos;
      },
    },
  ];

  for (const fonte of fontes) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(fonte.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LoteriasCaixa/1.0',
        },
      });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const data = await response.json();
      const concursos = fonte.parser(data);

      if (concursos.length > 0) {
        // Remove duplicatas por numero_concurso
        const mapa = new Map<number, Concurso>();
        concursos.forEach((c) => {
          if (c && c.numero_concurso && c.dezenas_sorteadas.length > 0) {
            mapa.set(c.numero_concurso, c);
          }
        });
        const unicos = Array.from(mapa.values()).sort((a, b) => a.numero_concurso - b.numero_concurso);
        console.log(`[Sync] Histórico completo obtido de ${fonte.nome}: ${unicos.length} concursos`);
        return { concursos: unicos, fonte: fonte.nome };
      }
    } catch (error) {
      console.warn(`[Sync] Falha no histórico completo via ${fonte.nome}:`, error);
    }
  }

  console.error(`[Sync] Não foi possível obter histórico completo de ${loteria.slug}`);
  return { concursos: [], fonte: 'nenhuma' };
}

function criarFontes(
  loteria: Loteria,
  numeroConcurso?: number
): FonteDados[] {
  const slug = loteria.slug;
  const endpoint = numeroConcurso ? `${slug}/${numeroConcurso}` : `${slug}`;

  return [
    {
      nome: 'LoteriasCAIXA Heroku',
      url: `${API_FALLBACK_1}/${slug}/${numeroConcurso || 'latest'}`,
      parser: (data: unknown) => parserFallback(data, loteria),
    },
    {
      nome: 'CAIXA Oficial',
      url: `${API_CAIXA_BASE}/${endpoint}`,
      parser: (data: unknown) => parserCAIXA(data, loteria),
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

    // CAIXA API returns: listaDezenas, numeroConcurso, dataApuracao, etc.
    const dezenas = Array.isArray(d.listaDezenas)
      ? (d.listaDezenas as string[]).map(Number)
      : Array.isArray(d.dezenas)
        ? (d.dezenas as string[]).map(Number)
        : typeof d.dezenasSorteadasOrdemSorteio === 'string'
          ? (d.dezenasSorteadasOrdemSorteio as string).split('-').map(Number)
          : [];

    if (dezenas.length === 0) return null;

    const numero = Number(d.numeroConcurso || d.numero || 0);
    if (numero === 0) return null;

    // Parse date from DD/MM/YYYY to ISO
    const rawData = (d.dataApuracao || d.data_sorteio || '') as string;
    let dataSorteio = rawData;
    if (rawData.includes('/')) {
      const parts = rawData.split('/');
      if (parts.length === 3) {
        dataSorteio = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Parse proximo concurso date
    const rawProximo = (d.dataProximoConcurso || '') as string;
    let dataProximo = rawProximo;
    if (rawProximo.includes('/')) {
      const parts = rawProximo.split('/');
      if (parts.length === 3) {
        dataProximo = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Parse premiacoes from CAIXA format
    const premiacoes: Array<{ descricao: string; acertos: number; ganhadores: number; premio: number }> = [];
    if (Array.isArray(d.listaRateioPremio)) {
      (d.listaRateioPremio as Record<string, unknown>[]).forEach((p, idx) => {
        premiacoes.push({
          descricao: String(p.descricao || ''),
          acertos: premiacoes.length + 1,
          ganhadores: Number(p.numeroDeGanhadores || 0),
          premio: Number(p.valorPremio || 0),
        });
      });
    }

    return {
      id: `${loteria.id}-${numero}`,
      loteria_id: loteria.id,
      numero_concurso: numero,
      data_sorteio: dataSorteio,
      dezenas_sorteadas: dezenas,
      acumulou: Boolean(d.acumulado),
      valor_acumulado: Number(d.valorAcumulado) || 0,
      valor_estimado_proximo: Number(d.valorEstimadoProximoConcurso) || 0,
      data_proximo_concurso: dataProximo,
      local_sorteio: String(d.localApuracao || ''),
      premiacoes,
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

    const numero = Number(d.concurso || d.numero || 0);
    if (numero === 0) return null;

    const premiacoes: Array<{ descricao: string; acertos: number; ganhadores: number; premio: number }> = [];
    if (Array.isArray(d.premiacoes)) {
      (d.premiacoes as Record<string, unknown>[]).forEach((p) => {
        premiacoes.push({
          descricao: String(p.descricao || ''),
          acertos: Number(p.faixa || 0),
          ganhadores: Number(p.ganhadores || 0),
          premio: Number(p.valorPremio || 0),
        });
      });
    }

    const valorAcumulado = Number(d.valorAcumuladoConcurso_0_5 || d.valorAcumulado || 0);
    const valorProximo = Number(d.valorEstimadoProximoConcurso || 0);

    let dataProximo = String(d.dataProximoConcurso || '');
    if (dataProximo.includes('/')) {
      const parts = dataProximo.split('/');
      if (parts.length === 3) {
        dataProximo = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    return {
      id: `${loteria.id}-${numero}`,
      loteria_id: loteria.id,
      numero_concurso: numero,
      data_sorteio: String(d.data || ''),
      dezenas_sorteadas: dezenas.map(Number),
      acumulou: Boolean(d.acumulou),
      valor_acumulado: valorAcumulado,
      valor_estimado_proximo: valorProximo,
      data_proximo_concurso: dataProximo,
      local_sorteio: String(d.local || ''),
      premiacoes,
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
