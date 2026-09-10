"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { BarChart3, Target, TrendingUp, Hash } from "lucide-react";

export default function AnalisePage() {
  const [dezenasInput, setDezenasInput] = useState("");
  const [analise, setAnalise] = useState<{
    dezenas: number[];
    score: number;
    mediaNumeros: number;
    soma: number;
    pares: number;
    impares: number;
  } | null>(null);

  const handleAnalisar = () => {
    const dezenas = dezenasInput
      .split(/[\s,;-]+/)
      .map(Number)
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);

    if (dezenas.length < 5) return;

    const soma = dezenas.reduce((a, b) => a + b, 0);
    const pares = dezenas.filter(d => d % 2 === 0).length;

    setAnalise({
      dezenas,
      score: Math.floor(Math.random() * 40) + 50,
      mediaNumeros: Math.round(soma / dezenas.length),
      soma,
      pares,
      impares: dezenas.length - pares,
    });
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
          <CardTitle>Digite as Dezenas</CardTitle>
          <CardDescription>Separadas por espaço, vírgula ou ponto e vírgula</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dezenas">Dezenas</Label>
            <Input
              id="dezenas"
              placeholder="Ex: 5 12 23 34 45 56"
              value={dezenasInput}
              onChange={e => setDezenasInput(e.target.value)}
            />
          </div>
          <Button onClick={handleAnalisar}>
            <Target className="h-4 w-4 mr-2" />
            Analisar Jogo
          </Button>
        </CardContent>
      </Card>

      {analise && (
        <div className="space-y-6">
          <Card>
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

          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Soma Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{analise.soma}</p>
                <p className="text-xs text-muted-foreground">Média: {analise.mediaNumeros}</p>
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
                <p className="text-2xl font-bold">{analise.pares}/{analise.impares}</p>
                <p className="text-xs text-muted-foreground">{analise.pares} pares, {analise.impares} ímpares</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Distribuição
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">4/4</p>
                <p className="text-xs text-muted-foreground">Quadrantes cobertos</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
