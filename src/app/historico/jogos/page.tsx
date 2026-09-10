"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Download, RefreshCw, Filter, ArrowUpDown } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";

interface JogoHistorico {
  id: string;
  loteria: string;
  dezenas: number[];
  score: number | null;
  criado_em: string;
  estrategia: string;
}

type SortField = "data" | "score" | "loteria";
type SortOrder = "asc" | "desc";

export default function HistoricoJogosPage() {
  const [loteriaFiltro, setLoteriaFiltro] = useState("todas");
  const [jogos, setJogos] = useState<JogoHistorico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("data");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const fetchJogos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/lotes");
      if (response.ok) {
        const data = await response.json();
        const todosJogos: JogoHistorico[] = [];

        for (const lote of data.lotes || []) {
          for (const jogo of lote.jogos || []) {
            todosJogos.push({
              id: jogo.id,
              loteria: lote.loteria,
              dezenas: jogo.dezenas,
              score: jogo.score,
              criado_em: jogo.criado_em,
              estrategia: lote.estrategia,
            });
          }
        }

        setJogos(todosJogos);
      }
    } catch (error) {
      console.error("Erro ao carregar jogos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJogos();
  }, []);

  const jogosFiltrados = loteriaFiltro === "todas"
    ? jogos
    : jogos.filter(j => j.loteria === loteriaFiltro);

  const jogosOrdenados = [...jogosFiltrados].sort((a, b) => {
    let comparacao = 0;

    if (sortField === "data") {
      comparacao = new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
    } else if (sortField === "score") {
      comparacao = (a.score || 0) - (b.score || 0);
    } else if (sortField === "loteria") {
      comparacao = a.loteria.localeCompare(b.loteria);
    }

    return sortOrder === "desc" ? -comparacao : comparacao;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const exportarCSV = () => {
    const headers = ["Loteria", "Dezenas", "Score", "Estratégia", "Data"];
    const rows = jogosOrdenados.map(j => [
      j.loteria,
      j.dezenas.join(";"),
      j.score?.toString() || "",
      j.estrategia,
      new Date(j.criado_em).toLocaleDateString("pt-BR"),
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jogos-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loteriasUnicas = [...new Set(jogos.map(j => j.loteria))];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-8 w-8 text-primary" />
          Histórico de Jogos
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualize todos os jogos que você gerou anteriormente.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={loteriaFiltro} onValueChange={(v) => v && setLoteriaFiltro(v)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todas as loterias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as loterias</SelectItem>
            {loteriasUnicas.map(l => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" className="gap-2" onClick={fetchJogos} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>

        <Button variant="outline" className="gap-2" onClick={exportarCSV} disabled={jogos.length === 0}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Jogos Gerados</span>
            <Badge variant="outline">{jogosFiltrados.length} jogos</Badge>
          </CardTitle>
          <CardDescription>
            <div className="flex gap-4 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSort("data")}
                className="h-7 px-2"
              >
                <ArrowUpDown className="h-3 w-3 mr-1" />
                Data {sortField === "data" && (sortOrder === "desc" ? "↓" : "↑")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSort("score")}
                className="h-7 px-2"
              >
                <ArrowUpDown className="h-3 w-3 mr-1" />
                Score {sortField === "score" && (sortOrder === "desc" ? "↓" : "↑")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSort("loteria")}
                className="h-7 px-2"
              >
                <ArrowUpDown className="h-3 w-3 mr-1" />
                Loteria {sortField === "loteria" && (sortOrder === "desc" ? "↓" : "↑")}
              </Button>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Carregando jogos...</p>
            </div>
          ) : jogos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhum jogo gerado ainda.</p>
              <p className="text-sm mt-2">Gere seu primeiro jogo na página de geração.</p>
            </div>
          ) : jogosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhum jogo encontrado para esta loteria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loteria</TableHead>
                  <TableHead>Dezenas</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Estratégia</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jogosOrdenados.map(jogo => (
                  <TableRow key={jogo.id}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{jogo.loteria}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {jogo.dezenas.slice(0, 6).map(d => (
                          <Badge key={d} variant="secondary" className="text-xs">
                            {String(d).padStart(2, "0")}
                          </Badge>
                        ))}
                        {jogo.dezenas.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{jogo.dezenas.length - 6}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={jogo.score && jogo.score >= 80 ? "default" : "secondary"}>
                        {jogo.score || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{jogo.estrategia}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(jogo.criado_em).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
