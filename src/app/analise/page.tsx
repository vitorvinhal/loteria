"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BarChart3, Target, TrendingUp, Hash, Zap, History, Loader2 } from "lucide-react";
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

interface JogoSalvo {
  id: string;
  loteria: string;
  dezenas: number[];
  score: number | null;
  criado_em: string;
  estrategia: string;
}

export default function AnalisePage() {
  const searchParams = useSearchParams();
  const [loteriaSlug, setLoteriaSlug] = useState("megasena");
  const [dezenasSelecionadas, setDezenasSelecionadas] = useState<number[]>([]);
  const [analise, setAnalise] = useState<AnaliseResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jogosSalvos, setJogosSalvos] = useState<JogoSalvo[]>([]);
  const [jogoSalvoSelecionado, setJogoSalvoSelecionado] = useState<string>("manual");
  const [carregandoJogos, setCarregandoJogos] = useState(false);

  const loteria = LOTERIAS.find(l => l.slug === loteriaSlug);

  // Auto-fill from URL params
  useEffect(() => {
    const loteriaParam = searchParams.get("loteria");
    const dezenasParam = searchParams.get("dezenas");
    if (loteriaParam) setLoteriaSlug(loteriaParam);
    if (dezenasParam) {
      const nums = dezenasParam.split(/[\s,;-]+/).map(Number).filter(n => !isNaN(n));
      setDezenasSelecionadas(nums);
    }
  }, [searchParams]);

  // Fetch saved games when loteria changes
  useEffect(() => {
    const fetchSalvos = async () => {
      setCarregandoJogos(true);
      try {
        const response = await fetch("/api/lotes");
        if (response.ok) {
          const data = await response.json();
          const todos: JogoSalvo[] = [];
          for (const lote of data.lotes || []) {
            for (const jogo of lote.jogos || []) {
              todos.push({
                id: jogo.id,
                loteria: lote.loteria,
                dezenas: jogo.dezenas,
                score: jogo.score,
                criado_em: jogo.criado_em,
                estrategia: lote.estrategia,
              });
            }
          }
          setJogosSalvos(todos);
        }
      } catch (error) {
        console.error("Erro ao carregar jogos salvos:", error);
      } finally {
        setCarregandoJogos(false);
      }
    };
    fetchSalvos();
  }, []);

  const jogosDaLoteria = jogosSalvos.filter(j => j.loteria === loteriaSlug);

  const jogoSelecionado = jogosSalvos.find(j => j.id === jogoSalvoSelecionado);

  useEffect(() => {
    if (jogoSelecionado && jogoSelecionado.loteria === loteriaSlug) {
      setDezenasSelecionadas(jogoSelecionado.dezenas);
    }
  }, [jogoSalvoSelecionado, jogosSalvos, loteriaSlug]);

  const handleLoteriaChange = (slug: string | null) => {
    if (slug) {
      setLoteriaSlug(slug);
      setJogoSalvoSelecionado("manual");
      setDezenasSelecionadas([]);
    }
  };

  const toggleDezena = (numero: number) => {
    setJogoSalvoSelecionado("manual");
    setDezenasSelecionadas(prev =>
      prev.includes(numero) ? prev.filter(n => n !== numero) : [...prev, numero]
    );
  };

  const handleAnalisar = async () => {
    if (!loteria) return;

    const dezenas = dezenasSelecionadas
      .filter(n => n >= loteria.universo_min && n <= loteria.universo_max)
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
          <CardDescription>Selecione a loteria e escolha as dezenas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Loteria</Label>
            <Select value={loteriaSlug} onValueChange={handleLoteriaChange}>
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

          <Separator />

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Jogos Salvos
            </Label>
            <div className="flex items-center gap-2">
              <Select
                value={jogoSalvoSelecionado}
                onValueChange={(v) => v && setJogoSalvoSelecionado(v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um jogo salvo ou digite manualmente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Digitar manualmente</SelectItem>
                  {carregandoJogos ? (
                    <SelectItem value="loading" disabled>
                      <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                      Carregando...
                    </SelectItem>
                  ) : jogosDaLoteria.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      Nenhum jogo salvo para esta loteria
                    </SelectItem>
                  ) : (
                    jogosDaLoteria
                      .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
                      .map(j => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.dezenas.map(d => String(d).padStart(2, "0")).join(" - ")}
                          {j.score !== null && ` | Score: ${j.score}`}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              {jogoSelecionado && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setJogoSalvoSelecionado("manual");
                    setDezenasSelecionadas([]);
                  }}
                >
                  Limpar
                </Button>
              )}
            </div>
            {jogoSelecionado && (
              <p className="text-xs text-muted-foreground">
                Criado em {new Date(jogoSelecionado.criado_em).toLocaleDateString("pt-BR")} — {jogoSelecionado.estrategia}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Dezenas
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                {dezenasSelecionadas.length} selecionada{dezenasSelecionadas.length !== 1 ? "s" : ""}
                {loteria && ` / ${loteria.qtd_dezenas_padrao}`}
              </span>
            </Label>

            {dezenasSelecionadas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {dezenasSelecionadas.sort((a, b) => a - b).map(d => (
                  <Badge
                    key={d}
                    variant="secondary"
                    className="text-sm px-2.5 py-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => toggleDezena(d)}
                  >
                    {String(d).padStart(2, "0")}
                    <span className="ml-1 text-xs opacity-60">✕</span>
                  </Badge>
                ))}
              </div>
            )}

            {loteria && (
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                {Array.from(
                  { length: loteria.universo_max - loteria.universo_min + 1 },
                  (_, i) => loteria.universo_min + i
                ).map(numero => {
                  const isSelected = dezenasSelecionadas.includes(numero);
                  const atLimit = !isSelected && loteria && dezenasSelecionadas.length >= loteria.qtd_dezenas_padrao;
                  return (
                    <button
                      key={numero}
                      type="button"
                      disabled={atLimit}
                      onClick={() => toggleDezena(numero)}
                      className={`h-9 rounded-lg text-sm font-bold tabular-nums transition-all duration-150 cursor-pointer
                        ${isSelected
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                          : atLimit
                            ? "bg-muted/50 text-muted-foreground/40 cursor-not-allowed"
                            : "bg-muted/70 text-foreground hover:bg-primary/15 hover:text-primary hover:scale-105"
                        }`}
                    >
                      {String(numero).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {loteria && `Mínimo ${loteria.qtd_dezenas_min} dezenas — clique para selecionar, clique novamente para remover`}
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
