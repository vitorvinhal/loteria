"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { BarChart3, Target, TrendingUp, Hash, Zap, History, Loader2, Save, CheckCircle2, PenLine, X, ChevronDown, ChevronRight, User, Layers } from "lucide-react";
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
  nome?: string | null;
}

interface LoteSalvo {
  id: string;
  loteria: string;
  criado_em: string;
  estrategia: string;
  criado_por: string | null;
  criador_avatar_url: string | null;
  usuario_pode_excluir: boolean;
  jogos: JogoSalvo[];
}

export default function AnalisePage() {
  const searchParams = useSearchParams();
  const [loteriaSlug, setLoteriaSlug] = useState("todas");
  const [dezenasSelecionadas, setDezenasSelecionadas] = useState<number[]>([]);
  const [analise, setAnalise] = useState<AnaliseResult | null>(null);
  const [analises, setAnalises] = useState<AnaliseResult[]>([]);
  const [analisandoLote, setAnalisandoLote] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lotesSalvos, setLotesSalvos] = useState<LoteSalvo[]>([]);
  const [jogoSalvoSelecionado, setJogoSalvoSelecionado] = useState<string>("manual");
  const [carregandoJogos, setCarregandoJogos] = useState(false);
  const [nomeJogo, setNomeJogo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [editandoJogo, setEditandoJogo] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todos" | "7" | "30">("todos");

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
    fetchJogosSalvos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jogosDaLoteria = lotesSalvos.flatMap((lote) => lote.jogos).filter(j => j.loteria === loteriaSlug);

  const lotesFiltrados = lotesSalvos.filter((lote) => {
    if (loteriaSlug !== "todas" && lote.loteria !== loteriaSlug) return false;
    if (filtroPeriodo === "todos") return true;
    const dias = parseInt(filtroPeriodo, 10);
    const limite = Date.now() - dias * 86400000;
    return new Date(lote.criado_em).getTime() >= limite;
  });

  const jogoSelecionado = jogosDaLoteria.find(j => j.id === jogoSalvoSelecionado);

  useEffect(() => {
    if (jogoSelecionado && jogoSelecionado.loteria === loteriaSlug) {
      setDezenasSelecionadas(jogoSelecionado.dezenas);
    }
  }, [jogoSalvoSelecionado, jogosDaLoteria.length, loteriaSlug]);

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

  const handleSalvarJogo = async () => {
    if (!loteria || dezenasSelecionadas.length < loteria.qtd_dezenas_min) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loteria: loteria.id,
          estrategia: "manual",
          jogos: [{ dezenas: dezenasSelecionadas, score: analise?.score || null, nome: nomeJogo.trim() || null }],
        }),
      });

      if (res.ok) {
        setSalvo(true);
        setNomeJogo("");
        setTimeout(() => { setSalvo(false); fetchJogosSalvos(); }, 500);
      }
    } catch (e) {
      console.error("Erro ao salvar jogo:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchJogosSalvos = async () => {
    setCarregandoJogos(true);
    try {
      const response = await fetch("/api/lotes");
      if (response.ok) {
        const data = await response.json();
        const lotes: LoteSalvo[] = (data.lotes || []).map((lote: any) => ({
          id: lote.id,
          loteria: lote.loteria || lote.loteria_id,
          criado_em: lote.criado_em,
          estrategia: lote.estrategia || "manual",
          criado_por: lote.criado_por || null,
          criador_avatar_url: lote.criador_avatar_url || null,
          usuario_pode_excluir: lote.usuario_pode_excluir || false,
          jogos: (lote.jogos || []).map((j: any) => ({
            id: j.id,
            loteria: lote.loteria || lote.loteria_id,
            dezenas: j.dezenas || [],
            score: j.score ?? null,
            criado_em: j.criado_em,
            estrategia: lote.estrategia || "manual",
            nome: j.nome || null,
          })),
        }));
        setLotesSalvos(lotes);
      }
    } catch (error) {
      console.error("Erro ao carregar jogos salvos:", error);
    } finally {
      setCarregandoJogos(false);
    }
  };

  const handleBuscarJogo = async (id: string) => {
    const jogo = jogosDaLoteria.find(j => j.id === id);
    if (jogo) {
      setDezenasSelecionadas([...jogo.dezenas].sort((a, b) => a - b));
      handleLoteriaChange(jogo.loteria);
    }
  };

  const analisarUm = async (jogo: JogoSalvo) => {
    const loteLoteria = LOTERIAS.find(l => l.slug === jogo.loteria);
    if (!loteLoteria) return;
    const dezenas = [...jogo.dezenas].sort((a, b) => a - b);
    if (dezenas.length < loteLoteria.qtd_dezenas_min) return;
    setDezenasSelecionadas(dezenas);
    setJogoSalvoSelecionado(jogo.id);
    setAnalise(null);
    setAnalises([]);
    setIsAnalyzing(true);
    const res = await fetch(`/api/analisar/${jogo.loteria}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dezenas }),
    });
    if (res.ok) {
      const data = await res.json();
      setAnalise(data);
    }
    setIsAnalyzing(false);
  };

  const analisarLote = async (lote: LoteSalvo) => {
    const loteLoteria = LOTERIAS.find(l => l.slug === lote.loteria);
    if (!loteLoteria || lote.jogos.length === 0) return;
    setAnalisandoLote(true);
    setAnalise(null);
    setAnalises([]);
    const resultados: AnaliseResult[] = [];
    for (const jogo of lote.jogos) {
      const dezenas = [...jogo.dezenas].sort((a, b) => a - b);
      if (dezenas.length < loteLoteria.qtd_dezenas_min) continue;
      try {
        const res = await fetch(`/api/analisar/${lote.loteria}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dezenas }),
        });
        if (res.ok) {
          resultados.push(await res.json());
        }
      } catch { /* continua */ }
    }
    setAnalises(resultados);
    setAnalisandoLote(false);
  };

  const handleRenomear = async (id: string) => {
    const nome = nomeEdicao.trim();
    if (!nome) return;
    try {
      const res = await fetch(`/api/lotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      if (res.ok) {
        setLotesSalvos(prev => prev.map(lote => ({
          ...lote,
          jogos: lote.jogos.map(j => j.id === id ? { ...j, nome } : j),
        })));
        setEditandoJogo(null);
        setNomeEdicao("");
      }
    } catch (e) {
      console.error("Erro ao renomear:", e);
    }
  };

  const formatarData = (dataISO: string) => {
    const d = new Date(dataISO);
    return `em ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })} ${d.toLocaleDateString("pt-BR", { weekday: "long" })}`;
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
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Loteria</Label>
            <Select value={loteriaSlug} onValueChange={handleLoteriaChange}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="todas" className="py-2.5">
                  <span className="font-medium">Todas as loterias</span>
                </SelectItem>
                {LOTERIAS.map(l => (
                  <SelectItem key={l.slug} value={l.slug} className="py-2.5">
                    <span className="font-medium">{l.nome}</span>
                    <span className="ml-2 text-xs text-muted-foreground">({l.universo_min}–{l.universo_max})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Lotes de Jogos Salvos
              </span>
              <Badge variant="outline" className="text-xs font-normal">{lotesFiltrados.length} lote(s)</Badge>
            </Label>

            {/* Filtro por período */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 seg-filter">
              {([["todos", "Tudo"], ["7", "7 dias"], ["30", "30 dias"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFiltroPeriodo(val)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    filtroPeriodo === val ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {carregandoJogos ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando jogos salvos...
              </div>
            ) : lotesFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhum lote salvo para esta loteria neste período.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 rounded-lg">
                {lotesFiltrados
                  .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
                  .map(lote => (
                    <div key={lote.id} className="border rounded-lg overflow-hidden">
                      {/* Cabeçalho do lote */}
                      <div className="p-3 bg-muted/30 border-b space-y-2">
                        <div className="flex items-center gap-2">
                          {lote.criador_avatar_url ? (
                            <img
                              src={lote.criador_avatar_url}
                              alt="Foto"
                              className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                            />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                              <User className="h-4 w-4" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">
                              {lote.criado_por || "Anônimo"}
                            </p>
                            <p className="text-[11px] text-muted-foreground capitalize">
                              {formatarData(lote.criado_em)} · {lote.jogos.length} jogo(s)
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            <Layers className="h-3 w-3 mr-1" />
                            Lote
                          </Badge>
                        </div>
                        {lote.jogos.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); analisarUm(lote.jogos[0]); }}
                              className="flex-1 min-w-0 px-3 py-2 rounded-md text-xs font-semibold bg-muted text-muted-foreground hover:bg-accent transition-colors whitespace-nowrap"
                            >
                              Analisar 1º jogo
                            </button>
                            <button
                              type="button"
                              disabled={analisandoLote}
                              onClick={(e) => { e.stopPropagation(); analisarLote(lote); }}
                              className="flex-1 min-w-0 px-3 py-2 rounded-md text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {analisandoLote ? "Analisando..." : "Analisar Lote Todo"}
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Jogos do lote */}
                      <div className="divide-y">
                        {lote.jogos.map(j => (
                          <button
                            key={j.id}
                            type="button"
                            onClick={() => { setJogoSalvoSelecionado(j.id); handleBuscarJogo(j.id); }}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                              jogoSalvoSelecionado === j.id
                                ? "bg-primary/10"
                                : "hover:bg-accent/50"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {j.score !== null && (
                                <Badge variant={j.score >= 80 ? "default" : "secondary"} className="text-xs shrink-0 min-w-[2.5rem] justify-center">
                                  {j.score}
                                </Badge>
                              )}
                              <div className="min-w-0 flex-1 overflow-x-auto flex gap-1 items-center py-0.5">
                                {j.dezenas.map(d => (
                                  <span key={d} className="inline-flex items-center justify-center h-7 min-w-[1.75rem] rounded-full bg-muted text-foreground text-xs font-bold tabular-nums shrink-0">
                                    {String(d).padStart(2, "0")}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); setJogoSalvoSelecionado(j.id); analisarUm(j); }}
                                className="p-2 rounded-md hover:bg-primary/10 text-primary"
                                title="Analisar este jogo"
                              >
                                <BarChart3 className="h-4 w-4" />
                              </span>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); setEditandoJogo(j.id); setNomeEdicao(j.nome || ""); }}
                                className="p-2 rounded-md hover:bg-muted"
                                title="Renomear"
                              >
                                <PenLine className="h-4 w-4 text-muted-foreground" />
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                      {/* Renomear inline */}
                      {editandoJogo && lote.jogos.some(j => j.id === editandoJogo) && (
                        <div className="flex items-center gap-2 p-2 border-t bg-background/50" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={nomeEdicao}
                            onChange={e => setNomeEdicao(e.target.value)}
                            placeholder="Nome do jogo"
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Button size="sm" variant="outline" onClick={() => handleRenomear(editandoJogo)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditandoJogo(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <Separator />

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
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/30">
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
              <div className="p-3 rounded-xl border border-muted bg-card/50">
                <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
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
                        className={`aspect-square rounded-full text-sm font-bold tabular-nums transition-all duration-150 cursor-pointer flex items-center justify-center
                          ${isSelected
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110 ring-2 ring-primary/40"
                            : atLimit
                              ? "bg-muted/40 text-muted-foreground/30 cursor-not-allowed"
                              : "bg-muted text-foreground hover:bg-primary/15 hover:text-primary hover:scale-110 hover:shadow-md border border-border/50"
                          }`}
                      >
                        {String(numero).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {loteria && `Mínimo ${loteria.qtd_dezenas_min} dezenas — clique para selecionar, clique novamente para remover`}
            </p>
          </div>

          <Button onClick={handleAnalisar} disabled={isAnalyzing} className="w-full h-11">
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

          {dezenasSelecionadas.length >= (loteria?.qtd_dezenas_min || 0) && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Este Jogo
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={nomeJogo}
                    onChange={e => setNomeJogo(e.target.value)}
                    placeholder="Dê um nome ao jogo (opcional)"
                    className="flex-1"
                    maxLength={80}
                  />
                  <Button
                    onClick={handleSalvarJogo}
                    disabled={isSaving || dezenasSelecionadas.length < (loteria?.qtd_dezenas_min || 0)}
                    variant={salvo ? "default" : "outline"}
                    className="gap-1.5 shrink-0"
                  >
                    {salvo ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {salvo ? "Salvo!" : "Salvar"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ao salvar, o jogo aparecerá na lista "Jogos Salvos" com a data da geração.
                </p>
              </div>
            </>
          )}
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

      {/* Resultado do Lote Completo */}
      {analises.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Análise do Lote
            <Badge variant="outline">{analises.length} jogos</Badge>
          </h2>
          <div className="grid gap-3">
            {analises.map((a, i) => (
              <Card key={i} className={a.score >= 80 ? "border-emerald-500/40" : a.score >= 60 ? "border-amber-500/40" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <span className="text-sm font-semibold">Jogo #{i + 1}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={a.score >= 80 ? "default" : a.score >= 60 ? "secondary" : "outline"} className="text-sm">
                        {a.score}/100
                      </Badge>
                      <Button variant="ghost" size="icon-sm" title="Usar dezenas" onClick={() => { setDezenasSelecionadas([...a.dezenas]); }}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.dezenas.map(d => (
                      <span key={d} className="inline-flex items-center justify-center h-8 min-w-[2rem] rounded-full bg-primary/10 text-primary text-xs font-bold">{String(d).padStart(2, "0")}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-muted-foreground">
                    <span>Soma: {a.estatisticas.soma}</span>
                    <span>Par/Ímpar: {a.estatisticas.pares}/{a.estatisticas.impares}</span>
                    <span>Sequências: {a.estatisticas.sequencias}</span>
                    <span>Spread: {a.estatisticas.spread}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
