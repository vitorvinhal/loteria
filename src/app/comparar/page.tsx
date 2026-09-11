"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitCompare, CheckCircle2, XCircle, Trophy, BarChart3, Loader2, User } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";
import type { Loteria, Concurso } from "@/types";

interface GradeAcerto {
  nome: string;
  qtd: number;
  descricao: string;
}

interface ComparacaoResultado {
  nome?: string;
  dezenas: number[];
  acertos: number[];
  erros: number[];
  percentual: number;
  grades: GradeAcerto[];
  estatisticas: { soma: number; pares: number; impares: number; sequencias: number; maiorSequencia: number };
  premioEstimado: string;
  valorPremio: number;
}

interface LoteFromAPI {
  id: string;
  loteria: string;
  nome: string;
  criado_em: string;
  criado_por: string | null;
  criador_avatar_url: string | null;
  jogos: { id: string; dezenas: number[]; score: number | null; nome?: string | null }[];
}

function calcularEstatisticas(dezenas: number[]) {
  const soma = dezenas.reduce((a, b) => a + b, 0);
  const pares = dezenas.filter((d) => d % 2 === 0).length;
  const impares = dezenas.length - pares;
  const sorted = [...dezenas].sort((a, b) => a - b);
  let sequencias = 0;
  let maiorSequencia = 0;
  let atual = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) { atual++; }
    else { if (atual >= 2) sequencias++; maiorSequencia = Math.max(maiorSequencia, atual); atual = 1; }
  }
  if (atual >= 2) { sequencias++; maiorSequencia = Math.max(maiorSequencia, atual); }
  return { soma, pares, impares, sequencias, maiorSequencia };
}

function calcularGrades(acertos: number, loteria: Loteria): GradeAcerto[] {
  const nomesGrades: Record<string, GradeAcerto[]> = {
    megasena: [
      { nome: "Sena", qtd: 6, descricao: "6 acertos - Prêmio máximo" },
      { nome: "Quina", qtd: 5, descricao: "5 acertos" },
      { nome: "Quadra", qtd: 4, descricao: "4 acertos" },
    ],
    quina: [
      { nome: "Quina", qtd: 5, descricao: "5 acertos - Prêmio máximo" },
      { nome: "4 acertos", qtd: 4, descricao: "4 acertos" },
      { nome: "3 acertos", qtd: 3, descricao: "3 acertos" },
      { nome: "2 acertos", qtd: 2, descricao: "2 acertos" },
    ],
    lotofacil: [
      { nome: "15 acertos", qtd: 15, descricao: "15 acertos - Prêmio máximo" },
      { nome: "14 acertos", qtd: 14, descricao: "14 acertos" },
      { nome: "13 acertos", qtd: 13, descricao: "13 acertos" },
      { nome: "12 acertos", qtd: 12, descricao: "12 acertos" },
      { nome: "11 acertos", qtd: 11, descricao: "11 acertos" },
    ],
    lotomania: [
      { nome: "20 acertos", qtd: 20, descricao: "20 acertos - Prêmio máximo" },
      { nome: "19 acertos", qtd: 19, descricao: "19 acertos" },
      { nome: "18 acertos", qtd: 18, descricao: "18 acertos" },
      { nome: "17 acertos", qtd: 17, descricao: "17 acertos" },
      { nome: "16 acertos", qtd: 16, descricao: "16 acertos" },
      { nome: "15 acertos", qtd: 15, descricao: "15 acertos" },
      { nome: "0 acertos", qtd: 0, descricao: "0 acertos - Prêmio especial" },
    ],
  };
  const grades = nomesGrades[loteria.id] || [];
  return grades.filter((g) => acertos >= g.qtd && g.qtd > 0).slice(0, 1);
}

function estimarPremio(acertos: number, loteria: Loteria): { texto: string; valor: number } {
  const regra = loteria.regras_vitoria.find((r) => acertos >= r.acertos_min && acertos <= r.acertos_max);
  return { texto: regra ? regra.descricao : "Sem premiação", valor: 0 };
}

function compararJogo(dezenas: number[], resultado: Concurso, loteria: Loteria, nome?: string): ComparacaoResultado {
  const resultadoSet = new Set(resultado.dezenas_sorteadas);
  const acertos = dezenas.filter((d) => resultadoSet.has(d)).sort((a, b) => a - b);
  const erros = dezenas.filter((d) => !resultadoSet.has(d)).sort((a, b) => a - b);
  const percentual = dezenas.length > 0 ? Math.round((acertos.length / dezenas.length) * 100) : 0;
  const grades = calcularGrades(acertos.length, loteria);
  const estatisticas = calcularEstatisticas(dezenas);
  const premio = estimarPremio(acertos.length, loteria);
  return { nome, dezenas, acertos, erros, percentual, grades, estatisticas, premioEstimado: premio.texto, valorPremio: premio.valor };
}

type ModoComparacao = "manual" | "lote";

export default function CompararPage() {
  const searchParams = useSearchParams();
  const [loteriaSlug, setLoteriaSlug] = useState("lotofacil");
  const [modoComparacao, setModoComparacao] = useState<ModoComparacao>("manual");
  const [dezenasSelecionadas, setDezenasSelecionadas] = useState<number[]>([]);
  const [resultado, setResultado] = useState<Concurso | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [comparacoes, setComparacoes] = useState<ComparacaoResultado[]>([]);
  const [lotes, setLotes] = useState<LoteFromAPI[]>([]);
  const [loteSelecionadoId, setLoteSelecionadoId] = useState("");
  const [carregandoLotes, setCarregandoLotes] = useState(false);
  const [jogoSelecionadoId, setJogoSelecionadoId] = useState<string>("");
  const [loteDaUrl, setLoteDaUrl] = useState<string | null>(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todos" | "7" | "30">("todos");
  const [filtroLoteria, setFiltroLoteria] = useState<string>('');
  const [filtroNome, setFiltroNome] = useState<string>('');
  const loteria = LOTERIAS.find((l) => l.slug === loteriaSlug) || LOTERIAS[0];

  const carregarLotes = useCallback(async () => {
    setCarregandoLotes(true);
    try {
      const res = await fetch("/api/lotes");
      if (res.ok) { const data = await res.json(); setLotes(data.lotes || []); }
    } catch {} finally { setCarregandoLotes(false); }
  }, []);

  useEffect(() => { carregarLotes(); }, [carregarLotes]);

  const buscarResultado = useCallback(async () => {
    setCarregando(true); setErro(null); setComparacoes([]);
    try {
      const res = await fetch(`/api/sync/${loteria.slug}`);
      if (!res.ok) throw new Error("Erro ao buscar resultado");
      const data = await res.json();
      setResultado(data.concurso);
    } catch { setErro("Não foi possível buscar o resultado."); }
    finally { setCarregando(false); }
  }, [loteria.slug]);

  useEffect(() => { buscarResultado(); setComparacoes([]); setDezenasSelecionadas([]); setLoteSelecionadoId(""); }, [buscarResultado]);

  useEffect(() => {
    const loteId = searchParams.get("loteId");
    const loteriaParam = searchParams.get("loteria");
    if (loteId) {
      setLoteDaUrl(loteId);
      setModoComparacao("lote");
      if (loteriaParam) setLoteriaSlug(loteriaParam);
    }
  }, [searchParams]);

  // Compara o lote vindo da URL automaticamente quando os dados carregam
  useEffect(() => {
    if (!loteDaUrl || !resultado) return;
    if (carregandoLotes) return;
    const lote = lotes.find((l) => l.id === loteDaUrl);
    if (!lote) return;
    const loteLoteria = LOTERIAS.find((x) => x.id === lote.loteria) || loteria;
    setLoteriaSlug(loteLoteria.slug);
    setModoComparacao("lote");
    setComparacoes(lote.jogos.map((j) => compararJogo(j.dezenas, resultado, loteLoteria, j.nome || j.id.slice(0, 8))));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteDaUrl, resultado, carregandoLotes, lotes]);

  const compararLoteInteiro = async (loteId: string) => {
    const lote = lotes.find((l) => l.id === loteId);
    if (!lote) return;
    const loteLoteria = LOTERIAS.find((x) => x.id === lote.loteria) || loteria;
    setLoteriaSlug(loteLoteria.slug);
    setModoComparacao("lote");
    setLoteSelecionadoId(loteId);
    // Busca o resultado da loteria do lote e compara
    setCarregando(true);
    try {
      const res = await fetch(`/api/sync/${loteLoteria.slug}`);
      if (res.ok) {
        const data = await res.json();
        const r = data.concurso;
        setResultado(r);
        if (r) {
          setComparacoes(lote.jogos.map((j) => compararJogo(j.dezenas, r, loteLoteria, j.nome || j.id.slice(0, 8))));
        }
      }
    } catch { /* ignora */ } finally {
      setCarregando(false);
    }
  };

  const toggleDezena = (n: number) => {
    setDezenasSelecionadas(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  };

    const handleComparar = () => {
      if (!resultado) return;
      if (modoComparacao === "manual") {
        if (dezenasSelecionadas.length === 0) return;
        setComparacoes([compararJogo(dezenasSelecionadas.sort((a, b) => a - b), resultado, loteria)]);
      } else {
        if (jogoSelecionadoId && jogarSelecionado) {
          const jogoLoteria = LOTERIAS.find((x) => x.id === jogarSelecionado.loteria || x.slug === jogarSelecionado.loteria) || loteria;
          setComparacoes([compararJogo(jogarSelecionado.dezenas, resultado, jogoLoteria, jogarSelecionado.nome || jogarSelecionado.id.slice(0, 8))]);
          return;
        }
        const lote = lotes.find((l) => l.id === loteSelecionadoId);
        if (!lote || lote.jogos.length === 0) return;
        const loteLoteria = LOTERIAS.find((x) => x.id === lote.loteria) || loteria;
        const comps = lote.jogos.map((j) => compararJogo(j.dezenas, resultado, loteLoteria, j.nome || j.id.slice(0, 8)));
        comps.sort((a, b) => b.percentual - a.percentual);
        setComparacoes(comps);
      }
    };


  const melhorComparacao = comparacoes.length > 0
    ? comparacoes.reduce((best, curr) => (curr.percentual > best.percentual ? curr : best), comparacoes[0])
    : null;

  const lotesDaLoteria = lotes.filter((l) =>
    (() => {
      if (filtroPeriodo === "todos") return true;
      const dias = parseInt(filtroPeriodo, 10);
      return new Date(l.criado_em).getTime() >= Date.now() - dias * 86400000;
    })()
  );

  const jogosDaLoteria = lotesDaLoteria.flatMap((lote) =>
    lote.jogos.map((j) => ({
      id: j.id,
      loteId: lote.id,
      loteria: lote.loteria,
      dezenas: j.dezenas,
      score: j.score,
      nome: j.nome || null,
      criado_em: lote.criado_em,
      criado_por: lote.criado_por || null,
      criador_avatar_url: lote.criador_avatar_url || null,
    }))
  );

  const formatarData = (dataISO: string) => {
    const d = new Date(dataISO);
    if (isNaN(d.getTime())) return "";
    const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const dia = d.toLocaleDateString("pt-BR", { weekday: "long" });
    return `${data} · ${dia}`;
  };

  const jogarSelecionado = jogosDaLoteria.find(j => j.id === jogoSelecionadoId);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GitCompare className="h-8 w-8 text-primary" /> Comparar Jogos
        </h1>
        <p className="text-muted-foreground mt-2">Compare jogos com o resultado oficial e veja estatísticas detalhadas.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>Selecione a loteria e o modo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Loteria</Label>
              <Select value={loteriaSlug} onValueChange={(v) => v && setLoteriaSlug(v)}>
                <SelectTrigger className="w-full h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="z-50">
                  {LOTERIAS.filter((l) => l.ativo).map((l) => (
                    <SelectItem key={l.slug} value={l.slug} className="py-2.5">
                      <span className="font-medium">{l.nome}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({l.universo_min}–{l.universo_max})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modo de Comparação</Label>
              <Select value={modoComparacao} onValueChange={(v) => v && setModoComparacao(v as ModoComparacao)}>
                <SelectTrigger className="w-full h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="manual" className="py-2.5">Selecionar Números</SelectItem>
                  <SelectItem value="lote" className="py-2.5">Comparar Lote Inteiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {modoComparacao === "manual" && (
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <span>Seu Jogo</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {dezenasSelecionadas.length} / {loteria.qtd_dezenas_padrao}
                  </span>
                </Label>
                {dezenasSelecionadas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/30">
                    {dezenasSelecionadas.sort((a, b) => a - b).map(d => (
                      <Badge key={d} variant="secondary" className="text-sm px-2.5 py-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive" onClick={() => toggleDezena(d)}>
                        {String(d).padStart(2, "0")} <span className="ml-1 text-xs opacity-60">✕</span>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="p-3 rounded-xl border border-muted bg-card/50">
                  <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                    {Array.from({ length: loteria.universo_max - loteria.universo_min + 1 }, (_, i) => loteria.universo_min + i).map(numero => {
                      const isSelected = dezenasSelecionadas.includes(numero);
                      const atLimit = !isSelected && dezenasSelecionadas.length >= loteria.qtd_dezenas_padrao;
                      return (
                        <button key={numero} type="button" disabled={atLimit} onClick={() => toggleDezena(numero)}
                          className={`aspect-square rounded-full text-sm font-bold tabular-nums transition-all duration-150 cursor-pointer flex items-center justify-center ${
                            isSelected ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110 ring-2 ring-primary/40"
                            : atLimit ? "bg-muted/40 text-muted-foreground/30 cursor-not-allowed"
                            : "bg-muted text-foreground hover:bg-primary/15 hover:text-primary hover:scale-110 hover:shadow-md border border-border/50"
                          }`}>
                          {String(numero).padStart(2, "0")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {modoComparacao === "lote" && (
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Lotes de Jogos Salvos</span>
                  <span className="text-xs text-muted-foreground font-normal">{jogosDaLoteria.length} jogo(s)</span>
                </Label>
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
                {carregandoLotes ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : jogosDaLoteria.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {lotesDaLoteria
                      .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
                      .map((lote) => (
                        <div key={lote.id} className="border rounded-lg overflow-hidden">
                          <div className="flex items-center gap-2 p-2 bg-muted/30 border-b">
                            {lote.criador_avatar_url ? (
                              <img
                                src={lote.criador_avatar_url}
                                alt="Foto"
                                className="h-7 w-7 rounded-full object-cover border border-border shrink-0"
                              />
                            ) : (
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                                <User className="h-3.5 w-3.5" />
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate">{lote.criado_por || "Anônimo"}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{formatarData(lote.criado_em)} · {lote.jogos.length} jogo(s)</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => compararLoteInteiro(lote.id)}
                              className="shrink-0"
                            >
                              <GitCompare className="h-3.5 w-3.5 mr-1" />
                              Comparar lote
                            </Button>
                          </div>
                          <div className="divide-y">
                            {lote.jogos.map((j) => (
                              <button
                                key={j.id}
                                type="button"
                                onClick={() => setJogoSelecionadoId(j.id)}
                                className={`w-full text-left px-3 py-2 transition-colors cursor-pointer ${
                                  jogoSelecionadoId === j.id ? "bg-primary/10" : "hover:bg-accent/50"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-sm font-medium truncate ${jogoSelecionadoId === j.id ? "text-primary" : ""}`}>
                                    {j.nome || `Jogo ${j.id.slice(0, 8)}`}
                                  </span>
                                  {j.score !== null && (
                                    <Badge variant={j.score >= 80 ? "default" : "secondary"} className="text-xs shrink-0">
                                      {j.score}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {j.dezenas.slice(0, 8).map(d => (
                                    <span key={d} className="text-[10px] font-mono bg-muted rounded px-1">{String(d).padStart(2, "0")}</span>
                                  ))}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum jogo salvo para esta loteria.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado do Concurso</CardTitle>
            <CardDescription>
              {resultado ? `Concurso #${resultado.numero_concurso} - ${new Date(resultado.data_sorteio).toLocaleDateString("pt-BR")}` : "Buscando..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {carregando && <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
            {erro && <div className="text-destructive text-sm py-4">{erro}</div>}
            {resultado && !carregando && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {resultado.dezenas_sorteadas.sort((a, b) => a - b).map((d) => (
                    <Badge key={d} variant="secondary" className="text-sm px-2 py-1">{String(d).padStart(2, "0")}</Badge>
                  ))}
                </div>
                {resultado.acumulou && <Badge variant="destructive" className="text-xs">Acumulou!</Badge>}
                <Button variant="outline" size="sm" onClick={buscarResultado} disabled={carregando}>Atualizar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleComparar} className="mb-6" disabled={carregando || (modoComparacao === "manual" ? dezenasSelecionadas.length === 0 : !jogoSelecionadoId && !loteSelecionadoId)}>
        <GitCompare className="h-4 w-4 mr-2" /> Comparar
      </Button>

      {comparacoes.length > 0 && (
        <div className="space-y-6">
          {melhorComparacao && comparacoes.length > 1 && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">Melhor: {melhorComparacao.percentual}% de acerto</p>
                    <p className="text-sm text-green-600 dark:text-green-400">{melhorComparacao.acertos.length} acertos{melhorComparacao.nome && ` | ${melhorComparacao.nome}`}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {comparacoes.map((comp, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                  <span>{comp.nome && <span className="text-muted-foreground text-sm mr-2">#{comp.nome}</span>}Resultado</span>
                  <div className="flex gap-2">
                    <Badge variant={comp.percentual >= 50 ? "default" : "secondary"} className="text-lg px-3">{comp.percentual}%</Badge>
                    {comp.acertos.length > 0 && <Badge variant="outline" className="text-lg px-3">{comp.acertos.length} acertos</Badge>}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Acertos ({comp.acertos.length}):</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {comp.acertos.map((d) => (
                        <Badge key={d} variant="default" className="bg-green-500 text-white">{String(d).padStart(2, "0")}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                {comp.erros.length > 0 && (
                  <div className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">Erros ({comp.erros.length}):</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {comp.erros.map((d) => (
                          <Badge key={d} variant="outline" className="text-red-500">{String(d).padStart(2, "0")}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {comp.grades.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-2"><Trophy className="h-5 w-5 text-yellow-500" /><span className="font-medium">Classificação:</span></div>
                    {comp.grades.map((grade) => (
                      <Badge key={grade.nome} variant="default" className="mr-2">{grade.nome} - {grade.descricao}</Badge>
                    ))}
                  </div>
                )}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2"><Trophy className="h-5 w-5 text-amber-500" /><span className="font-medium">Premiação:</span></div>
                  <p className="text-sm text-muted-foreground">{comp.premioEstimado}</p>
                </div>
              </CardContent>
            </Card>
          ))}

          {comparacoes.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5" />Resumo</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {(() => {
                    const avg = (fn: (c: ComparacaoResultado) => number) => Math.round(comparacoes.reduce((a, c) => a + fn(c), 0) / comparacoes.length);
                    return [
                      { label: "Média Acertos", value: avg((c) => c.acertos.length), color: "text-green-600" },
                      { label: "Média %", value: `${avg((c) => c.percentual)}%`, color: "text-blue-600" },
                      { label: "Soma Média", value: avg((c) => c.estatisticas.soma), color: "" },
                      { label: "Pares", value: avg((c) => c.estatisticas.pares), color: "text-blue-500" },
                      { label: "Ímpares", value: avg((c) => c.estatisticas.impares), color: "text-orange-500" },
                    ];
                  })().map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
