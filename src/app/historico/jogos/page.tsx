"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Download, RefreshCw } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";

interface JogoHistorico {
  id: string;
  loteria: string;
  dezenas: number[];
  score: number;
  data: string;
  estrategia: string;
}

export default function HistoricoJogosPage() {
  const [loteriaFiltro, setLoteriaFiltro] = useState("todas");
  const [jogos, setJogos] = useState<JogoHistorico[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJogos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/loterias`);
      if (response.ok) {
        // For now, use mock data since we need to implement a proper endpoint
        const mockJogos: JogoHistorico[] = [
          { id: "1", loteria: "Mega-Sena", dezenas: [5, 12, 23, 34, 45, 56], score: 82, data: "2026-09-08", estrategia: "Quentes" },
          { id: "2", loteria: "Lotofácil", dezenas: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25], score: 75, data: "2026-09-07", estrategia: "Par/Ímpar" },
          { id: "3", loteria: "Quina", dezenas: [10, 25, 40, 55, 70], score: 91, data: "2026-09-06", estrategia: "Frias" },
          { id: "4", loteria: "Mega-Sena", dezenas: [3, 18, 29, 41, 52, 60], score: 68, data: "2026-09-05", estrategia: "Soma" },
          { id: "5", loteria: "Lotomania", dezenas: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95], score: 55, data: "2026-09-04", estrategia: "Quadrantes" },
        ];
        setJogos(mockJogos);
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
    : jogos.filter(j => j.loteria === LOTERIAS.find(l => l.slug === loteriaFiltro)?.nome);

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
            {LOTERIAS.map(l => (
              <SelectItem key={l.slug} value={l.slug}>{l.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" className="gap-2" onClick={fetchJogos} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>

        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jogos Gerados</CardTitle>
          <CardDescription>{jogosFiltrados.length} jogos encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Carregando jogos...</p>
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
                {jogosFiltrados.map(jogo => (
                  <TableRow key={jogo.id}>
                    <TableCell className="font-medium">{jogo.loteria}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {jogo.dezenas.slice(0, 6).map(d => (
                          <Badge key={d} variant="outline" className="text-xs">
                            {String(d).padStart(2, "0")}
                          </Badge>
                        ))}
                        {jogo.dezenas.length > 6 && (
                          <Badge variant="secondary" className="text-xs">
                            +{jogo.dezenas.length - 6}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={jogo.score >= 80 ? "default" : "secondary"}>
                        {jogo.score}
                      </Badge>
                    </TableCell>
                    <TableCell>{jogo.estrategia}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(jogo.data).toLocaleDateString("pt-BR")}
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
