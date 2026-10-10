import { getSupabase } from "@/lib/db";

export type ProviderIA = "groq" | "nvidia" | "apinex" | "bai" | "agnes";

export interface InfoProviderIA {
  id: ProviderIA;
  nome: string;
  baseUrl: string;
  modeloPadrao: string;
  modelosSugeridos: string[];
  envKey: string;
  comoObter: string;
}
export const PROVIDERS_IA: Record<ProviderIA, InfoProviderIA> = {
  groq: {
    id: "groq",
    nome: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    modeloPadrao: "openai/gpt-oss-120b",
    modelosSugeridos: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"],
    envKey: "GROQ_API_KEY",
    comoObter: "console.groq.com/keys",
  },
  nvidia: {
    id: "nvidia",
    nome: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    modeloPadrao: "nvidia/nemotron-3-super-120b-a12b",
    modelosSugeridos: [
      "nvidia/nemotron-3-super-120b-a12b",
      "openai/gpt-oss-20b",
      "z-ai/glm-5.3",
    ],
    envKey: "NVIDIA_API_KEY",
    comoObter: "build.nvidia.com",
  },
  apinex: {
    id: "apinex",
    nome: "APInex",
    baseUrl: "https://apinex.bond/v1",
    modeloPadrao: "free/glm-5.3-flash",
    modelosSugeridos: ["free/glm-5.3-flash", "free/gpt-6-luna", "free/kimi-k3"],
    envKey: "APINEX_API_KEY",
    comoObter: "apinex.bond",
  },
  bai: {
    id: "bai",
    nome: "B.AI",
    baseUrl: "https://api.b.ai/v1",
    modeloPadrao: "gpt-5.4-mini",
    modelosSugeridos: ["gpt-5.4-mini", "qwen3.8-max", "minimax-m3"],
    envKey: "BAI_API_KEY",
    comoObter: "b.ai",
  },
  agnes: {
    id: "agnes",
    nome: "Agnes AI",
    baseUrl: "https://apihub.agnes-ai.com/v1",
    modeloPadrao: "agnes-2.5-flash",
    modelosSugeridos: ["agnes-2.5-flash", "agnes-3.0-flash", "agnes-2.5-pro"],
    envKey: "AGNES_API_KEY",
    comoObter: "platform.agnes-ai.com",
  },
};

export const ORDEM_FALLBACK_IA: ProviderIA[] = ["groq", "nvidia", "apinex", "bai", "agnes"];

export interface ConfigIA {
  baseUrl: string;
  modelo: string;
  apiKey: string;
  origem: "banco" | "env" | "groq-padrao" | "fallback";
  provider: ProviderIA | "custom" | null;
}

export function isProviderIA(v: unknown): v is ProviderIA {
  return v === "groq" || v === "nvidia" || v === "apinex" || v === "bai" || v === "agnes";
}
export function chaveDoProvider(provider: ProviderIA): string | undefined {
  const direta = process.env[PROVIDERS_IA[provider].envKey]?.trim();
  if (direta) return direta;
  if (provider === "groq") return process.env.AIMODEL_API_KEY?.trim();
  return undefined;
}

export function configDeProvider(provider: ProviderIA, modelo?: string): ConfigIA {
  const info = PROVIDERS_IA[provider];
  const apiKey = chaveDoProvider(provider);
  if (!apiKey) {
    throw new Error(`chave do provider ${info.nome} não configurada no servidor (${info.envKey})`);
  }
  return {
    baseUrl: info.baseUrl,
    modelo: modelo?.trim() || info.modeloPadrao,
    apiKey,
    origem: "banco",
    provider,
  };
}

interface LinhaConfigIA {
  provider: string | null;
  model: string | null;
  base_url: string | null;
}

const TTL_CACHE_MS = 60_000;
let cache: { valor: ConfigIA | null; expira: number } | null = null;

export function invalidarCacheConfigIA(): void {
  cache = null;
}

const COOLDOWN_ESGOTADO_MS = 30 * 60_000;
const COOLDOWN_RATE_MS = 5 * 60_000;
const cooldowns = new Map<ProviderIA, number>();

export function marcarProviderEsgotado(provider: ProviderIA, status?: number): void {
  const ms = status === 429 ? COOLDOWN_RATE_MS : COOLDOWN_ESGOTADO_MS;
  cooldowns.set(provider, Date.now() + ms);
}

export function providerEmCooldown(provider: ProviderIA): boolean {
  const expira = cooldowns.get(provider);
  if (!expira) return false;
  if (expira <= Date.now()) {
    cooldowns.delete(provider);
    return false;
  }
  return true;
}

export function limparCooldownsIA(): void {
  cooldowns.clear();
}

export async function resolverConfigIA(): Promise<ConfigIA> {
  if (cache && cache.expira > Date.now()) return cache.valor as ConfigIA;

  let resolvida: ConfigIA | null = null;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("config_ia")
      .select("provider, model, base_url")
      .eq("id", 1)
      .maybeSingle();
    if (!error && data) {
      const linha = data as LinhaConfigIA;
      if (isProviderIA(linha.provider)) {
        const info = PROVIDERS_IA[linha.provider];
        const apiKey = chaveDoProvider(linha.provider);
        if (apiKey) {
          resolvida = {
            baseUrl: (linha.base_url || info.baseUrl).replace(/\/+$/, ""),
            modelo: linha.model?.trim() || info.modeloPadrao,
            apiKey,
            origem: "banco",
            provider: linha.provider,
          };
        } else {
          throw new Error(
            `chave do provider ${info.nome} não configurada no servidor (${info.envKey})`
          );
        }
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("não configurada no servidor")) throw e;
    console.warn("[IA] config_ia indisponível, usando fallback de env:", e);
  }

  if (!resolvida) {
    const chaveEnv = process.env.AIMODEL_API_KEY?.trim();
    if (chaveEnv) {
      resolvida = {
        baseUrl: (process.env.AIMODEL_BASE_URL?.trim() || PROVIDERS_IA.groq.baseUrl).replace(
          /\/+$/,
          ""
        ),
        modelo: process.env.AIMODEL_MODEL?.trim() || PROVIDERS_IA.groq.modeloPadrao,
        apiKey: chaveEnv,
        origem: "env",
        provider: null,
      };
    } else {
      const groq = PROVIDERS_IA.groq;
      const chaveGroq = chaveDoProvider("groq");
      if (chaveGroq) {
        resolvida = {
          baseUrl: groq.baseUrl,
          modelo: groq.modeloPadrao,
          apiKey: chaveGroq,
          origem: "groq-padrao",
          provider: "groq",
        };
      } else {
        throw new Error(
          `nenhuma configuração de IA disponível (sem config_ia, sem ${groq.envKey} e sem AIMODEL_API_KEY)`
        );
      }
    }
  }

  cache = { valor: resolvida, expira: Date.now() + TTL_CACHE_MS };
  return resolvida;
}

export async function resolverCadeiaIA(): Promise<ConfigIA[]> {
  let primaria: ConfigIA | null = null;
  let erroPrimaria: unknown = null;
  try {
    primaria = await resolverConfigIA();
  } catch (e) {
    erroPrimaria = e;
  }

  const cadeia: ConfigIA[] = [];
  if (primaria) cadeia.push(primaria);

  for (const id of ORDEM_FALLBACK_IA) {
    if (primaria && primaria.provider === id) continue;
    const info = PROVIDERS_IA[id];
    const apiKey = chaveDoProvider(id);
    if (!apiKey) continue;
    if (
      primaria &&
      !primaria.provider &&
      primaria.baseUrl === info.baseUrl &&
      primaria.modelo === info.modeloPadrao
    ) {
      continue;
    }
    cadeia.push({
      baseUrl: info.baseUrl,
      modelo: info.modeloPadrao,
      apiKey,
      origem: "fallback",
      provider: id,
    });
  }

  if (!cadeia.length) {
    throw erroPrimaria instanceof Error
      ? erroPrimaria
      : new Error("nenhuma configuração de IA disponível (sem chaves configuradas)");
  }
  return cadeia;
}

export function statusChavesIA(): Record<ProviderIA, boolean> {
  return {
    groq: Boolean(chaveDoProvider("groq")),
    nvidia: Boolean(chaveDoProvider("nvidia")),
    apinex: Boolean(chaveDoProvider("apinex")),
    bai: Boolean(chaveDoProvider("bai")),
    agnes: Boolean(chaveDoProvider("agnes")),
  };
}

export function statusCooldownsIA(): Record<ProviderIA, boolean> {
  return {
    groq: providerEmCooldown("groq"),
    nvidia: providerEmCooldown("nvidia"),
    apinex: providerEmCooldown("apinex"),
    bai: providerEmCooldown("bai"),
    agnes: providerEmCooldown("agnes"),
  };
}
