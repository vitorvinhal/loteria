"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { History, ChevronLeft, ChevronRight, RefreshCw, Trophy, TrendingUp, MapPin, Calendar, Hash } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";
import { Concurso } from "@/types";

interface PaginatedConcursos {
  concursos: Concurso[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ConcursosPage() {
  const [loteriaSlug, setLoteriaSlug] = useState(LOTERIAS[0]?.slug || "lotofacil");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedConcursos | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConcurso, setSelectedConcurso] = useState<Concurso | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/concursos/${loteriaSlug}?page=${page}&limit=50`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Erro ao carregar concursos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [loteriaSlug]);

  useEffect(() => {
    fetchData();
  }, [loteriaSlug, page]);

  const formatCurrency = (value: number) =>
    value > 0 ? `R$ ${value.toLocaleString("pt-BR")}` : "-";

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  const loteriaAtual = LOTERIAS.find(l => l.slug === loteriaSlug);

  const paginationRange = () => {
    if (!data) return [];
    const range: (number | "...")[] = [];
    const total = data.totalPages;
    const current = data.page;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) range.push(i);
    } else {
      range.push(1);
      if (current > 3) range.push("...");
      for (
        let i = Math.max(2, current - 1);
        i <= Math.min(total - 1, current + 1);
        i++
      ) {
        range.push(i);
      }
      if (current < total - 2) range.push("...");
      range.push(total);
    }

    return range;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-8 w-8 text-primary" />
          Concursos
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualize o histórico de concursos de todas as loterias da CAIXA.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Selecionar Loteria</span>
            {data && (
              <Badge variant="outline">{data.total} concursos</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Escolha a loteria para visualizar seus concursos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={loteriaSlug}
            onValueChange={(v) => v && setLoteriaSlug(v)}
          >
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Selecione a loteria" />
            </SelectTrigger>
            <SelectContent>
              {LOTERIAS.map((l) => (
                <SelectItem key={l.slug} value={l.slug}>
                  {l.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{loteriaAtual?.nome || "Loteria"} - Histórico</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Carregando concursos...</p>
            </div>
          ) : !data || data.concursos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhum concurso encontrado.</p>
              <p className="text-sm mt-2">
                Sincronize os dados na página de sincronização.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        Concurso
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Data
                      </span>
                    </TableHead>
                    <TableHead>Dezenas</TableHead>
                    <TableHead>Acumulou</TableHead>
                    <TableHead>Valor Acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.concursos.map((concurso) => (
                    <TableRow
                      key={concurso.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedConcurso(concurso)}
                    >
                      <TableCell className="font-medium">
                        <Badge variant="outline">#{concurso.numero_concurso}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(concurso.data_sorteio)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {concurso.dezenas_sorteadas.slice(0, 6).map((d) => (
                            <Badge key={d} variant="secondary" className="text-xs">
                              {String(d).padStart(2, "0")}
                            </Badge>
                          ))}
                          {concurso.dezenas_sorteadas.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{concurso.dezenas_sorteadas.length - 6}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {concurso.acumulou ? (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Trophy className="h-3 w-3 mr-1" />
                            Sim
                          </Badge>
                        ) : (
                          <Badge variant="outline">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {concurso.valor_acumulado > 0 ? (
                          <span className="font-semibold text-green-600">
                            {formatCurrency(concurso.valor_acumulado)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Página {data.page} de {data.totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(1)}
                      disabled={data.page === 1}
                    >
                      Primeira
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(data.page - 1)}
                      disabled={data.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {paginationRange().map((item, idx) =>
                      item === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={item}
                          variant={data.page === item ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(item)}
                          className="min-w-[32px]"
                        >
                          {item}
                        </Button>
                      )
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(data.page + 1)}
                      disabled={data.page === data.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(data.totalPages)}
                      disabled={data.page === data.totalPages}
                    >
                      Última
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detalhes do Concurso - Sheet */}
      <Sheet open={!!selectedConcurso} onOpenChange={(open) => !open && setSelectedConcurso(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {selectedConcurso && (
            <>
              <SheetHeader>
                <SheetTitle>
                  Concurso #{selectedConcurso.numero_concurso}
                </SheetTitle>
                <SheetDescription>
                  {loteriaAtual?.nome} - {formatDate(selectedConcurso.data_sorteio)}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-4 space-y-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Dezenas Sorteadas</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedConcurso.dezenas_sorteadas.map((d) => (
                      <Badge key={d} variant="secondary" className="text-base px-3 py-1">
                        {String(d).padStart(2, "0")}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Acumulou</p>
                  {selectedConcurso.acumulou ? (
                    <Badge className="bg-yellow-100 text-yellow-800 text-base px-3 py-1">
                      <Trophy className="h-4 w-4 mr-1" />
                      Sim - Acumulou!
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-base px-3 py-1">Não</Badge>
                  )}
                </div>

                {selectedConcurso.valor_acumulado > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Valor Acumulado</p>
                    <p className="text-xl font-bold text-green-600 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      {formatCurrency(selectedConcurso.valor_acumulado)}
                    </p>
                  </div>
                )}

                {selectedConcurso.valor_estimado_proximo > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Prêmio Estimado Próximo</p>
                    <p className="text-lg font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      {formatCurrency(selectedConcurso.valor_estimado_proximo)}
                    </p>
                  </div>
                )}

                <Separator />

                {selectedConcurso.local_sorteio && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Local do Sorteio</p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {selectedConcurso.local_sorteio}
                    </p>
                  </div>
                )}

                {selectedConcurso.data_proximo_concurso && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Próximo Sorteio</p>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(selectedConcurso.data_proximo_concurso)}
                    </p>
                  </div>
                )}

                {selectedConcurso.premiacoes && selectedConcurso.premiacoes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-3">Premiações</p>
                      <div className="space-y-2">
                        {selectedConcurso.premiacoes.map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <div>
                              <p className="text-sm font-medium">{p.descricao}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.acertos} acertos • {p.ganhadores} ganhador(es)
                              </p>
                            </div>
                            <p className="text-sm font-semibold">
                              {p.premio > 0 ? formatCurrency(p.premio) : "-"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
