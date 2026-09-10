"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Download } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";

export default function HistoricoJogosPage() {
  const [loteriaFiltro, setLoteriaFiltro] = useState("todas");

  const jogosMock = [
    { id: "1", loteria: "Mega-Sena", dezenas: [5, 12, 23, 34, 45, 56], score: 82, data: "2026-09-08", estrategia: "Quentes" },
    { id: "2", loteria: "Lotofácil", dezenas: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25], score: 75, data: "2026-09-07", estrategia: "Par/Ímpar" },
    { id: "3", loteria: "Quina", dezenas: [10, 25, 40, 55, 70], score: 91, data: "2026-09-06", estrategia: "Frias" },
    { id: "4", loteria: "Mega-Sena", dezenas: [3, 18, 29, 41, 52, 60], score: 68, data: "2026-09-05", estrategia: "Soma" },
    { id: "5", loteria: "Lotomania", dezenas: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95], score: 55, data: "2026-09-04", estrategia: "Quadrantes" },
  ];

  const jogosFiltrados = loteriaFiltro === "todas"
    ? jogosMock
    : jogosMock.filter(j => j.loteria === LOTERIAS.find(l => l.slug === loteriaFiltro)?.nome);

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
        </CardContent>
      </Card>
    </div>
  );
}
