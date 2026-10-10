import type { Loteria } from "@/types";
import type { JogoSorteado } from "@/modules/lottery";
import { resolverConfigIA } from "./provider";

/** Teto de jogos por chamada de IA (controle de custo/latência). */
export const LIMITE_JOGOS_IA = 50;
/** Timeout da chamada ao modelo (ms). */
export const TIMEOUT_IA_MS = 30000;

export interface MensagensIA {
  system: string;
  user: string;
}

export interface OpcoesPromptIA {
  qtdDezenas?: number;
  estrategia?: { nome?: string; descricao_curta?: string };
  topFrequentes?: Array<[number, number]>;
}

/** Top N dezenas por frequência (desempate pela dezena menor). */
export function topFrequencias(freq: Map<number, number>, limite = 12): Array<[number, number]> {
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, limite);
}

/**
 * Monta o prompt (system + user) para o modelo gerar jogos da loteria.
 * As regras vêm da própria configuração — nunca de texto colado em runtime.
 */
export function montarMensagensIA(
  loteria: Loteria,
  quantidade: number,
  opts: OpcoesPromptIA = {}
): MensagensIA {
  const system =
    'Você é um gerador de jogos da loteria brasileira. ' +
    'Responda SOMENTE com JSON válido, sem comentários nem markdown, ' +
    'no formato {"jogos":[{"dezenas":[1,2,3]}, ...]}. ' +
    'Todos os jogos devem ser distintos e obedecer exatamente às regras informadas.';

  const qtd = opts.qtdDezenas ?? loteria.qtd_dezenas_padrao;
  const posicional = loteria.mecanica === 'posicional';
  const linhas: string[] = [];

  linhas.push(`Loteria: ${loteria.nome} (${loteria.slug}).`);
  if (posicional && loteria.colunas) {
    linhas.push(
      `Mecânica posicional: ${loteria.colunas.total_colunas} colunas; cada jogo tem exatamente ` +
        `${loteria.colunas.total_colunas} dígitos (UM por coluna, na ordem), cada dígito de ` +
        `${loteria.colunas.universo_min} a ${loteria.colunas.universo_max}.`
    );
  } else {
    const faixaQtd =
      loteria.qtd_dezenas_min === loteria.qtd_dezenas_max
        ? `exatamente ${loteria.qtd_dezenas_padrao}`
        : `exatamente ${qtd} (mín ${loteria.qtd_dezenas_min}, máx ${loteria.qtd_dezenas_max})`;
    const extraDupla = loteria.slug === 'duplasena'
      ? ' — 6 dezenas para o 1º sorteio e 6 para o 2º, em ordem crescente'
      : '';
    linhas.push(
      `Cada jogo tem ${faixaQtd} dezenas distintas entre ${loteria.universo_min} e ` +
        `${loteria.universo_max}${extraDupla}.`
    );
  }

  for (const comp of loteria.componentes_extras ?? []) {
    if (!comp.obrigatorio) continue;
    const qtdExtra = comp.qtd_min === comp.qtd_max
      ? `${comp.qtd_min}`
      : `${comp.qtd_min} a ${comp.qtd_max}`;
    linhas.push(
      `Cada jogo deve incluir o extra "${comp.tipo}" (${comp.nome}): ${qtdExtra} valor(es) ` +
        `entre ${comp.universo_min} e ${comp.universo_max}, no campo "extras" ` +
        `(ex.: "extras":{"${comp.tipo}":[2,5]}).`
    );
  }

  if (opts.estrategia?.nome) {
    linhas.push(
      `Estratégia solicitada: ${opts.estrategia.nome}` +
        (opts.estrategia.descricao_curta ? ` — ${opts.estrategia.descricao_curta}` : '')
    );
  }

  if (opts.topFrequentes?.length) {
    const top = opts.topFrequentes.map(([d, f]) => `${d} (${f}x)`).join(', ');
    linhas.push(`Dezenas mais frequentes nos últimos concursos: ${top}. Use como referência, não como regra.`);
  }

  linhas.push(`Gere exatamente ${quantidade} jogos distintos, no formato JSON {"jogos":[...]} com ${quantidade} itens.`);

  return { system, user: linhas.join('\n') };
}

/** Remove cercas de markdown/prosa e devolve apenas o objeto JSON. */
export function limparConteudoIA(conteudo: string): string {
  const t = conteudo.trim();
  const semFences = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const ini = semFences.indexOf('{');
  const fim = semFences.lastIndexOf('}');
  if (ini !== -1 && fim > ini) return semFences.slice(ini, fim + 1);
  return semFences;
}

/**
 * Valida a resposta do modelo contra o motor da loteria.
 * Jogo fora de regra, duplicado ou malformado é descartado — nunca passa sem validar.
 */
export function validarJogosIA(
  parsed: unknown,
  loteria: Loteria,
  regra: {
    validar: (jogo: JogoSorteado, loteria: Loteria) => { valido: boolean };
    chave: (jogo: JogoSorteado) => string;
  }
): { validos: JogoSorteado[]; descartados: number } {
  const obj = parsed as { jogos?: unknown } | null;
  if (!obj || !Array.isArray(obj.jogos)) return { validos: [], descartados: 0 };

  const posicional = loteria.mecanica === 'posicional';
  const validos: JogoSorteado[] = [];
  const vistos = new Set<string>();
  let descartados = 0;

  for (const item of obj.jogos as unknown[]) {
    const j = item as { dezenas?: unknown; extras?: unknown };
    if (
      !j ||
      !Array.isArray(j.dezenas) ||
      j.dezenas.length === 0 ||
      !j.dezenas.every((d) => typeof d === 'number' && Number.isInteger(d))
    ) {
      descartados++;
      continue;
    }
    const dezenas = [...(j.dezenas as number[])];
    if (!posicional) dezenas.sort((a, b) => a - b);

    const extras: Record<string, number[]> = {};
    if (j.extras && typeof j.extras === 'object' && !Array.isArray(j.extras)) {
      for (const [tipo, v] of Object.entries(j.extras as Record<string, unknown>)) {
        if (Array.isArray(v) && v.every((x) => typeof x === 'number' && Number.isInteger(x))) {
          extras[tipo] = v as number[];
        }
      }
    }

    const jogo: JogoSorteado = {
      dezenas,
      extras: Object.keys(extras).length ? extras : undefined,
      colunas: posicional ? dezenas.map((d) => [d]) : undefined,
    };

    if (!regra.validar(jogo, loteria).valido) {
      descartados++;
      continue;
    }
    const chave = regra.chave(jogo);
    if (vistos.has(chave)) {
      descartados++;
      continue;
    }
    vistos.add(chave);
    validos.push(jogo);
  }

  return { validos, descartados };
}

/**
 * Chama o modelo (OpenAI-compatible) e devolve o conteúdo JSON já limpo.
 * Provider/modelo/chave vêm de resolverConfigIA() (painel admin > env > Groq).
 * Sem nenhuma configuração lança erro — o chamador decide o fallback.
 */
export async function chamarModeloIA(mensagens: MensagensIA): Promise<string> {
  const cfg = await resolverConfigIA();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_IA_MS);
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.modelo,
        messages: [
          { role: 'system', content: mensagens.system },
          { role: 'user', content: mensagens.user },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`modelo respondeu HTTP ${res.status}`);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const conteudo = data.choices?.[0]?.message?.content;
    if (!conteudo) throw new Error('resposta vazia do modelo');
    return limparConteudoIA(conteudo);
  } finally {
    clearTimeout(timer);
  }
}
