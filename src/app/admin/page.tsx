"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/supabase/auth/provider";
import { ShieldCheck, Trash2, Users, History, RefreshCw, ArrowLeft, User } from "lucide-react";

interface AdminLote {
  id: string;
  loteria: string;
  criado_em: string;
  criado_por: string | null;
  criador_avatar_url: string | null;
  usuario_pode_excluir: boolean;
  jogos: { id: string; dezenas: number[]; score: number | null }[];
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
    const [camuflagem, setCamuflagem] = useState<boolean>(false);
    const toggleCamuflagem = async () => {
      const res = await fetch(`/api/admin/camuflagem/${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, ativo: !camuflagem }),
      });
      if (res.ok) setCamuflagem(!camuflagem);
    };
    useEffect(() => {
      if (user?.id) {
        fetch(`/api/admin/camuflagem/${user.id}`).then(r => r.json()).then(d => setCamuflagem(d.camuflagem_ativa));
      }
    }, [user?.id]);

  const [lotes, setLotes] = useState<AdminLote[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState<string | null>(null);

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
      }
    } catch (e) {
      console.error("Erro ao carregar:", e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (user) carregar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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