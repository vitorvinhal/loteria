"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, Trash2, Shield, Bell, User, CheckCircle2, Camera, X } from "lucide-react";
import { useAuth } from "@/lib/supabase/auth/provider";

export default function ConfiguracoesPage() {
  const { user, isLoading, avatarUrl, refreshAvatar } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [notificacoesSorteio, setNotificacoesSorteio] = useState(true);
  const [notificacoesScore, setNotificacoesScore] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMensagem({ tipo: "erro", texto: "Envie um arquivo de imagem (JPG, PNG ou WebP)." });
      return;
    }

    setIsUploading(true);
    setMensagem(null);

    try {
      const imagem = await compressImage(file);
      if (!imagem) {
        throw new Error("Falha ao processar a imagem");
      }

      const response = await fetch("/api/usuario/foto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagem }),
      });

      const data = await response.json();

      if (response.ok) {
        await refreshAvatar();
        setMensagem({ tipo: "sucesso", texto: "Foto atualizada com sucesso!" });
      } else {
        setMensagem({ tipo: "erro", texto: data.error || "Erro ao fazer upload da foto." });
      }
    } catch {
      setMensagem({ tipo: "erro", texto: "Erro ao fazer upload da foto. Tente novamente." });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const compressImage = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 180;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = () => resolve(null);
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Tem certeza que deseja remover sua foto de perfil?")) return;

    setIsUploading(true);
    setMensagem(null);

    try {
      const response = await fetch("/api/usuario/foto", { method: "DELETE" });

      if (response.ok) {
        await refreshAvatar();
        setMensagem({ tipo: "sucesso", texto: "Foto removida com sucesso!" });
      } else {
        setMensagem({ tipo: "erro", texto: "Erro ao remover foto." });
      }
    } catch {
      setMensagem({ tipo: "erro", texto: "Erro ao remover foto." });
    } finally {
      setIsUploading(false);
    }
  };

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
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Foto de perfil"
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <Button
                size="icon"
                variant="outline"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Camera className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Foto de perfil</p>
              <p className="text-xs text-muted-foreground mb-2">
                JPG, PNG ou WebP. Máx. 2MB.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? "Enviando..." : "Alterar foto"}
                </Button>
                {avatarUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemovePhoto}
                    disabled={isUploading}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          <Separator />

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
