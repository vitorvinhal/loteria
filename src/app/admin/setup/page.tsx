"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Database, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function AdminSetupPage() {
  const [status, setStatus] = useState<{ strategies: number; concursos: number; lotes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupRunning, setSetupRunning] = useState(false);
  const [setupResults, setSetupResults] = useState<string[]>([]);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/setup");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error("Erro ao verificar status:", e);
    } finally {
      setLoading(false);
    }
  };

  const runSetup = async () => {
    setSetupRunning(true);
    setSetupResults([]);
    try {
      const res = await fetch("/api/admin/setup", { method: "POST" });
      const data = await res.json();
      setSetupResults(data.results || []);
      await checkStatus();
    } catch (e) {
      setSetupResults([`Erro: ${e instanceof Error ? e.message : String(e)}`]);
    } finally {
      setSetupRunning(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" />
          Admin Setup
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure o banco de dados e estrategias do sistema.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Status Atual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Verificando...</span>
            </div>
          ) : status ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold">{status.strategies}</p>
                <p className="text-sm text-muted-foreground">Estratégias</p>
                <Badge variant={status.strategies > 0 ? "default" : "destructive"} className="mt-2">
                  {status.strategies > 0 ? "OK" : "Vazio"}
                </Badge>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold">{status.concursos}</p>
                <p className="text-sm text-muted-foreground">Concursos</p>
                <Badge variant={status.concursos > 0 ? "default" : "secondary"} className="mt-2">
                  {status.concursos > 0 ? "OK" : "Vazio"}
                </Badge>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold">{status.lotes}</p>
                <p className="text-sm text-muted-foreground">Lotes</p>
                <Badge variant={status.lotes > 0 ? "default" : "secondary"} className="mt-2">
                  {status.lotes > 0 ? "OK" : "Vazio"}
                </Badge>
              </div>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button onClick={checkStatus} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button onClick={runSetup} disabled={setupRunning}>
              {setupRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Rodar Setup
            </Button>
          </div>
        </CardContent>
      </Card>

      {setupResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado do Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {setupResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {r.includes("OK") ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                  )}
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
