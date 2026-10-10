export const NOME_ASSISTENTE = "11";

export function nomeAmigavel(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null): string {
  if (!user) return "visitante";
  const meta = user.user_metadata;
  const nome = meta?.nome || meta?.name || meta?.full_name;
  if (typeof nome === "string" && nome.trim()) return nome.trim();
  if (user.email) {
    const base = user.email.split("@")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  return "usuário";
}

export function montarIdentidade(userName: string): string {
  return (
    `Você é a ${NOME_ASSISTENTE}, a assistente inteligente oficial do site Loterias CAIXA ` +
    `(gerador de jogos estatístico das loterias da CAIXA). ` +
    `Você está conversando com ${userName}. ` +
    `Trate ${userName} pelo nome nas respostas quando fizer sentido, e adapte o tom: ` +
    `amigável, direta, em português do Brasil, sem prometer prêmios ou resultados de sorteio. ` +
    `Você conhece as ferramentas do site: gerador de jogos com otimização estatística, ` +
    `comparação de jogos, histórico, bolão e palpite forte. ` +
    `Você TAMBÉM sabe gerar IMAGENS com IA. Quando ${userName} pedir para criar, gerar ou desenhar ` +
    `uma imagem (ex.: "cria uma imagem de um céu", "desenhe um gato"), responda APENAS com um JSON válido ` +
    `(sem markdown, sem texto fora do JSON) no formato: ` +
    `{"type":"imagem","prompt":"<prompt em inglês, detalhado, para o gerador de imagens>"}. ` +
    `Nesse caso não escreva texto normal — só o JSON. ` +
    `Se ${userName} der um feedback ou reclamação sobre o site (ex.: bug, botão pequeno, ` +
    `funcionalidade que falta), pergunte: "Entendi! Quer que eu anote essa sugestão e envie ` +
    `para o Vitor na Central de Melhorias?" Só quando ${userName} confirmar explicitamente, ` +
    `responda APENAS com um JSON válido (sem markdown, sem texto fora do JSON) no formato: ` +
    `{"type":"melhoria","feedback":"<resumo do feedback original>","prompt_tecnico":"<prompt técnico completo, ` +
    `detalhando componentes React/Next.js, classes Tailwind CSS e lógica, pronto para um programador executar>"}. ` +
    `Em qualquer outra situação, responda em texto normal, curto e útil.`
  );
}

export interface MelhoriaDetectada {
  feedback: string;
  promptTecnico: string;
}

export function detectarMelhoria(resposta: string): MelhoriaDetectada | null {
  const t = resposta.trim();
  if (!t.startsWith("{")) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(t);
  } catch {
    return null;
  }
  const obj = parsed as { type?: unknown; feedback?: unknown; prompt_tecnico?: unknown };
  if (obj?.type !== "melhoria") return null;
  if (typeof obj.feedback !== "string" || !obj.feedback.trim()) return null;
  if (typeof obj.prompt_tecnico !== "string" || !obj.prompt_tecnico.trim()) return null;
  return {
    feedback: obj.feedback.trim().slice(0, 2000),
    promptTecnico: obj.prompt_tecnico.trim().slice(0, 8000),
  };
}

export function textoConfirmacaoMelhoria(userName: string): string {
  return (
    `Pronto, ${userName}! Anotei sua sugestão e enviei para o Vitor na Central de Melhorias. ` +
    `Ele vai conseguir copiar o prompt técnico pronto e implementar. Quer mais alguma coisa?`
  );
}

export interface ImagemDetectada {
  prompt: string;
}

export function detectarImagem(resposta: string): ImagemDetectada | null {
  const t = resposta.trim();
  if (!t.startsWith("{")) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(t);
  } catch {
    return null;
  }
  const obj = parsed as { type?: unknown; prompt?: unknown };
  if (obj?.type !== "imagem") return null;
  if (typeof obj.prompt !== "string" || !obj.prompt.trim()) return null;
  return { prompt: obj.prompt.trim().slice(0, 1500) };
}
