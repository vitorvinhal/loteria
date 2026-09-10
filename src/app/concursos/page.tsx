"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Download, RefreshCw, Database, Loader2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";

interface Concurso {
  id: string;
  numero_concurso: number;
  data_sorteio: string;
  dezenas_sorteadas: number[];
  acumulou: boolean;
  valor_acumulado: number | null;
  valor_estimado_proximo: number | null;
  premiacoes: unknown;
}

export default function ConcursosPage() {
  const [loteriaSlug, setLoteriaSlug] = useState("lotofacil");
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ atual: 0, total: 0, salvos: 0, erros: 0 });
  const [concursoSelecionado, setConcursoSelecionado] = useState<Concurso | null>(null);
  const limit = 50;

  const loteria = LOTERIAS.find(l => l.slug === loteriaSlug);

  const fetchConcursos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/concursos/${loteriaSlug}?page=${page}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setConcursos(data.concursos || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Erro ao buscar concursos:", e);
    } finally {
      setLoading(false);
    }
  }, [loteriaSlug, page]);

  useEffect(() => {
    fetchConcursos();
  }, [fetchConcursos]);

  const handleSyncBatch = async () => {
    if (!loteria) return;
    setSyncing(true);
    setSyncProgress({ atual: 0, total: 0, salvos: 0, erros: 0 });

    try {
      const startRes = await fetch(`/api/concursos/${loteriaSlug}?page=1&limit=1`);
      const startData = await startRes.json();
      const ultimoConcurso = startData.concursos?.[0]?.numero_concurso || 0;

      const targetConcurso = ultimoConcurso + 100;

      const res = await fetch(`/api/sync/batch/${loteriaSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: ultimoConcurso + 1, end: targetConcurso }),
      });

      const data = await res.json();
      setSyncProgress({
        atual: data.total || 0,
        total: data.total || 0,
        salvos: data.saved || 0,
        erros: data.errors || 0,
      });

      fetchConcursos();
    } catch (e) {
      console.error("Erro ao sincronizar:", e);
    } finally {
      setSyncing(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Database className="h-8 w-8 text-primary" />
          Base de Concursos
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualize e sincronize o histórico completo de concursos de todas as loterias.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {LOTERIAS.filter(l => l.ativo).map(l => {
          const isSelected = l.slug === loteriaSlug;
          return (
            <button
              key={l.slug}
              onClick={() => { setLoteriaSlug(l.slug); setPage(1); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <span className={`text-sm font-semibold ${isSelected ? "text-primary" : ""}`}>
                {l.nome}
              </span>
              <span className="text-xs text-muted-foreground block mt-1">
                {l.qtd_dezenas_padrao} dezenas • Universo {l.universo_min}-{l.universo_max}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Button onClick={handleSyncBatch} disabled={syncing} variant="outline">
          {syncing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Baixar Próximos 100
            </>
          )}
        </Button>
        <Button onClick={fetchConcursos} disabled={loading} variant="ghost" size="sm">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Badge variant="outline">{total} concursos</Badge>
      </div>

      {syncing && syncProgress.total > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Baixando concursos...</span>
              <span>{syncProgress.salvos} salvos / {syncProgress.erros} erros</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min((syncProgress.atual / Math.max(syncProgress.total, 1)) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Concurso</TableHead>
                  <TableHead className="w-28">Data</TableHead>
                  <TableHead>Dezenas</TableHead>
                  <TableHead className="w-20">Acumulou</TableHead>
                  <TableHead className="w-36">Valor Acumulado</TableHead>
                  <TableHead className="w-24">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : concursos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum concurso encontrado. Clique em "Baixar Próximos 100" para popular.
                    </TableCell>
                  </TableRow>
                ) : (
                  concursos.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-bold">#{c.numero_concurso}</TableCell>
                      <TableCell className="text-sm">{formatDate(c.data_sorteio)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(c.dezenas_sorteadas) ? c.dezenas_sorteadas : []).map(d => (
                            <span
                              key={d}
                              className="inline-flex items-center justify-center h-7 min-w-[1.75rem] rounded-full bg-primary/10 text-primary text-xs font-bold"
                            >
                              {String(d).padStart(2, "0")}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.acumulou ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">Sim</Badge>
                        ) : (
                          <Badge variant="secondary">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(c.valor_acumulado)}</TableCell>
                      <TableCell>
                        <Sheet>
                          <SheetTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConcursoSelecionado(c)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <SheetContent>
                            <SheetHeader>
                              <SheetTitle>Concurso #{c.numero_concurso}</SheetTitle>
                            </SheetHeader>
                            <div className="mt-6 space-y-4">
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Data do Sorteio</p>
                                <p className="font-medium">{formatDate(c.data_sorteio)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Dezenas Sorteadas</p>
                                <div className="flex flex-wrap gap-2">
                                  {(Array.isArray(c.dezenas_sorteadas) ? c.dezenas_sorteadas : []).map(d => (
                                    <span
                                      key={d}
                                      className="inline-flex items-center justify-center h-10 min-w-[2.5rem] rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20"
                                    >
                                      {String(d).padStart(2, "0")}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Acumulou</p>
                                <Badge className={c.acumulou ? "bg-emerald-500/15 text-emerald-600" : ""}>
                                  {c.acumulou ? "Sim" : "Não"}
                                </Badge>
                              </div>
                              {c.valor_acumulado && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Valor Acumulado</p>
                                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(c.valor_acumulado)}</p>
                                </div>
                              )}
                              {c.valor_estimado_proximo && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Próximo Sorteio (Estimativa)</p>
                                  <p className="font-medium">{formatCurrency(c.valor_estimado_proximo)}</p>
                                </div>
                              )}
                            </div>
                          </SheetContent>
                        </Sheet>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
