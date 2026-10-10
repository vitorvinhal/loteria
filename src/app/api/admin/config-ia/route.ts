import { NextRequest, NextResponse } from "next/server";
import { getSupabaseWithAuth, getSession, getUser } from "@/lib/supabase/auth/server";
import { isAdminUser } from "@/lib/admin";
import {
  PROVIDERS_IA,
  isProviderIA,
  statusChavesIA,
  statusCooldownsIA,
  invalidarCacheConfigIA,
  chamarComConfig,
  resolverConfigIA,
  configDeProvider,
  type ConfigIA,
} from "@/modules/generation";

async function exigirAdmin() {
  const session = await getSession();
  const user = session?.user ?? (await getUser());
  if (!user) return { erro: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) };
  if (!isAdminUser(user)) {
    return { erro: NextResponse.json({ error: "Acesso restrito" }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  try {
    const auth = await exigirAdmin();
    if ("erro" in auth) return auth.erro;
    const supabase = await getSupabaseWithAuth();
    const { data } = await supabase
      .from("config_ia")
      .select("provider, model, base_url, updated_at")
      .eq("id", 1)
      .maybeSingle();

    let ativa: { provider: string | null; modelo: string; origem: string } | null = null;
    try {
      const cfg = await resolverConfigIA();
      ativa = { provider: cfg.provider, modelo: cfg.modelo, origem: cfg.origem };
    } catch {
      ativa = null;
    }

    return NextResponse.json({
      provider: data?.provider ?? "groq",
      model: data?.model ?? PROVIDERS_IA.groq.modeloPadrao,
      base_url: data?.base_url ?? null,
      atualizado_em: data?.updated_at ?? null,
      chaves: statusChavesIA(),
      esgotados: statusCooldownsIA(),
      ativa,
      providers: Object.values(PROVIDERS_IA),
    });
  } catch (e) {
    console.error("[Admin/config-ia] Erro GET:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await exigirAdmin();
    if ("erro" in auth) return auth.erro;

    const body = (await request.json().catch(() => null)) as {
      provider?: string;
      model?: string;
    } | null;
    if (!body || !isProviderIA(body.provider)) {
      return NextResponse.json({ error: "Provider inválido" }, { status: 400 });
    }
    const model = body.model?.trim() || PROVIDERS_IA[body.provider].modeloPadrao;
    if (model.length > 200 || /[\r\n]/.test(model)) {
      return NextResponse.json({ error: "Modelo inválido" }, { status: 400 });
    }
    if (!statusChavesIA()[body.provider]) {
      return NextResponse.json(
        {
          error: `Chave ${PROVIDERS_IA[body.provider].envKey} não configurada no servidor. Adicione em Vercel/env e tente de novo.`,
        },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseWithAuth();
    const { error } = await supabase.from("config_ia").upsert(
      {
        id: 1,
        provider: body.provider,
        model,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) {
      console.error("[Admin/config-ia] Erro ao salvar:", error);
      return NextResponse.json({ error: "Erro ao salvar no banco" }, { status: 500 });
    }
    invalidarCacheConfigIA();
    return NextResponse.json({ ok: true, provider: body.provider, model });
  } catch (e) {
    console.error("[Admin/config-ia] Erro PUT:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await exigirAdmin();
    if ("erro" in auth) return auth.erro;

    const body = (await request.json().catch(() => null)) as {
      provider?: string;
      model?: string;
    } | null;

    const inicio = Date.now();
    let resultado: { provider: string | null; modelo: string; resposta: string };
    try {
      const cfg: ConfigIA =
        body && isProviderIA(body.provider)
          ? configDeProvider(body.provider, body.model)
          : await resolverConfigIA();
      const resposta = await chamarComConfig(cfg, {
        system: "Você confirma que está operacional. Responda somente JSON.",
        user: 'Responda exatamente: {"ok":true}',
      });
      resultado = { provider: cfg.provider, modelo: cfg.modelo, resposta };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ ok: false, erro: msg }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      latencia_ms: Date.now() - inicio,
      resposta: resultado.resposta.slice(0, 200),
      provider: resultado.provider,
      modelo: resultado.modelo,
    });
  } catch (e) {
    console.error("[Admin/config-ia] Erro POST:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
