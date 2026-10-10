import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resolverCadeiaIA,
  invalidarCacheConfigIA,
  limparCooldownsIA,
  providerEmCooldown,
  configDeProvider,
  ORDEM_FALLBACK_IA,
} from "@/modules/generation/provider";
import { chamarModeloIAAuto } from "@/modules/generation/ia";

const MENSAGENS = { system: "sys", user: 'Gere: {"jogos":[]}' };

function okJson(content: string) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  };
}

function failHttp(status: number) {
  return { ok: false, status };
}

function urlDaChamada(call: unknown[]): string {
  return String(call[0]);
}

describe("cadeia de fallback de provedores de IA", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    invalidarCacheConfigIA();
    limparCooldownsIA();
    vi.stubEnv("GROQ_API_KEY", "gsk_teste");
    vi.stubEnv("NVIDIA_API_KEY", "nvapi_teste");
    vi.stubEnv("APINEX_API_KEY", "sk_apinex_teste");
    vi.stubEnv("BAI_API_KEY", "sk_bai_teste");
    vi.stubEnv("AGNES_API_KEY", "sk_agnes_teste");
    vi.stubEnv("AIMODEL_API_KEY", "");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    invalidarCacheConfigIA();
    limparCooldownsIA();
  });

  it("monta a cadeia na ordem: primária + demais com chave", async () => {
    const cadeia = await resolverCadeiaIA();
    expect(cadeia.map((c) => c.provider)).toEqual(ORDEM_FALLBACK_IA);
    expect(cadeia[0].origem).toBe("groq-padrao");
    expect(cadeia.slice(1).every((c) => c.origem === "fallback")).toBe(true);
  });

  it("429 na primária passa para o próximo provedor e retorna conteúdo", async () => {
    fetchMock
      .mockResolvedValueOnce(failHttp(429))
      .mockResolvedValueOnce(okJson('{"jogos":[]}'));
    const out = await chamarModeloIAAuto(MENSAGENS);
    expect(out).toBe('{"jogos":[]}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(urlDaChamada(fetchMock.mock.calls[0])).toContain("api.groq.com");
    expect(urlDaChamada(fetchMock.mock.calls[1])).toContain("integrate.api.nvidia.com");
    expect(providerEmCooldown("groq")).toBe(true);
    expect(providerEmCooldown("nvidia")).toBe(false);
  });

  it("pula falhas 429/5xx até achar um provedor saudável", async () => {
    fetchMock
      .mockResolvedValueOnce(failHttp(429))
      .mockResolvedValueOnce(failHttp(500))
      .mockResolvedValueOnce(okJson('{"ok":true}'));
    const out = await chamarModeloIAAuto(MENSAGENS);
    expect(out).toBe('{"ok":true}');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(urlDaChamada(fetchMock.mock.calls[2])).toContain("apinex.bond");
  });

  it("marca cooldown de saldo esgotado (403) e pula o provedor na chamada seguinte", async () => {
    fetchMock
      .mockResolvedValueOnce(failHttp(403))
      .mockResolvedValueOnce(okJson('{"ok":true}'));
    await chamarModeloIAAuto(MENSAGENS);
    expect(providerEmCooldown("groq")).toBe(true);

    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(okJson('{"ok":true}'));
    await chamarModeloIAAuto(MENSAGENS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(urlDaChamada(fetchMock.mock.calls[0])).not.toContain("api.groq.com");
  });

  it("lança erro quando todos os provedores falham", async () => {
    fetchMock.mockResolvedValue(failHttp(429));
    await expect(chamarModeloIAAuto(MENSAGENS)).rejects.toThrow(/todos os provedores/);
    expect(fetchMock).toHaveBeenCalledTimes(ORDEM_FALLBACK_IA.length);
  });

  it("configDeProvider lança erro quando a chave do provedor não existe", () => {
    vi.stubEnv("NVIDIA_API_KEY", "");
    invalidarCacheConfigIA();
    expect(() => configDeProvider("nvidia")).toThrow(/não configurada/);
  });

  it("sem nenhuma chave lança erro na cadeia", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("NVIDIA_API_KEY", "");
    vi.stubEnv("APINEX_API_KEY", "");
    vi.stubEnv("BAI_API_KEY", "");
    vi.stubEnv("AGNES_API_KEY", "");
    invalidarCacheConfigIA();
    await expect(resolverCadeiaIA()).rejects.toThrow();
  });
});
