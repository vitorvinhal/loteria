"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Hash, Target, ArrowUp, ArrowDown } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";
import { FrequencyChart } from "@/components/lottery/frequency-chart";

interface Estatistica {
  numero: number;
  frequencia: number;
  percentual: number;
  atraso: number;
  status: "quente" | "frio" | "neutro";
}

interface AnaliseCompleta {
  numeros: Estatistica[];
  mediaSoma: number;
  desvioSoma: number;
  parImpar: { pares: number; impares: number };
  quadrantes: { [key: number]: number };
  totalConcursos: number;
}

export default function EstatisticasPage() {
  const [loteriaSlug, setLoteriaSlug] = useState("megasena");
  const [analise, setAnalise] = useState<AnaliseCompleta | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loteria = LOTERIAS.find(l => l.slug === loteriaSlug);

  useEffect(() => {
    carregarEstatisticas();
  }, [loteriaSlug]);

  const carregarEstatisticas = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/estatisticas/${loteriaSlug}`);
      if (response.ok) {
        const data = await response.json();
        setAnalise(data);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const numerosQuentes = analise?.numeros.filter(n => n.status === "quente").slice(0, 10) || [];
  const numerosFrios = analise?.numeros.filter(n => n.status === "frio").slice(0, 10) || [];
  const maisAtrasados = [...(analise?.numeros || [])].sort((a, b) => b.atraso - a.atraso).slice(0, 10);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Estatísticas Avançadas
        </h1>
        <p className="text-muted-foreground mt-2">
          Análise detalhada de frequência e comportamento dos números.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-64">
            <Select value={loteriaSlug} onValueChange={(v) => v && setLoteriaSlug(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOTERIAS.map(l => (
                  <SelectItem key={l.slug} value={l.slug}>
                    {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {analise && (
            <Badge variant="outline">
              {analise.totalConcursos} concursos analisados
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando estatísticas...</p>
        </div>
      ) : analise ? (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Média de Soma
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{analise.mediaSoma}</p>
                <p className="text-xs text-muted-foreground">
                  Desvio: ±{analise.desvioSoma}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Par/Ímpar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {analise.parImpar.pares}/{analise.parImpar.impares}
                </p>
                <p className="text-xs text-muted-foreground">
                  Distribuição histórica
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Universo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{loteria?.universo_max || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {loteria?.qtd_dezenas_padrao || 0} dezenas por jogo
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                  <ArrowUp className="h-4 w-4" />
                  Números Quentes
                </CardTitle>
                <CardDescription>Maior frequência nos últimos concursos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {numerosQuentes.map(n => (
                    <Badge key={n.numero} variant="default" className="bg-green-100 text-green-800">
                      {String(n.numero).padStart(2, "0")} ({n.percentual}%)
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                  <ArrowDown className="h-4 w-4" />
                  Números Frios
                </CardTitle>
                <CardDescription>Menor frequência nos últimos concursos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {numerosFrios.map(n => (
                    <Badge key={n.numero} variant="outline" className="border-red-200 text-red-600">
                      {String(n.numero).padStart(2, "0")} ({n.percentual}%)
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
                  <TrendingUp className="h-4 w-4" />
                  Mais Atrasados
                </CardTitle>
                <CardDescription>Números que mais demoraram a sair</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {maisAtrasados.map(n => (
                    <Badge key={n.numero} variant="outline" className="border-orange-200 text-orange-600">
                      {String(n.numero).padStart(2, "0")} ({n.atraso} jogos)
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Frequência de Todos os Números</CardTitle>
              <CardDescription>
                Percentual de aparição de cada número nos concursos analisados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {analise.numeros.map(n => (
                  <div
                    key={n.numero}
                    className={`p-2 rounded-lg text-center ${
                      n.status === "quente"
                        ? "bg-green-100 text-green-800"
                        : n.status === "frio"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="font-bold text-sm">{String(n.numero).padStart(2, "0")}</p>
                    <p className="text-xs">{n.percentual}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gráfico de Frequência</CardTitle>
              <CardDescription>
                Visualização gráfica da frequência de cada número nos concursos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FrequencyChart data={analise.numeros} title="Frequência dos Números" description="Percentual de aparição por número" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Quadrante</CardTitle>
              <CardDescription>
                Como os números se distribuem nas faixas do universo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analise.quadrantes).map(([quadrante, total]) => (
                  <div key={quadrante} className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Quadrante {Number(quadrante) + 1}</p>
                    <p className="text-2xl font-bold">{total}</p>
                    <p className="text-xs text-muted-foreground">aparições</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Selecione uma loteria para ver as estatísticas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
