"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Check, X, Clock, Wifi, WifiOff, TrendingUp, History, Download, AlertCircle } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";

interface SyncStatus {
  slug: string;
  nome: string;
  ultimoConcurso: number | null;
  proximoConcurso: number | null;
  dataProximoSorteio: string;
  valorAcumulado: number;
  valorEstimadoProximo: number;
  ultimaSync: string | null;
  status: "idle" | "syncing" | "success" | "error";
  fonte: string;
  error?: string;
}

interface BatchSyncState {
  loteriaSlug: string;
  start: number;
  end: number;
  isSyncing: boolean;
  progress: number;
  total: number;
  saved: number;
  skipped: number;
  errors: number;
  errorsList: number[];
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
      valorEstimadoProximo: 0,
      ultimaSync: null,
      status: "idle" as const,
      fonte: "",
    }))
  );
  const [syncAll, setSyncAll] = useState(false);
  const abortRef = useRef(false);

  const [batch, setBatch] = useState<BatchSyncState>({
    loteriaSlug: "lotofacil",
    start: 1,
    end: 50,
    isSyncing: false,
    progress: 0,
    total: 0,
    saved: 0,
    skipped: 0,
    errors: 0,
    errorsList: [],
  });

  useEffect(() => {
    carregarStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extrairValorAcumulado = (data: Record<string, unknown>): number => {
    const concurso = data.concurso as Record<string, unknown> | undefined;
    if (!concurso) return 0;
    return (
      Number(concurso.valor_acumulado) ||
      Number(concurso.valorAcumulado) ||
      Number(concurso.valorAcum) ||
      0
    );
  };

  const extrairValorEstimado = (data: Record<string, unknown>): number => {
    const concurso = data.concurso as Record<string, unknown> | undefined;
    if (!concurso) return 0;
    return (
      Number(concurso.valor_estimado_proximo) ||
      Number(concurso.valorEstimadoProximoConcurso) ||
      Number(concurso.valorEstimadoProximo) ||
      0
    );
  };

  async function carregarStatus() {
    const novosStatuses = await Promise.all(
      syncStatuses.map(async (status) => {
        try {
          const response = await fetch(`/api/sync/${status.slug}`);
          if (response.ok) {
            const data = await response.json();
            const concurso = data.concurso;
            return {
              ...status,
              ultimoConcurso: concurso?.numero_concurso || null,
              proximoConcurso: (concurso?.numero_concurso || 0) + 1,
              dataProximoSorteio: concurso?.data_proximo_concurso || "",
              valorAcumulado: extrairValorAcumulado(data),
              valorEstimadoProximo: extrairValorEstimado(data),
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
  }

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
                valorAcumulado: extrairValorAcumulado(data),
                valorEstimadoProximo: extrairValorEstimado(data),
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

  const sincronizarLote = async () => {
    abortRef.current = false;
    setBatch((prev) => ({
      ...prev,
      isSyncing: true,
      progress: 0,
      total: prev.end - prev.start + 1,
      saved: 0,
      skipped: 0,
      errors: 0,
      errorsList: [],
    }));

    try {
      const response = await fetch(`/api/sync/batch/${batch.loteriaSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: batch.start, end: batch.end }),
      });

      if (response.ok) {
        const data = await response.json();
        setBatch((prev) => ({
          ...prev,
          isSyncing: false,
          progress: data.total,
          saved: data.saved,
          skipped: data.skipped,
          errors: data.errors,
          errorsList: data.errorsList || [],
        }));

        await carregarStatus();
      } else {
        const data = await response.json();
        setBatch((prev) => ({
          ...prev,
          isSyncing: false,
          errors: prev.total,
          errorsList: [],
        }));
        console.error("Erro no batch sync:", data.error);
      }
    } catch (error) {
      console.error("Erro na sincronização em lote:", error);
      setBatch((prev) => ({
        ...prev,
        isSyncing: false,
        errors: prev.total,
      }));
    }
  };

  const cancelarBatchSync = () => {
    abortRef.current = true;
    setBatch((prev) => ({ ...prev, isSyncing: false }));
  };

  const formatCurrency = (value: number) =>
    value > 0 ? `R$ ${value.toLocaleString("pt-BR")}` : "-";

  const totalConcursos = syncStatuses.reduce((acc, s) => acc + (s.ultimoConcurso || 0), 0);
  const loteriasSync = syncStatuses.filter((s) => s.ultimoConcurso !== null).length;

  const batchLoteria = LOTERIAS.find(l => l.slug === batch.loteriaSlug);
  const batchProgressPct = batch.total > 0 ? Math.round((batch.progress / batch.total) * 100) : 0;

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

      {/* Batch Sync Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Sincronização Histórica em Lote
          </CardTitle>
          <CardDescription>
            Baixe múltiplos concursos históricos de uma vez. Informe o intervalo de concurso desejado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:w-auto">
              <Label className="text-sm mb-1 block">Loteria</Label>
              <Select
                value={batch.loteriaSlug}
                onValueChange={(v) => v && setBatch((prev) => ({ ...prev, loteriaSlug: v }))}
              >
                <SelectTrigger className="w-full sm:w-[200px]" disabled={batch.isSyncing}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOTERIAS.map((l) => (
                    <SelectItem key={l.slug} value={l.slug}>
                      {l.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[120px]">
              <Label className="text-sm mb-1 block">Concurso Início</Label>
              <Input
                type="number"
                min={1}
                value={batch.start}
                onChange={(e) =>
                  setBatch((prev) => ({ ...prev, start: parseInt(e.target.value) || 1 }))
                }
                disabled={batch.isSyncing}
              />
            </div>

            <div className="w-full sm:w-[120px]">
              <Label className="text-sm mb-1 block">Concurso Fim</Label>
              <Input
                type="number"
                min={1}
                value={batch.end}
                onChange={(e) =>
                  setBatch((prev) => ({ ...prev, end: parseInt(e.target.value) || 1 }))
                }
                disabled={batch.isSyncing}
              />
            </div>

            {batch.isSyncing ? (
              <Button variant="destructive" onClick={cancelarBatchSync}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            ) : (
              <Button onClick={sincronizarLote} disabled={batch.start > batch.end || batch.end - batch.start > 1000}>
                <Download className="h-4 w-4 mr-2" />
                Sincronizar Lote
              </Button>
            )}
          </div>

          {batch.end - batch.start > 1000 && !batch.isSyncing && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Máximo de 1000 concursos por vez.
            </p>
          )}

          {batch.isSyncing && (
            <div className="space-y-2">
              <Progress value={batchProgressPct}>
                <ProgressLabel>Sincronizando concursos...</ProgressLabel>
                <ProgressValue />
              </Progress>
              <p className="text-sm text-muted-foreground text-center">
                {batchProgressPct}% concluído
              </p>
            </div>
          )}

          {!batch.isSyncing && batch.saved + batch.skipped + batch.errors > 0 && (
            <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{batch.saved}</p>
                <p className="text-sm text-muted-foreground">Salvos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{batch.skipped}</p>
                <p className="text-sm text-muted-foreground">Já existentes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{batch.errors}</p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
            </div>
          )}

          {!batch.isSyncing && batch.errorsList.length > 0 && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <p className="font-medium mb-1">Concursos com erro:</p>
              <p className="text-xs break-all">
                {batch.errorsList.map(n => `#${n}`).join(", ")}
              </p>
            </div>
          )}

          {!batch.isSyncing && batch.saved > 0 && batch.errors === 0 && (
            <p className="text-sm text-green-600 text-center">
              Sincronização concluída com sucesso!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Regular Sync Card */}
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
                <TableHead>Acumulado</TableHead>
                <TableHead>Próx. Estimado</TableHead>
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
                    {status.valorAcumulado > 0 ? (
                      <span className="font-semibold text-green-600">
                        {formatCurrency(status.valorAcumulado)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {status.valorEstimadoProximo > 0 ? (
                      <span className="flex items-center gap-1 text-sm">
                        <TrendingUp className="h-3 w-3 text-blue-500" />
                        {formatCurrency(status.valorEstimadoProximo)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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
