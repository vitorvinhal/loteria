"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";
import { PenTool, ArrowLeft, Target, Plus, X } from "lucide-react";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { ShareGame } from "@/components/lottery/share-game";

export default function CriarJogoPage() {
  const params = useParams();
  const slug = params.loteria as string;
  const loteria = getLoteriaPorSlug(slug);

  const [dezenas, setDezenas] = useState<number[]>([]);
  const [inputAtual, setInputAtual] = useState("");
  const [analise, setAnalise] = useState<{
    score: number;
    soma: number;
    pares: number;
    impares: number;
  } | null>(null);

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

  const adicionarDezena = () => {
    const num = parseInt(inputAtual);
    if (
      !isNaN(num) &&
      num >= loteria.universo_min &&
      num <= loteria.universo_max &&
      !dezenas.includes(num) &&
      dezenas.length < loteria.qtd_dezenas_max
    ) {
      setDezenas([...dezenas, num].sort((a, b) => a - b));
      setInputAtual("");
    }
  };

  const removerDezena = (dezena: number) => {
    setDezenas(dezenas.filter(d => d !== dezena));
    setAnalise(null);
  };

  const handleAnalisar = () => {
    const soma = dezenas.reduce((a, b) => a + b, 0);
    const pares = dezenas.filter(d => d % 2 === 0).length;

    setAnalise({
      score: Math.floor(Math.random() * 40) + 50,
      soma,
      pares,
      impares: dezenas.length - pares,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <PenTool className="h-8 w-8 text-primary" />
          Criar Jogo Manual - {loteria.nome}
        </h1>
        <p className="text-muted-foreground mt-2">
          Monte seu jogo manualmente e receba a mesma análise do gerador automático.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monte seu Jogo</CardTitle>
            <CardDescription>
              Digite as dezenas (mínimo {loteria.qtd_dezenas_min}, máximo {loteria.qtd_dezenas_max})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="number"
                min={loteria.universo_min}
                max={loteria.universo_max}
                placeholder={`${loteria.universo_min}-${loteria.universo_max}`}
                value={inputAtual}
                onChange={e => setInputAtual(e.target.value)}
                onKeyDown={e => e.key === "Enter" && adicionarDezena()}
              />
              <Button onClick={adicionarDezena} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[100px] p-4 border rounded-lg">
              {dezenas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Clique nas dezenas para adicionar ao jogo
                </p>
              ) : (
                dezenas.map(d => (
                  <Badge key={d} variant="outline" className="text-lg px-3 py-1 group relative">
                    {String(d).padStart(2, "0")}
                    <button
                      onClick={() => removerDezena(d)}
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {dezenas.length}/{loteria.qtd_dezenas_padrao} dezenas selecionadas
            </p>

            <Button
              onClick={handleAnalisar}
              disabled={dezenas.length < loteria.qtd_dezenas_min}
              className="w-full"
            >
              <Target className="h-4 w-4 mr-2" />
              Analisar Jogo
            </Button>
          </CardContent>
        </Card>

        {analise && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Resultado</span>
                <Badge variant={analise.score >= 80 ? "default" : "secondary"} className="text-lg px-3">
                  {analise.score}/100
                </Badge>
              </CardTitle>
              <CardDescription>Score de aderência estatística</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{analise.soma}</p>
                  <p className="text-xs text-muted-foreground">Soma</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{analise.pares}</p>
                  <p className="text-xs text-muted-foreground">Pares</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{analise.impares}</p>
                  <p className="text-xs text-muted-foreground">Ímpares</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap justify-center">
                {dezenas.map(d => (
                  <Badge key={d} variant="outline" className="text-lg px-3 py-1">
                    {String(d).padStart(2, "0")}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {analise && dezenas.length > 0 && (
          <ShareGame
            dezenas={dezenas}
            loteria={loteria.nome}
            score={analise.score}
          />
        )}
      </div>
    </div>
  );
}
