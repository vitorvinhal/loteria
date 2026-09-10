"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LayoutDashboard,
  Gamepad2,
  BarChart3,
  TrendingUp,
  Clock,
  ArrowRight,
  Trophy,
  Target,
  Users,
  PieChart as PieChartIcon,
} from "lucide-react";
import { useAuth } from "@/lib/supabase/auth/provider";
import { FrequencyChart } from "@/components/lottery/frequency-chart";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface Jogo {
  id: string;
  dezenas: number[];
  score: number | null;
  lote_id: string;
  criado_em: string;
}

interface Lote {
  id: string;
  loteria: string;
  estrategia: string;
  quantidade: number;
  criado_em: string;
  jogos: Jogo[];
}

interface Stats {
  totalJogos: number;
  totalLotes: number;
  loteriasUsadas: string[];
  melhorScore: number;
  mediaScore: number;
}

const PIE_COLORS = ["#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      carregarDados();
    }
  }, [user]);

  const carregarDados = async () => {
    setIsLoadingData(true);
    try {
      const response = await fetch("/api/lotes");
      if (response.ok) {
        const data = await response.json();
        setLotes(data.lotes || []);
        setStats(data.stats || {
          totalJogos: 0,
          totalLotes: 0,
          loteriasUsadas: [],
          melhorScore: 0,
          mediaScore: 0,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const frequencyData = useMemo(() => {
    const counts: Record<number, number> = {};
    lotes.forEach((lote) =>
      lote.jogos.forEach((jogo) =>
        jogo.dezenas.forEach((d) => {
          counts[d] = (counts[d] || 0) + 1;
        })
      )
    );

    const totalEntries = Object.values(counts).reduce((s, c) => s + c, 0);
    const avgFrequency = totalEntries / Math.max(Object.keys(counts).length, 1);

    return Object.entries(counts)
      .map(([num, freq]) => ({
        numero: Number(num),
        frequencia: freq,
        percentual: totalEntries > 0 ? (freq / totalEntries) * 100 : 0,
        status: freq > avgFrequency * 1.3 ? "quente" : freq < avgFrequency * 0.7 ? "frio" : "neutro",
      }))
      .sort((a, b) => a.numero - b.numero);
  }, [lotes]);

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    lotes.forEach((lote) => {
      counts[lote.loteria] = (counts[lote.loteria] || 0) + lote.quantidade;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [lotes]);

  const scoreTimeline = useMemo(() => {
    const byDate: Record<string, { total: number; count: number }> = {};
    lotes.forEach((lote) =>
      lote.jogos.forEach((jogo) => {
        if (jogo.score !== null) {
          const date = new Date(jogo.criado_em).toLocaleDateString("pt-BR");
          if (!byDate[date]) byDate[date] = { total: 0, count: 0 };
          byDate[date].total += jogo.score;
          byDate[date].count += 1;
        }
      })
    );
    return Object.entries(byDate)
      .map(([date, { total, count }]) => ({
        date,
        score: Math.round(total / count),
      }))
      .sort((a, b) => {
        const [dA, mA, yA] = a.date.split("/").map(Number);
        const [dB, mB, yB] = b.date.split("/").map(Number);
        return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
      });
  }, [lotes]);

  if (isLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          Meu Painel
        </h1>
        <p className="text-muted-foreground mt-2">
          Bem-vindo, {user.email}. Aqui estão seus jogos e estatísticas.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Total de Jogos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.totalJogos || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Melhor Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.melhorScore || 0}/100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Média de Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.mediaScore || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Loterias Usadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.loteriasUsadas?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Distribuição de Loterias
            </CardTitle>
            <CardDescription>Quantidade de jogos por loteria</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : pieData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum dado disponível.</p>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={800}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value, name) => [`${value} jogos`, name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Scores ao Longo do Tempo
            </CardTitle>
            <CardDescription>Média de score por data de criação</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : scoreTimeline.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum score registrado.</p>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreTimeline} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      interval={scoreTimeline.length > 10 ? "preserveStartEnd" : 0}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      domain={[0, 100]}
                    />
                    <RechartsTooltip />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "hsl(var(--primary))" }}
                      animationDuration={800}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {frequencyData.length > 0 && (
        <div className="mb-6">
          <FrequencyChart
            data={frequencyData}
            title="Frequência dos Números Mais Jogados"
            description="Análise de frequência de todos os números utilizados nos seus jogos"
          />
        </div>
      )}

      <Tabs defaultValue="lotes" className="mb-6">
        <TabsList>
          <TabsTrigger value="lotes">
            <Clock className="h-4 w-4 mr-2" />
            Lotes Recentes
          </TabsTrigger>
          <TabsTrigger value="jogos">
            <Gamepad2 className="h-4 w-4 mr-2" />
            Todos os Jogos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lotes">
          <Card>
            <CardHeader>
              <CardTitle>Lotes Recentes</CardTitle>
              <CardDescription>Seus últimos lotes de jogos gerados</CardDescription>
            </CardHeader>
            <CardContent>
            {isLoadingData ? (
              <p className="text-muted-foreground text-center py-8">Carregando lotes...</p>
            ) : lotes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Você ainda não gerou nenhum lote.</p>
                  <Button onClick={() => router.push("/gerar/megasena")}>
                    Gerar Primeiro Lote
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loteria</TableHead>
                        <TableHead>Estratégia</TableHead>
                        <TableHead>Jogos</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lotes.slice(0, 10).map((lote) => (
                        <TableRow key={lote.id}>
                          <TableCell>
                            <Badge variant="outline">{lote.loteria}</Badge>
                          </TableCell>
                          <TableCell className="capitalize">{lote.estrategia}</TableCell>
                          <TableCell>{lote.quantidade}</TableCell>
                          <TableCell>
                            {new Date(lote.criado_em).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/gerar/${lote.loteria}`)}>
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jogos">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Jogos</CardTitle>
              <CardDescription>Todos os jogos que você gerou</CardDescription>
            </CardHeader>
            <CardContent>
            {isLoadingData ? (
              <p className="text-muted-foreground text-center py-8">Carregando jogos...</p>
            ) : lotes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum jogo encontrado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lotes.flatMap((lote) =>
                    lote.jogos.map((jogo) => ({
                      ...jogo,
                      loteria: lote.loteria,
                      estrategia: lote.estrategia,
                    }))
                  ).slice(0, 20).map((jogo, index) => (
                    <div key={jogo.id || index} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{jogo.loteria}</Badge>
                        <div className="flex gap-1 flex-wrap">
                          {jogo.dezenas.map((d) => (
                            <Badge key={d} variant="secondary">
                              {String(d).padStart(2, "0")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {jogo.score !== null && (
                          <Badge variant={jogo.score >= 80 ? "default" : "outline"}>
                            {jogo.score}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(jogo.criado_em).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Gerar Novos Jogos
            </CardTitle>
            <CardDescription>Crie novos jogos com estratégias inteligentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => router.push("/gerar/megasena")}>
                Mega-Sena
              </Button>
              <Button variant="outline" onClick={() => router.push("/gerar/lotofacil")}>
                Lotofácil
              </Button>
              <Button variant="outline" onClick={() => router.push("/gerar/quina")}>
                Quina
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Criar Bolão
            </CardTitle>
            <CardDescription>Monte um bolão com seus jogos</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/bolao")}>
              Simular Bolão
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
