"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing, Check, Clock, Trash2, Loader2, RefreshCw } from "lucide-react";
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
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [verificando, setVerificando] = useState(false);

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

  const verificarResultados = async () => {
    setVerificando(true);
    try {
      await fetch("/api/notificacoes/verificar", { method: "POST" });
      await carregarNotificacoes();
    } catch (error) {
      console.error("Erro ao verificar:", error);
    } finally {
      setVerificando(false);
    }
  };

  useEffect(() => {
    carregarNotificacoes();
  }, []);

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={verificarResultados}
            disabled={verificando}
          >
            {verificando ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Verificar Resultados
          </Button>
          {naoLidas > 0 && (
            <Button variant="outline" size="sm" onClick={marcarTodasComoLidas}>
              <Check className="h-4 w-4 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {isLoadingData ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Carregando notificações...</p>
            </div>
          </CardContent>
        </Card>
      ) : notificacoes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma notificação no momento.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Clique em &quot;Verificar Resultados&quot; para checar se há novos resultados.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={verificarResultados}
                disabled={verificando}
              >
                {verificando ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Verificar Agora
              </Button>
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
