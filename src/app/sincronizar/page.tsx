"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Check, X, Clock, Wifi, WifiOff } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";

interface SyncStatus {
  slug: string;
  nome: string;
  ultimoConcurso: number | null;
  proximoConcurso: number | null;
  dataProximoSorteio: string;
  valorAcumulado: number;
  ultimaSync: string | null;
  status: "idle" | "syncing" | "success" | "error";
  fonte: string;
  error?: string;
}

export default function SincronizarPage() {
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>(
    LOTERIAS.map((l) => ({
      slug: l.slug,
      nome: l.nome,
      ultimoConcurso: null,
      proximoConcurso: null,
      dataProximoSorteio: "",
      valorAcumulado: 0,
      ultimaSync: null,
      status: "idle" as const,
      fonte: "",
    }))
  );
  const [syncAll, setSyncAll] = useState(false);

  useEffect(() => {
    carregarStatus();
  }, []);

  const carregarStatus = async () => {
    const novosStatuses = await Promise.all(
      syncStatuses.map(async (status) => {
        try {
          const response = await fetch(`/api/sync/${status.slug}`);
          if (response.ok) {
            const data = await response.json();
            return {
              ...status,
              ultimoConcurso: data.concurso?.numero_concurso || null,
              proximoConcurso: (data.concurso?.numero_concurso || 0) + 1,
              dataProximoSorteio: data.concurso?.data_proximo_concurso || "",
              valorAcumulado: data.concurso?.valor_acumulado || 0,
              fonte: data.fonte || "",
              status: "idle" as const,
            };
          }
        } catch {
          // Silently fail
        }
        return status;
      })
    );
    setSyncStatuses(novosStatuses);
  };

  const sincronizarLoteria = async (slug: string) => {
    setSyncStatuses((prev) =>
      prev.map((s) => (s.slug === slug ? { ...s, status: "syncing" } : s))
    );

    try {
      const response = await fetch(`/api/sync/${slug}`, { method: "POST" });
      const data = await response.json();

      setSyncStatuses((prev) =>
        prev.map((s) =>
          s.slug === slug
            ? {
                ...s,
                ultimoConcurso: data.concurso?.numero_concurso || s.ultimoConcurso,
                proximoConcurso: (data.concurso?.numero_concurso || 0) + 1,
                dataProximoSorteio: data.concurso?.data_proximo_concurso || "",
                valorAcumulado: data.concurso?.valor_acumulado || 0,
                fonte: data.fonte || "",
                ultimaSync: new Date().toISOString(),
                status: response.ok ? "success" : "error",
                error: response.ok ? undefined : data.error,
              }
            : s
        )
      );
    } catch {
      setSyncStatuses((prev) =>
        prev.map((s) =>
          s.slug === slug ? { ...s, status: "error", error: "Erro de conexão" } : s
        )
      );
    }
  };

  const sincronizarTodas = async () => {
    setSyncAll(true);
    for (const status of syncStatuses) {
      await sincronizarLoteria(status.slug);
    }
    setSyncAll(false);
  };

  const totalConcursos = syncStatuses.reduce((acc, s) => acc + (s.ultimoConcurso || 0), 0);
  const loteriasSync = syncStatuses.filter((s) => s.ultimoConcurso !== null).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <RefreshCw className="h-8 w-8 text-primary" />
          Sincronização de Resultados
        </h1>
        <p className="text-muted-foreground mt-2">
          Sincronize os resultados das loterias da CAIXA em tempo real.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Loterias Sincronizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loteriasSync}/{LOTERIAS.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total de Concursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalConcursos}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Última Atualização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {syncStatuses.find((s) => s.ultimaSync)
                ? new Date(
                    syncStatuses.find((s) => s.ultimaSync)!.ultimaSync!
                  ).toLocaleTimeString("pt-BR")
                : "Nunca"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Loterias da CAIXA</span>
            <Button onClick={sincronizarTodas} disabled={syncAll}>
              {syncAll ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando todas...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar Todas
                </>
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Clique para sincronizar cada loteria individualmente ou todas de uma vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loteria</TableHead>
                <TableHead>Último Concurso</TableHead>
                <TableHead>Próximo Concurso</TableHead>
                <TableHead>Valor Acumulado</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncStatuses.map((status) => (
                <TableRow key={status.slug}>
                  <TableCell className="font-medium">{status.nome}</TableCell>
                  <TableCell>
                    {status.ultimoConcurso ? (
                      <Badge variant="outline">#{status.ultimoConcurso}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {status.proximoConcurso ? (
                      <Badge variant="secondary">#{status.proximoConcurso}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {status.valorAcumulado > 0
                      ? `R$ ${status.valorAcumulado.toLocaleString("pt-BR")}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {status.fonte ? (
                      <Badge variant="outline">{status.fonte}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {status.status === "syncing" && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Sincronizando
                      </Badge>
                    )}
                    {status.status === "success" && (
                      <Badge className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Sucesso
                      </Badge>
                    )}
                    {status.status === "error" && (
                      <Badge className="bg-red-100 text-red-800">
                        <X className="h-3 w-3 mr-1" />
                        Erro
                      </Badge>
                    )}
                    {status.status === "idle" && (
                      <Badge variant="outline">
                        <WifiOff className="h-3 w-3 mr-1" />
                        Aguardando
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sincronizarLoteria(status.slug)}
                      disabled={status.status === "syncing"}
                    >
                      <RefreshCw className={`h-4 w-4 ${status.status === "syncing" ? "animate-spin" : ""}`} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
