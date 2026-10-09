"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dices,
  ArrowLeft,
  Sparkles,
  Target,
  BarChart3,
  Trash2,
  Share2,
  GitCompareArrows,
  TrendingUp,
  Calendar,
  Minus,
  Plus,
  Zap,
  Brain,
  Scale,
  Layers,
  LayoutGrid,
  Hexagon,
  ShieldBan,
  Repeat,
  Lock,
  Cpu,
  CheckCircle2,
  Loader2,
  Coins,
  Save,
} from "lucide-react";
import { LOTERIAS, getPreco, getOpcoesQtd } from "@/lib/loterias";
import { getEstrategiasAtivas } from "@/modules/strategies";
import { ShareGame } from "@/components/lottery/share-game";

interface JogoGerado {
  dezenas: number[];
  score: number;
  breakdown: Record<string, unknown>;
}

const ESTRATEGIA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  quentes: Zap,
  frias: TrendingUp,
  par_impar: Scale,
  soma: BarChart3,
  quadrantes: LayoutGrid,
  delta: Hexagon,
  exclusao_padroes: ShieldBan,
  repeticao_controlada: Repeat,
  fechamento: Lock,
  hibrida_ia: Brain,
};

const ESTRATEGIA_COLORS: Record<string, string> = {
  quentes: "text-orange-500",
  frias: "text-blue-500",
  par_impar: "text-violet-500",
  soma: "text-emerald-500",
  quadrantes: "text-amber-500",
  delta: "text-cyan-500",
  exclusao_padroes: "text-rose-500",
  repeticao_controlada: "text-teal-500",
  fechamento: "text-indigo-500",
  hibrida_ia: "text-fuchsia-500",
};

const LOTERIA_ICONS: Record<string, string> = {
  lotofacil: "⭐",
  lotomania: "🎱",
  megasena: "🏆",
  quina: "💎",
  duplasena: "🔄",
  timemania: "⚽",
  diadesorte: "🌟",
  maismilionaria: "💰",
  supersete: "7️⃣",
};

// Tabela de preços por quantidade de dezenas (Lotofácil 2026)
const DIAS_SEMANA: Record<string, string> = {
  domingo: "Dom",
  segunda: "Seg",
  terca: "Ter",
  quarta: "Qua",
  quinta: "Qui",
  sexta: "Sex",
  sabado: "Sab",
};

function calcularProximoSorteio(dias: string[]): string {
  const agora = new Date();
  const diaAtual = agora.getDay();
  const mapaDia: Record<string, number> = {
    domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
  };
  const diasNumeros = dias.map(d => mapaDia[d]).sort((a, b) => a - b);

  let menorDias = 8;
  for (const d of diasNumeros) {
    let diff = d - diaAtual;
    if (diff <= 0) diff += 7;
    if (diff < menorDias) menorDias = diff;
  }

  const proximo = new Date(agora);
  proximo.setDate(proximo.getDate() + menorDias);
  return proximo.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function GerarPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.loteria as string;
  const estrategias = useMemo(() => getEstrategiasAtivas(), []);

  const loteriaSelecionada = useMemo(() => LOTERIAS.find(l => l.slug === slug), [slug]);

  const [quantidade, setQuantidade] = useState(10);
  const [estrategiaSelecionada, setEstrategiaSelecionada] = useState(estrategias[0]?.slug || "");
  const [scoreMinimo, setScoreMinimo] = useState(60);
  const [jogosGerados, setJogosGerados] = useState<JogoGerado[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loteId, setLoteId] = useState<string | null>(null);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [qtdDezenas, setQtdDezenas] = useState(loteriaSelecionada?.qtd_dezenas_padrao || 6);
  const [isSaving, setIsSaving] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [jogosSalvos, setJogosSalvos] = useState<Set<number>>(new Set());
  const [salvandoParcial, setSalvandoParcial] = useState<Set<number>>(new Set());
  const [resultadoGeracao, setResultadoGeracao] = useState<{ totalGerados: number; totalSolicitado: number; maiorScore: number; relaxado: boolean } | null>(null);
  const [jogosExpandidos, setJogosExpandidos] = useState(true);

  const opcoesQtd = useMemo(() => getOpcoesQtd(slug), [slug]);
  const precoAtual = getPreco(slug, qtdDezenas);

  if (!loteriaSelecionada) {
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
    setGeneratingProgress(0);
    setJogosGerados([]);

    try {
      const response = await fetch(`/api/gerar/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estrategias: [estrategiaSelecionada],
          quantidade,
          score_minimo: scoreMinimo,
          qtd_dezenas: qtdDezenas,
        }),
      });

      if (!response.ok) throw new Error("Erro ao gerar jogos");

      const data = await response.json();
      setJogosGerados(data.jogos);
      setLoteId(data.lote_id);
      // Progresso real: jogos aprovados vs pedidos
      setGeneratingProgress(data.total_solicitado > 0 ? Math.round((data.total_gerados / data.total_solicitado) * 100) : 100);
      setResultadoGeracao({ totalGerados: data.total_gerados, totalSolicitado: data.total_solicitado, maiorScore: data.maior_score_encontrado, relaxado: data.score_relaxado });
    } catch (error) {
      console.error("Erro ao gerar jogos:", error);
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
      }, 300);
    }
  };

  const handleExcluirJogo = (index: number) => {
    setJogosGerados(prev => prev.filter((_, i) => i !== index));
  };

  const handleSalvarTodos = async () => {
    if (jogosGerados.length === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loteria: loteriaSelecionada.id,
          estrategia: estrategiaSelecionada,
          jogos: jogosGerados.map(j => ({ dezenas: j.dezenas, score: j.score })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLoteId(prev => prev || data.lote_id || null);
        setSalvo(true);
        setJogosSalvos(new Set(jogosGerados.map((_, i) => i)));
        setTimeout(() => setSalvo(false), 3000);
      }
    } catch (e) {
      console.error("Erro ao salvar jogos:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSalvarJogo = async (index: number) => {
    const jogo = jogosGerados[index];
    if (!jogo) return;
    setSalvandoParcial(prev => new Set(prev).add(index));
    try {
      const res = await fetch("/api/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loteria: loteriaSelecionada.id,
          estrategia: estrategiaSelecionada,
          jogos: [{ dezenas: jogo.dezenas, score: jogo.score }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLoteId(prev => prev || data.lote_id || null);
        setJogosSalvos(prev => new Set(prev).add(index));
      }
    } catch (e) {
      console.error("Erro ao salvar jogo:", e);
    } finally {
      setSalvandoParcial(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const decrementarQuantidade = () => setQuantidade(prev => Math.max(1, prev - 1));
  const incrementarQuantidade = () => setQuantidade(prev => Math.min(100, prev + 1));

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (score >= 60) return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20";
    return "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20";
  };

  const getScoreDot = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-slate-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Dices className="h-7 w-7 text-primary" />
            Gerar Jogos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Selecione a loteria, escolha uma estratégia e gere jogos otimizados.
          </p>
        </div>

        {/* Lottery Selection Cards */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Escolha a Loteria
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {LOTERIAS.filter(l => l.ativo).map(loteria => {
              const isSelected = loteria.slug === slug;
              return (
                <button
                  key={loteria.slug}
                  onClick={() => router.push(`/gerar/${loteria.slug}`)}
                  className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 text-center group cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
                  }`}
                >
                  <span className="text-3xl mb-2" role="img" aria-label={loteria.nome}>
                    {LOTERIA_ICONS[loteria.slug] || "🎲"}
                  </span>
                  <span className={`text-sm font-semibold leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {loteria.nome}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-1">
                    {loteria.qtd_dezenas_padrao} dezenas
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3 inline" />
                    Próx: {calcularProximoSorteio(loteria.dias_sorteio)}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Quantity of Dezenas Selector */}
        {opcoesQtd.length > 1 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Quantidade de Dezenas por Jogo
            </h2>
            <div className="flex flex-wrap gap-2">
              {opcoesQtd.map(qtd => {
                const preco = getPreco(slug, qtd);
                const isSelected = qtd === qtdDezenas;
                return (
                  <button
                    key={qtd}
                    onClick={() => setQtdDezenas(qtd)}
                    className={`flex flex-col items-center px-3 py-2 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className={`text-sm font-bold ${isSelected ? "text-primary" : ""}`}>
                      {qtd} dezenas
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      R$ {preco.toFixed(2).replace('.', ',')}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Configuration Panel */}
        <section className="mb-8">
          <Card>
            <CardContent className="p-5 sm:p-6 space-y-6">
              {/* Strategy Selection */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Estratégia</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {estrategias.map(estrategia => {
                    const Icon = ESTRATEGIA_ICONS[estrategia.slug] || Zap;
                    const iconColor = ESTRATEGIA_COLORS[estrategia.slug] || "text-muted-foreground";
                    const isSelected = estrategia.slug === estrategiaSelecionada;

                    return (
                      <button
                        key={estrategia.slug}
                        onClick={() => setEstrategiaSelecionada(estrategia.slug)}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30 hover:bg-accent/30"
                        }`}
                      >
                        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${isSelected ? "text-primary" : iconColor}`} />
                        <div className="min-w-0">
                          <span className={`text-sm font-medium block ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {estrategia.nome}
                          </span>
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {estrategia.descricao_curta}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Score + Quantity Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Score Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold">Score Mínimo</label>
                    <span className="text-sm font-bold text-primary tabular-nums">{scoreMinimo}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={scoreMinimo}
                    onChange={e => setScoreMinimo(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-primary
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md
                      [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background
                      [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-sm font-semibold block mb-2">Quantidade de Jogos</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={decrementarQuantidade}
                      disabled={quantidade <= 1}
                      aria-label="Diminuir quantidade"
                      className="h-10 w-10 rounded-full shrink-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <input
                      type="number"
                      value={quantidade}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) setQuantidade(Math.max(1, Math.min(250, val)));
                      }}
                      min={1}
max={250}
                      className="w-16 h-10 text-center text-lg font-bold tabular-nums bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                      aria-label="Quantidade de jogos"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={incrementarQuantidade}
                      disabled={quantidade >= 250}
                      aria-label="Aumentar quantidade"
                      className="h-10 w-10 rounded-full shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground ml-1">até 250</span>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGerar}
                disabled={isGenerating}
                className="w-full h-14 text-lg font-bold rounded-xl transition-all duration-200"
                size="lg"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Gerando jogos...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Dices className="h-5 w-5" />
                    GERAR JOGOS
                  </span>
                )}
              </Button>

              {/* Loading Progress */}
              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Buscando combinações com score ≥ {scoreMinimo}...</span>
                    <span>{Math.round(generatingProgress)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(generatingProgress, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Resultado da geração com progresso real */}
              {!isGenerating && resultadoGeracao && resultadoGeracao.totalSolicitado > 0 && (
                <div className={`space-y-2 rounded-lg border p-3 ${resultadoGeracao.relaxado ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/40 bg-emerald-500/5"}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">
                      {resultadoGeracao.totalGerados} de {resultadoGeracao.totalSolicitado} jogo(s) com score ≥ {scoreMinimo}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      maior score: {resultadoGeracao.maiorScore}
                    </Badge>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${resultadoGeracao.totalSolicitado > 0 ? Math.min(100, (resultadoGeracao.totalGerados / resultadoGeracao.totalSolicitado) * 100) : 0}%` }}
                    />
                  </div>
                  {resultadoGeracao.relaxado ? (
                    <p className="text-xs text-amber-600">
                      Foram gerados {resultadoGeracao.totalGerados} de {resultadoGeracao.totalSolicitado} jogo(s). Os jogos abaixo de {scoreMinimo} foram REJEITADOS — apenas {resultadoGeracao.totalGerados} atingiram a meta. Reduza o score mínimo ou tente novamente para buscar mais.
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-600">
                      Geração concluída: {resultadoGeracao.totalGerados} jogo(s) com score ≥ {scoreMinimo}.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Results */}
        {jogosGerados.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setJogosExpandidos(!jogosExpandidos)}
                className="flex items-center gap-2 hover:bg-accent/40 rounded-lg px-2 py-1 transition-colors cursor-pointer text-left"
              >
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Jogos Gerados
                  <Badge variant="secondary" className="ml-1">
                    {jogosGerados.length}
                  </Badge>
                </h2>
                <span className="text-xs text-muted-foreground">{jogosExpandidos ? "▲ Retrair" : "▼ Expandir"}</span>
              </button>
              <div className="flex items-center gap-2">
                {salvo && (
                  <Badge variant="outline" className="text-xs gap-1 text-emerald-500 border-emerald-500/40">
                    <CheckCircle2 className="h-3 w-3" />
                    Lista salva
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSalvarTodos}
                  disabled={isSaving || jogosGerados.length === 0}
                  className="gap-1.5"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Salvar Todos
                </Button>
              </div>
            </div>

            {jogosExpandidos && (
            <div className="grid gap-3">
              {jogosGerados.map((jogo, index) => (
                <Card key={index} className="group hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Game Number + Dezenas */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground bg-muted rounded-md px-2 py-1 shrink-0">
                          #{index + 1}
                        </span>
                        {jogo.breakdown?.camuflagem === true && (
                          <span
                            title="Jogo camuflado"
                            className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-dashed border-amber-400/60 text-amber-500 text-sm shrink-0"
                          >
                            ✦
                          </span>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {jogo.dezenas.map(d => (
                            <span
                              key={d}
                              className="inline-flex items-center justify-center h-9 min-w-[2.25rem] rounded-full bg-primary/10 text-primary text-sm font-bold tabular-nums border border-primary/20"
                            >
                              {String(d).padStart(2, "0")}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className={`w-2 h-2 rounded-full ${getScoreDot(jogo.score)}`} />
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${getScoreColor(jogo.score)}`}>
                          <Target className="h-3 w-3" />
                          {jogo.score}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={jogosSalvos.has(index) ? "Jogo salvo" : "Salvar jogo"}
                          onClick={() => handleSalvarJogo(index)}
                          disabled={salvandoParcial.has(index)}
                          className={jogosSalvos.has(index) ? "text-emerald-500" : ""}
                        >
                          {salvandoParcial.has(index) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : jogosSalvos.has(index) ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Análise"
                          onClick={() => router.push(`/analise?loteria=${slug}&dezenas=${jogo.dezenas.join(",")}`)}
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Comparar"
                          onClick={() => router.push(`/comparar?loteria=${slug}&dezenas=${jogo.dezenas.join(",")}`)}
                        >
                          <GitCompareArrows className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Compartilhar"
                          onClick={() => {
                            const text = `Meu jogo ${loteriaSelecionada.nome}: ${jogo.dezenas.map(d => String(d).padStart(2, "0")).join(" ")} | Score: ${jogo.score}`;
                            navigator.clipboard.writeText(text).catch(() => {});
                          }}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Excluir"
                          onClick={() => handleExcluirJogo(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}

            {/* ShareGame for top game */}
            {jogosGerados.length > 0 && jogosExpandidos && (
              <div className="mt-4">
                <ShareGame
                  dezenas={jogosGerados[0].dezenas}
                  loteria={loteriaSelecionada.nome}
                  score={jogosGerados[0].score}
                />
              </div>
            )}
          </section>
        )}

        {/* Empty State */}
        {jogosGerados.length === 0 && !isGenerating && (
          <div className="text-center py-16 text-muted-foreground">
            <Dices className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum jogo gerado ainda</p>
            <p className="text-sm mt-1">
              Configure os parâmetros acima e clique em <strong>GERAR JOGOS</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
