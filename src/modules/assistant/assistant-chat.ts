import {
  resolverCadeiaIA,
  marcarProviderEsgotado,
  providerEmCooldown,
  PROVIDERS_IA,
  type ConfigIA,
} from "@/modules/generation/provider";

export const TIMEOUT_CHAT_IA_MS = 45000;

export interface AnexoChat {
  nome: string;
  url: string;
  mime: string;
}

export interface MensagemChat {
  role: "system" | "user" | "assistant";
  content: string;
  attachments?: AnexoChat[];
}

const IMAGEM_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function anexosVisiveis(attachments: AnexoChat[] | undefined): AnexoChat[] {
  return (attachments ?? []).filter((a) => IMAGEM_MIME.has(a.mime) && a.url.startsWith("http"));
}

function contentParaProvider(msg: MensagemChat): string | Array<Record<string, unknown>> {
  if (msg.role !== "user" || !msg.attachments?.length) return msg.content;
  const imgs = anexosVisiveis(msg.attachments);
  if (!imgs.length) return msg.content;
  const blocos: Array<Record<string, unknown>> = [{ type: "text", text: msg.content }];
  for (const a of imgs) {
    blocos.push({ type: "image_url", image_url: { url: a.url } });
  }
  return blocos;
}

function rotuloConfig(cfg: ConfigIA): string {
  if (cfg.provider && cfg.provider !== "custom") {
    return `${PROVIDERS_IA[cfg.provider].nome}/${cfg.modelo}`;
  }
  return cfg.baseUrl;
}

async function chamarChatComConfig(
  cfg: ConfigIA,
  mensagens: MensagemChat[]
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_CHAT_IA_MS);
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.modelo,
        messages: mensagens.map((m) => ({
          role: m.role,
          content: contentParaProvider(m),
        })),
        temperature: 0.7,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const conteudo = data.choices?.[0]?.message?.content?.trim();
    if (!conteudo) throw new Error("resposta vazia do modelo");
    return conteudo;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`timeout após ${TIMEOUT_CHAT_IA_MS}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Chat aberto (sem modo JSON) pela cadeia de provedores da 11.
 * Se todos falharem com anexos de imagem, tenta de novo só com texto
 * (nem todo provedor free aceita visão) e avisa na resposta.
 */
export async function chamarChatIA(mensagens: MensagemChat[]): Promise<string> {
  const cadeia = await resolverCadeiaIA();
  const erros: string[] = [];

  const tentar = async (lista: MensagemChat[]): Promise<string | null> => {
    for (const cfg of cadeia) {
      const rotulo = rotuloConfig(cfg);
      if (cfg.provider && cfg.provider !== "custom" && providerEmCooldown(cfg.provider)) {
        erros.push(`${rotulo}: em cooldown`);
        continue;
      }
      try {
        const out = await chamarChatComConfig(cfg, lista);
        if (erros.length) {
          console.warn(`[assistente11] via ${rotulo} após: ${erros.join("; ")}`);
        }
        return out;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const status = (e as { status?: number }).status;
        if (cfg.provider && cfg.provider !== "custom" && status && [402, 403, 429].includes(status)) {
          marcarProviderEsgotado(cfg.provider, status);
        }
        erros.push(`${rotulo}: ${msg}`);
      }
    }
    return null;
  };

  const temImagem = mensagens.some((m) => anexosVisiveis(m.attachments).length > 0);
  const resposta = await tentar(mensagens);
  if (resposta) return resposta;

  if (temImagem) {
    const semImagem = mensagens.map((m) => ({ role: m.role, content: m.content }));
    const respostaTexto = await tentar(semImagem);
    if (respostaTexto) {
      return (
        `${respostaTexto}\n\n_(nota: as imagens anexadas não puderam ser processadas visualmente ` +
        `por nenhum provedor da 11 desta vez)_`
      );
    }
  }

  throw new Error(`todos os provedores da 11 falharam (${erros.join("; ")})`);
}
