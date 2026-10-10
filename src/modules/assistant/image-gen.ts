const NVIDIA_URL = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";

export async function gerarImagem(prompt: string): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY não configurada");

  const res = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      prompt: prompt.slice(0, 1500),
      steps: 4,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(`NVIDIA image gen HTTP ${res.status}: ${corpo.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    artifacts?: Array<{ base64?: string }>;
    image?: string;
  };
  const b64 = json.artifacts?.[0]?.base64 ?? json.image;
  if (b64) return `data:image/jpeg;base64,${b64}`;
  throw new Error("Resposta de imagem vazia da NVIDIA");
}

export function base64ParaBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error("Data URL inválida");
  const mime = match[1];
  const bin = atob(match[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime };
}
