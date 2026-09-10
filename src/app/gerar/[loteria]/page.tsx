"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dices, ArrowLeft, Sparkles, Target, BarChart3 } from "lucide-react";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { getEstrategiasAtivas } from "@/modules/strategies";
import { calcularEstatisticas } from "@/modules/analytics";
import { calcularScore } from "@/modules/scoring";
import { funcoesEstrategias } from "@/modules/strategies/implementations";

export default function GerarPage() {
  const params = useParams();
  const slug = params.loteria as string;
  const loteria = getLoteriaPorSlug(slug);
  const estrategias = getEstrategiasAtivas();

  const [quantidade, setQuantidade] = useState(10);
  const [estrategiaSelecionada, setEstrategiaSelecionada] = useState(estrategias[0]?.slug || "");
  const [scoreMinimo, setScoreMinimo] = useState(60);
  const [jogosGerados, setJogosGerados] = useState<Array<{
    dezenas: number[];
    score: number;
    breakdown: Record<string, number>;
  }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!loteria) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Loteria não encontrada</h1>
        <Link href="/">
          <Button>Voltar ao Início</Button>
        </Link>
      </div>
    );
  }

  const handleGerar = async () => {
    setIsGenerating(true);

    await new Promise(resolve => setTimeout(resolve, 100));

    const jogosNovos: Array<{
      dezenas: number[];
      score: number;
      breakdown: Record<string, number>;
    }> = [];

    for (let i = 0; i < quantidade; i++) {
      const funcao = funcoesEstrategias[estrategiaSelecionada];
      if (!funcao) continue;

      const statsVazias = {
        frequencia: new Map<number, number>(),
        frequencia_percentual: new Map<number, number>(),
        atraso: new Map<number, number>(),
        distribuicao_par_impar: [],
        soma_concursos: { min: 0, max: 100, media: 50, desvio_padrao: 20, faixa_frequente: [30, 70] as [number, number] },
        distribuicao_quadrantes: new Map<number, number>(),
        repeticao_entre_concursos: [],
        sequencias_consecutivas: [],
        terminacoes: new Map<number, number>(),
      };

      const resultado = funcao(loteria, statsVazias, {});
      const score = calcularScore(resultado.dezenas, loteria, statsVazias, resultado.indicadores);

      jogosNovos.push({
        dezenas: resultado.dezenas,
        score: score.total,
        breakdown: score as unknown as Record<string, number>,
      });
    }

    jogosNovos.sort((a, b) => b.score - a.score);
    setJogosGerados(jogosNovos);
    setIsGenerating(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Dices className="h-8 w-8 text-primary" />
          Gerar Jogos - {loteria.nome}
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure a geração e receba jogos com score de qualidade.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Configuração</CardTitle>
              <CardDescription>Escolha a estratégia e parâmetros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="estrategia">Estratégia</Label>
                <Select value={estrategiaSelecionada} onValueChange={(v) => v && setEstrategiaSelecionada(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma estratégia" />
                  </SelectTrigger>
                  <SelectContent>
                    {estrategias.map(e => (
                      <SelectItem key={e.slug} value={e.slug}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade de Jogos</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min={1}
                  max={100}
                  value={quantidade}
                  onChange={e => setQuantidade(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="score">Score Mínimo (0-100)</Label>
                <Input
                  id="score"
                  type="number"
                  min={0}
                  max={100}
                  value={scoreMinimo}
                  onChange={e => setScoreMinimo(Number(e.target.value))}
                />
              </div>

              <Button onClick={handleGerar} disabled={isGenerating} className="w-full">
                {isGenerating ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Dices className="h-4 w-4 mr-2" />
                    Gerar Jogos
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {estrategias.find(e => e.slug === estrategiaSelecionada) && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">
                  {estrategias.find(e => e.slug === estrategiaSelecionada)?.nome}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {estrategias.find(e => e.slug === estrategiaSelecionada)?.descricao_completa}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Jogos Gerados ({jogosGerados.length})
              </CardTitle>
              <CardDescription>
                Jogos ordenados por score de aderência estatística
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jogosGerados.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Dices className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Configure os parâmetros e clique em &quot;Gerar Jogos&quot; para começar.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jogosGerados.map((jogo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-muted-foreground w-8">
                          #{index + 1}
                        </span>
                        <div className="flex gap-1">
                          {jogo.dezenas.map(d => (
                            <Badge key={d} variant="outline" className="min-w-[2rem] justify-center">
                              {String(d).padStart(2, "0")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <Badge variant={jogo.score >= 80 ? "default" : jogo.score >= 60 ? "secondary" : "outline"}>
                          {jogo.score}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
