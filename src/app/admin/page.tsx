"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/supabase/auth/provider";
import { ShieldCheck, Trash2, Users, History, RefreshCw, ArrowLeft, User, Bot, Zap } from "lucide-react";

interface AdminLote {
  id: string;
  usuario_id: string | null;
  loteria: string;
  criado_em: string;
  criado_por: string | null;
  criador_avatar_url: string | null;
  usuario_pode_excluir: boolean;
  jogos: { id: string; dezenas: number[]; score: number | null }[];
}

interface AdminUsuario {
  id: string;
  nome: string;
  avatar: string | null;
  camuflagemAtiva: boolean;
}

interface ProviderIAInfo {
  id: string;
  nome: string;
  baseUrl: string;
  modeloPadrao: string;
  modelosSugeridos: string[];
  envKey: string;
  comoObter: string;
}

interface ConfigIADados {
  provider: string;
  model: string;
  base_url: string | null;
  atualizado_em: string | null;
  chaves: Record<string, boolean>;
  esgotados?: Record<string, boolean>;
  ativa?: { provider: string | null; modelo: string; origem: string } | null;
  providers: ProviderIAInfo[];
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [lotes, setLotes] = useState<AdminLote[]>([]);
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [salvandoCamuflagem, setSalvandoCamuflagem] = useState<string | null>(null);
  const [configIA, setConfigIA] = useState<ConfigIADados | null>(null);
  const [iaProvider, setIaProvider] = useState("groq");
  const [iaModelo, setIaModelo] = useState("");
  const [iaAcao, setIaAcao] = useState<"salvar" | "testar" | null>(null);
  const [iaMensagem, setIaMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [iaTestes, setIaTestes] = useState<
    Record<string, { estado: "testando" | "ok" | "erro"; texto: string }>
  >({});

  const carregarConfigIA = async () => {
    try {
      const res = await fetch("/api/admin/config-ia");
      if (!res.ok) return;
      const d = (await res.json()) as ConfigIADados;
      setConfigIA(d);
      setIaProvider(d.provider);
      setIaModelo(d.model);
    } catch (e) {
      console.error("Erro ao carregar config de IA:", e);
    }
  };

  const salvarConfigIA = async () => {
    setIaAcao("salvar");
    setIaMensagem(null);
    try {
      const res = await fetch("/api/admin/config-ia", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: iaProvider, model: iaModelo }),
      });
      const d = await res.json();
      if (!res.ok) {
        setIaMensagem({ tipo: "erro", texto: d.error || "Erro ao salvar." });
        return;
      }
      setIaMensagem({ tipo: "ok", texto: `Salvo: ${d.provider} · ${d.model}` });
      await carregarConfigIA();
    } catch (e) {
      console.error("Erro ao salvar config IA:", e);
      setIaMensagem({ tipo: "erro", texto: "Erro de rede ao salvar." });
    } finally {
      setIaAcao(null);
    }
  };

  const testarConfigIA = async () => {
    setIaAcao("testar");
    setIaMensagem(null);
    try {
      const res = await fetch("/api/admin/config-ia", { method: "POST" });
      const d = await res.json();
      if (res.ok && d.ok) {
        setIaMensagem({ tipo: "ok", texto: `Modelo respondeu em ${d.latencia_ms} ms.` });
      } else {
        setIaMensagem({ tipo: "erro", texto: d.erro || "Teste falhou." });
      }
    } catch (e) {
      console.error("Erro ao testar config IA:", e);
      setIaMensagem({ tipo: "erro", texto: "Erro de rede no teste." });
    } finally {
      setIaAcao(null);
    }
  };

  const testarProviderIA = async (id: string) => {
    setIaTestes((t) => ({ ...t, [id]: { estado: "testando", texto: "Testando..." } }));
    try {
      const res = await fetch("/api/admin/config-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: id }),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        setIaTestes((t) => ({
          ...t,
          [id]: { estado: "ok", texto: `OK em ${d.latencia_ms} ms · ${d.modelo}` },
        }));
      } else {
        setIaTestes((t) => ({ ...t, [id]: { estado: "erro", texto: d.erro || "Falhou." } }));
      }
    } catch (e) {
      console.error("Erro ao testar provider IA:", e);
      setIaTestes((t) => ({ ...t, [id]: { estado: "erro", texto: "Erro de rede." } }));
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  const carregar = async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/lotes");
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.is_admin === true);
        setLotes(data.lotes || []);

        // Deriva a lista de usuários a partir dos lotes
        const mapa = new Map<string, AdminUsuario>();
        (data.lotes || []).forEach((lote: AdminLote) => {
          if (!lote.usuario_id) return;
          if (!mapa.has(lote.usuario_id)) {
            mapa.set(lote.usuario_id, {
              id: lote.usuario_id,
              nome: lote.criado_por || lote.usuario_id.slice(0, 8),
              avatar: lote.criador_avatar_url || null,
              camuflagemAtiva: false,
            });
          }
        });
        setUsuarios(Array.from(mapa.values()));

        // Busca o status atual de camuflagem de cada usuário
        const comStatus = await Promise.all(
          Array.from(mapa.keys()).map(async (uid) => {
            try {
              const r = await fetch(`/api/admin/camuflagem/${uid}`);
              if (r.ok) {
                const d = await r.json();
                return { uid, ativo: d.camuflagem_ativa === true };
              }
            } catch { /* ignora */ }
            return { uid, ativo: false };
          })
        );
        setUsuarios(prev =>
          prev.map(u => ({
            ...u,
            camuflagemAtiva: comStatus.find(c => c.uid === u.id)?.ativo ?? false,
          }))
        );
      }
    } catch (e) {
      console.error("Erro ao carregar:", e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (user) carregar();
  }, [user]);

  useEffect(() => {
    if (isAdmin) carregarConfigIA();
  }, [isAdmin]);

  const excluir = async (id: string) => {
    if (!confirm("Excluir este lote do histórico?")) return;
    setExcluindo(id);
    try {
      const res = await fetch(`/api/lotes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLotes(prev => prev.filter(l => l.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Não foi possível excluir.");
      }
    } catch (e) {
      console.error("Erro ao excluir:", e);
    } finally {
      setExcluindo(null);
    }
  };

  const toggleCamuflagemUsuario = async (uid: string) => {
    setSalvandoCamuflagem(uid);
    try {
      const atual = usuarios.find(u => u.id === uid)?.camuflagemAtiva || false;
      const res = await fetch(`/api/admin/camuflagem/${uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !atual }),
      });
      if (res.ok) {
        setUsuarios(prev =>
          prev.map(u => u.id === uid ? { ...u, camuflagemAtiva: !atual } : u)
        );
      } else {
        alert("Não foi possível alterar a camuflagem.");
      }
    } catch (e) {
      console.error("Erro ao alternar camuflagem:", e);
      alert("Erro ao alterar camuflagem.");
    } finally {
      setSalvandoCamuflagem(null);
    }
  };

  const totalJogos = lotes.reduce((s, l) => s + l.jogos.length, 0);
  const criadores = new Set(lotes.map(l => l.criado_por).filter(Boolean)).size;

  if (isLoading || !user) {
    return <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Carregando...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <ShieldCheck className="h-16 w-16 mx-auto mb-4 text-destructive/60" />
        <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-muted-foreground mb-6">Esta página é exclusiva para administradores.</p>
        <Button onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao início
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Painel do Administrador
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie o histórico compartilhado do sistema. Como admin, você pode excluir qualquer lote.
          </p>
        </div>
        <Button variant="outline" onClick={carregar} disabled={carregando}>
          <RefreshCw className={`h-4 w-4 mr-2 ${carregando ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <div><p className="text-2xl font-bold">{totalJogos}</p><p className="text-xs text-muted-foreground">Jogos no histórico</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <div><p className="text-2xl font-bold">{criadores}</p><p className="text-xs text-muted-foreground">Criadores</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div><p className="text-2xl font-bold">{lotes.length}</p><p className="text-xs text-muted-foreground">Lotes</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Gestão de camuflagem por usuário */}
      {usuarios.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">Camuflagem por Usuário</CardTitle>
              <CardDescription>
                Controla a inserção de jogos &quot;premiados&quot; (ilusão) ao gerar 30+ jogos em Super Sete e Lotofácil.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {usuarios.map(u => (
                <div key={u.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                  {u.avatar ? (
                    <img src={u.avatar} alt="Foto" className="h-8 w-8 rounded-full object-cover border" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.id}</p>
                  </div>
                  <Badge variant={u.camuflagemAtiva ? "default" : "secondary"} className="shrink-0">
                    {u.camuflagemAtiva ? "Ativa" : "Inativa"}
                  </Badge>
                  <Button
                    variant={u.camuflagemAtiva ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => toggleCamuflagemUsuario(u.id)}
                    disabled={salvandoCamuflagem === u.id}
                    className="shrink-0"
                  >
                    {salvandoCamuflagem === u.id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : u.camuflagemAtiva ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {configIA && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-5 w-5" />
                IA — Provedor de Geração
              </CardTitle>
              <CardDescription>
                Define qual provedor de IA gera os jogos. Se a API ativa esgotar limite ou saldo,
                o sistema tenta a próxima sozinho (fallback automático). As chaves ficam só no
                servidor (Vercel/env) — aqui aparece só se cada uma existe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {configIA.ativa ? (
                <p className="text-xs text-muted-foreground">
                  Ativa agora:{" "}
                  {configIA.ativa.provider
                    ? configIA.providers.find((p) => p.id === configIA.ativa?.provider)?.nome ??
                      configIA.ativa.provider
                    : "configuração legada (env)"}{" "}
                  · {configIA.ativa.modelo} · origem: {configIA.ativa.origem}
                </p>
              ) : (
                <p className="text-xs text-destructive">
                  Nenhuma IA configurada no servidor — geração por IA desativada.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Provedor</Label>
                  <Select value={iaProvider} onValueChange={(v) => v && setIaProvider(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Provedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {configIA.providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                          {configIA.chaves[p.id] ? "" : " (sem chave)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ia-modelo">Modelo</Label>
                  <Input
                    id="ia-modelo"
                    value={iaModelo}
                    onChange={(e) => setIaModelo(e.target.value)}
                    placeholder={configIA.providers.find((p) => p.id === iaProvider)?.modeloPadrao}
                    list="ia-modelos-sugeridos"
                  />
                  <datalist id="ia-modelos-sugeridos">
                    {configIA.providers
                      .find((p) => p.id === iaProvider)
                      ?.modelosSugeridos.map((m) => (
                        <option key={m} value={m} />
                      ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-2">
                {configIA.providers.map((p) => {
                  const t = iaTestes[p.id];
                  const esgotado = configIA.esgotados?.[p.id];
                  return (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center gap-2 rounded border px-3 py-2"
                    >
                      <span className="text-sm font-medium">{p.nome}</span>
                      <Badge variant={configIA.chaves[p.id] ? "default" : "outline"}>
                        {configIA.chaves[p.id] ? "chave ok" : `sem ${p.envKey}`}
                      </Badge>
                      {esgotado && <Badge variant="destructive">em cooldown</Badge>}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => testarProviderIA(p.id)}
                        disabled={t?.estado === "testando"}
                      >
                        {t?.estado === "testando" ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Zap className="h-3.5 w-3.5 mr-1" />
                        )}
                        Testar
                      </Button>
                      {t && t.estado !== "testando" && (
                        <span
                          className={`text-xs ${t.estado === "ok" ? "text-primary" : "text-destructive"}`}
                        >
                          {t.texto}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground">
                Endpoint: {configIA.providers.find((p) => p.id === iaProvider)?.baseUrl} ·
                Chaves em: {configIA.providers.find((p) => p.id === iaProvider)?.comoObter}
                {configIA.atualizado_em &&
                  ` · última alteração ${new Date(configIA.atualizado_em).toLocaleString("pt-BR")}`}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={salvarConfigIA} disabled={iaAcao !== null}>
                  {iaAcao === "salvar" ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={testarConfigIA}
                  disabled={iaAcao !== null}
                >
                  {iaAcao === "testar" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Testar conexão
                </Button>
                {iaMensagem && (
                  <span
                    className={`text-xs ${iaMensagem.tipo === "ok" ? "text-primary" : "text-destructive"}`}
                  >
                    {iaMensagem.texto}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de lotes */}
      {carregando ? (
        <div className="text-center py-16 text-muted-foreground">
          <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
          Carregando histórico...
        </div>
      ) : lotes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Nenhum lote no histórico.</div>
      ) : (
        <div className="space-y-3">
          {lotes.map((lote) => (
            <Card key={lote.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    {lote.criador_avatar_url ? (
                      <img src={lote.criador_avatar_url} alt="Foto" className="h-9 w-9 rounded-full object-cover border" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{lote.criado_por || "Anônimo"}</p>
                      <p className="text-xs text-muted-foreground">
                        {lote.loteria} · {new Date(lote.criado_em).toLocaleString("pt-BR")} · {lote.jogos.length} jogos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">{lote.jogos.length} jogos</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => excluir(lote.id)}
                      disabled={excluindo === lote.id}
                      className="text-destructive hover:text-destructive"
                    >
                      {excluindo === lote.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Excluir
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {lote.jogos.slice(0, 3).flatMap(j => j.dezenas).slice(0, 30).map((d, i) => (
                    <span key={i} className="inline-flex items-center justify-center h-7 min-w-[1.75rem] rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {String(d).padStart(2, "0")}
                    </span>
                  ))}
                  {lote.jogos.reduce((acc, j) => acc + j.dezenas.length, 0) > 30 && (
                    <Badge variant="outline" className="text-xs">…</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}