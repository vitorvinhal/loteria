"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, PenTool, Target, RotateCcw, CheckCircle2 } from "lucide-react";
import { getLoteriaPorSlug } from "@/lib/loterias";
import { ShareGame } from "@/components/lottery/share-game";

interface Analise {
  score: number;
  soma: number;
  pares: number;
  impares: number;
  melhorEstrategia: string;
}

const ESTRATEGIAS = [
  { nome: "Paridade Equilibrada", descricao: "Equilíbrio entre pares e ímpares" },
  { nome: "Soma Ideal", descricao: "Soma dentro da faixa estatística" },
  { nome: "Distribuição Uniforme", descricao: "Dezenas distribuídas no universo" },
  { nome: "Sequências Evitadas", descricao: "Evita números consecutivos" },
  { nome: "Zonas Cobertas", descricao: "Cobertura ampla do universo" },
];

export default function CriarJogoPage() {
  const params = useParams();
  const slug = params.loteria as string;
  const loteria = getLoteriaPorSlug(slug);

  const [dezenas, setDezenas] = useState<number[]>([]);
  const [analise, setAnalise] = useState<Analise | null>(null);

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

  const todosNumeros = useMemo(() => {
    const nums: number[] = [];
    for (let i = loteria.universo_min; i <= loteria.universo_max; i++) {
      nums.push(i);
    }
    return nums;
  }, [loteria.universo_min, loteria.universo_max]);

  const toggleDezena = (num: number) => {
    setAnalise(null);
    if (dezenas.includes(num)) {
      setDezenas(dezenas.filter((d) => d !== num));
    } else if (dezenas.length < loteria.qtd_dezenas_max) {
      setDezenas([...dezenas, num].sort((a, b) => a - b));
    }
  };

  const limparSelecao = () => {
    setDezenas([]);
    setAnalise(null);
  };

  const selecionarAleatorio = () => {
    const copia = [...todosNumeros];
    const selecionadas: number[] = [];
    for (let i = 0; i < loteria.qtd_dezenas_padrao; i++) {
      const idx = Math.floor(Math.random() * copia.length);
      selecionadas.push(copia.splice(idx, 1)[0]);
    }
    setDezenas(selecionadas.sort((a, b) => a - b));
    setAnalise(null);
  };

  const handleAnalisar = () => {
    const soma = dezenas.reduce((a, b) => a + b, 0);
    const pares = dezenas.filter((d) => d % 2 === 0).length;
    const impares = dezenas.length - pares;
    const paridadeBalance = 100 - Math.abs(pares - impares) * 5;
    const somaScore = soma >= loteria.universo_min * dezenas.length * 0.3 ? 90 : 70;
    const score = Math.floor((paridadeBalance + somaScore) / 2);

    const idxEstrategia = Math.floor(score / 25);
    const melhorEstrategia = ESTRATEGIAS[Math.min(idxEstrategia, ESTRATEGIAS.length - 1)].nome;

    setAnalise({ score, soma, pares, impares, melhorEstrategia });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excelente";
    if (score >= 60) return "Bom";
    return "Baixo";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <PenTool className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Criar Jogo</h1>
              <p className="text-sm text-muted-foreground">{loteria.nome}</p>
            </div>
          </div>
        </div>

        {/* Selection Status Bar */}
        <div className="mb-4 p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Dezenas selecionadas
            </span>
            <span className="text-sm font-bold">
              <span className={dezenas.length === loteria.qtd_dezenas_padrao ? "text-emerald-500" : ""}>
                {dezenas.length}
              </span>
              <span className="text-muted-foreground"> / {loteria.qtd_dezenas_padrao}</span>
            </span>
          </div>

          {/* Selected Badges */}
          {dezenas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {dezenas.map((d) => (
                <Badge
                  key={d}
                  variant="default"
                  className="h-8 min-w-[2rem] px-2 text-sm font-mono cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleDezena(d)}
                >
                  {String(d).padStart(2, "0")}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Clique nos números abaixo para selecionar
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={limparSelecao}
            disabled={dezenas.length === 0}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={selecionarAleatorio}
            className="gap-1.5"
          >
            <Target className="h-3.5 w-3.5" />
            Aleatório
          </Button>
        </div>

        {/* Number Grid */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${loteria.universo_max >= 100 ? "2.25rem" : "2.75rem"}, 1fr))`,
              }}
            >
              {todosNumeros.map((num) => {
                const isSelected = dezenas.includes(num);
                return (
                  <button
                    key={num}
                    onClick={() => toggleDezena(num)}
                    disabled={!isSelected && dezenas.length >= loteria.qtd_dezenas_max}
                    className={`
                      aspect-square rounded-full text-sm font-mono font-medium
                      transition-all duration-150 border-2
                      ${isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                        : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                      }
                      ${!isSelected && dezenas.length >= loteria.qtd_dezenas_max
                        ? "opacity-40 cursor-not-allowed"
                        : "cursor-pointer active:scale-95"
                      }
                    `}
                  >
                    {String(num).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Analyze Button */}
        <Button
          onClick={handleAnalisar}
          disabled={dezenas.length < loteria.qtd_dezenas_min}
          className="w-full h-12 text-base font-semibold mb-6 gap-2"
        >
          <Target className="h-5 w-5" />
          Analisar Jogo
        </Button>

        {/* Results */}
        {analise && (
          <div className="space-y-4 mb-6">
            {/* Score Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Score de Aderência</p>
                    <p className={`text-3xl font-bold ${getScoreColor(analise.score)}`}>
                      {analise.score}
                      <span className="text-lg text-muted-foreground">/100</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={analise.score >= 80 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {getScoreLabel(analise.score)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xl font-bold">{analise.soma}</p>
                    <p className="text-xs text-muted-foreground">Soma</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xl font-bold">{analise.pares}</p>
                    <p className="text-xs text-muted-foreground">Pares</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xl font-bold">{analise.impares}</p>
                    <p className="text-xs text-muted-foreground">Ímpares</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strategies */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Estratégias Aplicadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ESTRATEGIAS.slice(0, 4).map((estrategia, i) => (
                    <div
                      key={estrategia.nome}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{estrategia.nome}</p>
                          <p className="text-xs text-muted-foreground">{estrategia.descricao}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {estrategia.nome === analise.melhorEstrategia ? "Principal" : "Aplicada"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Selected Numbers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Seu Jogo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {dezenas.map((d) => (
                    <Badge key={d} variant="default" className="h-9 min-w-[2.25rem] px-2 text-sm font-mono">
                      {String(d).padStart(2, "0")}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Share */}
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
