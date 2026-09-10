"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, Trash2, Shield, Bell, User, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/supabase/auth/provider";

export default function ConfiguracoesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [notificacoesSorteio, setNotificacoesSorteio] = useState(true);
  const [notificacoesScore, setNotificacoesScore] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      setNome(user.user_metadata?.nome || "");
      setEmail(user.email || "");
      setNotificacoesSorteio(user.user_metadata?.notificacoes_sorteio !== false);
      setNotificacoesScore(user.user_metadata?.notificacoes_score !== false);
    }
  }, [user]);

  const handleSalvar = async () => {
    setIsSaving(true);
    setMensagem(null);

    try {
      const response = await fetch("/api/usuario/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          notificacoes_sorteio: notificacoesSorteio,
          notificacoes_score: notificacoesScore,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMensagem({ tipo: "sucesso", texto: "Configurações salvas com sucesso!" });
      } else {
        setMensagem({ tipo: "erro", texto: data.error || "Erro ao salvar configurações." });
      }
    } catch {
      setMensagem({ tipo: "erro", texto: "Erro ao salvar configurações. Tente novamente." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExcluirConta = async () => {
    if (!confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/usuario/excluir", { method: "DELETE" });

      if (response.ok) {
        router.push("/");
      } else {
        setMensagem({ tipo: "erro", texto: "Erro ao excluir conta." });
      }
    } catch {
      setMensagem({ tipo: "erro", texto: "Erro ao excluir conta." });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências e dados da conta.
        </p>
      </div>

      {mensagem && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          mensagem.tipo === "sucesso"
            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
            : "bg-red-500/10 text-red-600 border border-red-500/20"
        }`}>
          {mensagem.tipo === "sucesso" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <span className="text-red-500 shrink-0">✕</span>
          )}
          {mensagem.texto}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil
          </CardTitle>
          <CardDescription>Informações básicas da sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <Shield className="h-3 w-3 mr-1" />
              Conta verificada
            </Badge>
          </div>

          <Button onClick={handleSalvar} disabled={isSaving}>
            {isSaving ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>Configure suas preferências de notificação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Resultados dos sorteios</p>
              <p className="text-sm text-muted-foreground">Receba notificação quando os resultados forem divulgados</p>
            </div>
            <button
              onClick={() => setNotificacoesSorteio(!notificacoesSorteio)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificacoesSorteio ? "bg-primary" : "bg-muted"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notificacoesSorteio ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Jogos com score alto</p>
              <p className="text-sm text-muted-foreground">Seja notificado quando um jogo atingir score 80+</p>
            </div>
            <button
              onClick={() => setNotificacoesScore(!notificacoesScore)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificacoesScore ? "bg-primary" : "bg-muted"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notificacoesScore ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>

          <Button onClick={handleSalvar} disabled={isSaving} variant="outline" className="w-full mt-2">
            {isSaving ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Preferências
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>Ações irreversíveis na sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Ao excluir sua conta, todos os seus dados serão permanentemente removidos.
            Esta ação não pode ser desfeita.
          </p>
          <Button variant="destructive" onClick={handleExcluirConta} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Trash2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Minha Conta
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
