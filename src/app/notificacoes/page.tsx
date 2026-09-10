"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing, Check, Clock, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/supabase/auth/provider";

interface Notificacao {
  id: string;
  tipo: "resultado" | "score" | "sistema";
  titulo: string;
  mensagem: string;
  lida: boolean;
  criado_em: string;
  dados?: {
    loteria?: string;
    concurso?: number;
    score?: number;
  };
}

export default function NotificacoesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      carregarNotificacoes();
    }
  }, [user]);

  const carregarNotificacoes = async () => {
    setIsLoadingData(true);
    try {
      const response = await fetch("/api/notificacoes");
      if (response.ok) {
        const data = await response.json();
        setNotificacoes(data.notificacoes || []);
      }
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const marcarComoLida = async (id: string) => {
    try {
      await fetch(`/api/notificacoes/${id}`, { method: "PUT" });
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
    } catch (error) {
      console.error("Erro ao marcar notificação:", error);
    }
  };

  const excluirNotificacao = async (id: string) => {
    try {
      await fetch(`/api/notificacoes/${id}`, { method: "DELETE" });
      setNotificacoes((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Erro ao excluir notificação:", error);
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      await fetch("/api/notificacoes/marcar-todas", { method: "PUT" });
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (error) {
      console.error("Erro ao marcar todas:", error);
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

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-8 w-8 text-primary" />
          Notificações
        </h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe os resultados e novidades das loterias.
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Badge variant={naoLidas > 0 ? "default" : "outline"}>
            <BellRing className="h-3 w-3 mr-1" />
            {naoLidas} não lidas
          </Badge>
        </div>
        {naoLidas > 0 && (
          <Button variant="outline" size="sm" onClick={marcarTodasComoLidas}>
            <Check className="h-4 w-4 mr-1" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {isLoadingData ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Carregando notificações...</p>
          </CardContent>
        </Card>
      ) : notificacoes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma notificação no momento.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Você receberá notificações quando houver novos resultados ou jogos com score alto.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notificacoes.map((notif) => (
            <Card
              key={notif.id}
              className={notif.lida ? "opacity-60" : "border-primary/50"}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={notif.lida ? "outline" : "default"} className="text-xs">
                        {notif.tipo === "resultado" && "Resultado"}
                        {notif.tipo === "score" && "Score"}
                        {notif.tipo === "sistema" && "Sistema"}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(notif.criado_em).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <h3 className="font-medium">{notif.titulo}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{notif.mensagem}</p>
                    {notif.dados?.loteria && (
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{notif.dados.loteria}</Badge>
                        {notif.dados.concurso && (
                          <Badge variant="secondary">#{notif.dados.concurso}</Badge>
                        )}
                        {notif.dados.score && (
                          <Badge variant="secondary">Score: {notif.dados.score}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {!notif.lida && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => marcarComoLida(notif.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => excluirNotificacao(notif.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
