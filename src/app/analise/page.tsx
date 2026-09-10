"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Target, TrendingUp, Hash, Zap, ArrowRight } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";

interface AnaliseResult {
  dezenas: number[];
  score: number;
  breakdown: {
    frequencia: number;
    atraso: number;
    par_impar: number;
    soma: number;
    distribuicao: number;
    exclusao_padroes: number;
    aderencia_estrategia: number;
    total: number;
  };
  estatisticas: {
    soma: number;
    media: number;
    pares: number;
    impares: number;
    sequencias: number;
    spread: number;
  };
}

export default function AnalisePage() {
  const [loteriaSlug, setLoteriaSlug] = useState("megasena");
  const [dezenasInput, setDezenasInput] = useState("");
  const [analise, setAnalise] = useState<AnaliseResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loteria = LOTERIAS.find(l => l.slug === loteriaSlug);

  const handleAnalisar = async () => {
    if (!loteria) return;

    const dezenas = dezenasInput
      .split(/[\s,;-]+/)
      .map(Number)
      .filter(n => !isNaN(n) && n >= loteria.universo_min && n <= loteria.universo_max)
      .sort((a, b) => a - b);

    if (dezenas.length < loteria.qtd_dezenas_min) return;

    setIsAnalyzing(true);

    try {
      const response = await fetch(`/api/analisar/${loteriaSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dezenas }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalise(data);
      }
    } catch (error) {
      console.error("Erro ao analisar:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Análise de Jogo
        </h1>
        <p className="text-muted-foreground mt-2">
          Analise qualquer combinação de dezenas e veja seu score de qualidade.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configurar Análise</CardTitle>
          <CardDescription>Selecione a loteria e digite as dezenas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Loteria</Label>
            <Select value={loteriaSlug} onValueChange={(v) => v && setLoteriaSlug(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOTERIAS.map(l => (
                  <SelectItem key={l.slug} value={l.slug}>
                    {l.nome} ({l.universo_min}-{l.universo_max})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dezenas">Dezenas</Label>
            <Input
              id="dezenas"
              placeholder={loteria ? `Ex: ${Array.from({length: loteria.qtd_dezenas_padrao}, (_, i) => i + loteria.universo_min).slice(0, 3).join(' ')}` : "Digite as dezenas"}
              value={dezenasInput}
              onChange={e => setDezenasInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {loteria && `Mínimo ${loteria.qtd_dezenas_min} dezenas (1-${loteria.universo_max})`}
            </p>
          </div>

          <Button onClick={handleAnalisar} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Target className="h-4 w-4 mr-2" />
                Analisar Jogo
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {analise && (
        <div className="space-y-6">
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Resultado da Análise</span>
                <Badge variant={analise.score >= 80 ? "default" : "secondary"} className="text-lg px-3">
                  {analise.score}/100
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap mb-4">
                {analise.dezenas.map(d => (
                  <Badge key={d} variant="outline" className="text-lg px-3 py-1">
                    {String(d).padStart(2, "0")}
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground">
                Score de aderência estatística e equilíbrio combinatório.
              </p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Soma Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{analise.estatisticas.soma}</p>
                <p className="text-xs text-muted-foreground">
                  Média: {analise.estatisticas.media} | Spread: {analise.estatisticas.spread}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Par/Ímpar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{analise.estatisticas.pares}/{analise.estatisticas.impares}</p>
                <p className="text-xs text-muted-foreground">
                  {analise.estatisticas.pares} pares, {analise.estatisticas.impares} ímpares
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Sequências
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{analise.estatisticas.sequencias}</p>
                <p className="text-xs text-muted-foreground">Números consecutivos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Score por Critério
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Frequência</span>
                  <Badge variant="outline">{analise.breakdown.frequencia}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Atraso</span>
                  <Badge variant="outline">{analise.breakdown.atraso}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Par/Ímpar</span>
                  <Badge variant="outline">{analise.breakdown.par_impar}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Soma</span>
                  <Badge variant="outline">{analise.breakdown.soma}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Distribuição</span>
                  <Badge variant="outline">{analise.breakdown.distribuicao}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
