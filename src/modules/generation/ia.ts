import type { Loteria } from "@/types";
import type { JogoSorteado } from "@/modules/lottery";
import {
  resolverConfigIA,
  resolverCadeiaIA,
  marcarProviderEsgotado,
  providerEmCooldown,
  PROVIDERS_IA,
  type ConfigIA,
} from "./provider";

/** Teto de jogos por chamada de IA (controle de custo/latência). */
export const LIMITE_JOGOS_IA = 50;
/** Timeout da chamada ao modelo (ms). */
export const TIMEOUT_IA_MS = 30000;

export interface MensagensIA {
  system: string;
  user: string;
}

export interface JogoSorteadoIA extends JogoSorteado {
  score_ia?: number;
  analise_ia?: string;
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
    'no formato {"games":[{"dezenas":[1,2,3],"score":<inteiro 0-100>,"analysis":"<1 frase curta em português>"}]}. ' +
    'O campo score é sua nota de qualidade da combinação; analysis explica em uma frase o critério estatístico usado. ' +
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

  linhas.push(`Gere exatamente ${quantidade} jogos distintos, no campo "games" do JSON, com ${quantidade} itens.`);

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
): { validos: JogoSorteadoIA[]; descartados: number } {
  const obj = parsed as { games?: unknown; jogos?: unknown } | null;
  const lista = obj?.games ?? obj?.jogos;
  if (!obj || !Array.isArray(lista)) return { validos: [], descartados: 0 };

  const posicional = loteria.mecanica === 'posicional';
  const validos: JogoSorteadoIA[] = [];
  const vistos = new Set<string>();
  let descartados = 0;

  for (const item of lista as unknown[]) {
    const j = item as { dezenas?: unknown; extras?: unknown; score?: unknown; analysis?: unknown };
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

    const jogo: JogoSorteadoIA = {
      dezenas,
      extras: Object.keys(extras).length ? extras : undefined,
      colunas: posicional ? dezenas.map((d) => [d]) : undefined,
    };

    if (typeof j.score === 'number' && Number.isFinite(j.score)) {
      jogo.score_ia = Math.max(0, Math.min(100, Math.round(j.score)));
    }
    if (typeof j.analysis === 'string' && j.analysis.trim()) {
      jogo.analise_ia = j.analysis.trim().slice(0, 240);
    }

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

export class ErroChamadaIA extends Error {
  readonly status?: number;
  constructor(mensagem: string, status?: number) {
    super(mensagem);
    this.name = "ErroChamadaIA";
    this.status = status;
  }
}

function rotuloConfig(cfg: ConfigIA): string {
  if (cfg.provider && cfg.provider !== "custom") {
    return `${PROVIDERS_IA[cfg.provider].nome}/${cfg.modelo}`;
  }
  return cfg.baseUrl;
}

export async function chamarComConfig(cfg: ConfigIA, mensagens: MensagensIA): Promise<string> {
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
    if (!res.ok) throw new ErroChamadaIA(`modelo respondeu HTTP ${res.status}`, res.status);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const conteudo = data.choices?.[0]?.message?.content;
    if (!conteudo) throw new ErroChamadaIA('resposta vazia do modelo');
    return limparConteudoIA(conteudo);
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ErroChamadaIA(`timeout após ${TIMEOUT_IA_MS}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function chamarModeloIA(mensagens: MensagensIA): Promise<string> {
  const cfg = await resolverConfigIA();
  return chamarComConfig(cfg, mensagens);
}

export async function chamarModeloIAAuto(mensagens: MensagensIA): Promise<string> {
  const cadeia = await resolverCadeiaIA();
  const erros: string[] = [];

  for (const cfg of cadeia) {
    const rotulo = rotuloConfig(cfg);
    if (cfg.provider && cfg.provider !== "custom" && providerEmCooldown(cfg.provider)) {
      erros.push(`${rotulo}: em cooldown (limite recente)`);
      continue;
    }
    try {
      const out = await chamarComConfig(cfg, mensagens);
      if (erros.length) {
        console.warn(`[IA] resposta obtida via ${rotulo} após: ${erros.join("; ")}`);
      }
      return out;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = e instanceof ErroChamadaIA ? e.status : undefined;
      if (cfg.provider && cfg.provider !== "custom" && status && [402, 403, 429].includes(status)) {
        marcarProviderEsgotado(cfg.provider, status);
        console.warn(`[IA] ${rotulo} marcado em cooldown (HTTP ${status})`);
      }
      erros.push(`${rotulo}: ${msg}`);
    }
  }

  throw new Error(`todos os provedores de IA falharam (${erros.join("; ")})`);
}
