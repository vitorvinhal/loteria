"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { GitCompare, CheckCircle2, XCircle, Trophy, BarChart3, Loader2, User, AlertTriangle } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";
import { VolantePosicional, ExtrasVolante } from "@/components/lottery/volante";
import { compararJogo, type ComparacaoResultado } from "@/modules/lottery/comparar";
import type { Concurso } from "@/types";

interface LoteFromAPI {
  id: string;
  loteria: string;
  nome: string;
  criado_em: string;
  criado_por: string | null;
  criador_avatar_url: string | null;
  jogos: {
    id: string;
    dezenas: number[];
    score: number | null;
    nome?: string | null;
    score_breakdown?: { camuflagem?: boolean } | null;
    metadados?: ({ colunas?: number[][] } & Record<string, unknown>) | null;
  }[];
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
  const [loteExpandidoId, setLoteExpandidoId] = useState<string | null>(null);
  const [loteResultadoExpandido, setLoteResultadoExpandido] = useState(true);
  const [colunasSel, setColunasSel] = useState<number[][]>([]);
  const [extrasSel, setExtrasSel] = useState<Record<string, number[]>>({});
  const loteria = LOTERIAS.find((l) => l.slug === loteriaSlug) || LOTERIAS[0];
  const posicional = loteria.mecanica === "posicional" && !!loteria.colunas;
  const [agora, setAgora] = useState(0);

  useEffect(() => {
    setAgora(Date.now());
  }, []);

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

  useEffect(() => {
    buscarResultado();
    setComparacoes([]);
    setDezenasSelecionadas([]);
    setColunasSel(
      loteria.colunas
        ? Array.from({ length: loteria.colunas.total_colunas }, () => [] as number[])
        : []
    );
    setExtrasSel({});
    setLoteSelecionadoId("");
  }, [buscarResultado, loteria.colunas]);

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
    setComparacoes(lote.jogos.map((j) => compararJogo(j.dezenas, resultado, loteLoteria, j.nome || j.id.slice(0, 8), j.score_breakdown?.camuflagem === true, j.metadados)).sort((a, b) => b.percentual - a.percentual));
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
          setComparacoes(lote.jogos.map((j) => compararJogo(j.dezenas, r, loteLoteria, j.nome || j.id.slice(0, 8), j.score_breakdown?.camuflagem === true, j.metadados)).sort((a, b) => b.percentual - a.percentual));
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
        const extrasMetadados: Record<string, unknown> = { ...extrasSel };
        if (posicional) {
          if (colunasSel.some((c) => c.length === 0)) return;
          extrasMetadados.colunas = colunasSel;
          setComparacoes([compararJogo(colunasSel.map((c) => c[0]), resultado, loteria, undefined, undefined, extrasMetadados)]);
          return;
        }
        if (dezenasSelecionadas.length === 0) return;
        setComparacoes([compararJogo([...dezenasSelecionadas].sort((a, b) => a - b), resultado, loteria, undefined, undefined, extrasMetadados)]);
      } else {
        if (jogoSelecionadoId && jogarSelecionado) {
          const jogoLoteria = LOTERIAS.find((x) => x.id === jogarSelecionado.loteria || x.slug === jogarSelecionado.loteria) || loteria;
          setComparacoes([compararJogo(jogarSelecionado.dezenas, resultado, jogoLoteria, jogarSelecionado.nome || jogarSelecionado.id.slice(0, 8), undefined, jogarSelecionado.metadados)]);
          return;
        }
        const lote = lotes.find((l) => l.id === loteSelecionadoId);
        if (!lote || lote.jogos.length === 0) return;
        const loteLoteria = LOTERIAS.find((x) => x.id === lote.loteria) || loteria;
        const comps = lote.jogos.map((j) => compararJogo(j.dezenas, resultado, loteLoteria, j.nome || j.id.slice(0, 8), j.score_breakdown?.camuflagem === true, j.metadados));
        comps.sort((a, b) => b.percentual - a.percentual);
        setComparacoes(comps);
      }
    };


  const melhorComparacao = comparacoes.length > 0
    ? comparacoes.reduce((best, curr) => (curr.percentual > best.percentual ? curr : best), comparacoes[0])
    : null;

  const lotesDaLoteria = lotes.filter((l) => {
    if (filtroPeriodo !== "todos") {
      const dias = parseInt(filtroPeriodo, 10);
      if (new Date(l.criado_em).getTime() < agora - dias * 86400000) return false;
    }
    if (filtroLoteria && l.loteria !== filtroLoteria) return false;
    if (filtroNome && !(l.nome || "").toLowerCase().includes(filtroNome.toLowerCase()) && !(l.criado_por || "").toLowerCase().includes(filtroNome.toLowerCase())) return false;
    return true;
  });

  const jogosDaLoteria = lotesDaLoteria.flatMap((lote) =>
    lote.jogos.map((j) => ({
      id: j.id,
      loteId: lote.id,
      loteria: lote.loteria,
      dezenas: j.dezenas,
      score: j.score,
      nome: j.nome || null,
      metadados: j.metadados ?? null,
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
                    {posicional
                      ? `${colunasSel.reduce((s, c) => s + c.length, 0)} / ${loteria.qtd_dezenas_padrao}`
                      : `${dezenasSelecionadas.length} / ${loteria.qtd_dezenas_padrao}`}
                  </span>
                </Label>
                {posicional && loteria.colunas ? (
                  <VolantePosicional
                    loteria={loteria}
                    total={loteria.qtd_dezenas_padrao}
                    colunas={colunasSel}
                    onChange={setColunasSel}
                  />
                ) : (
                  <>
                    {dezenasSelecionadas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/30">
                        {[...dezenasSelecionadas].sort((a, b) => a - b).map(d => (
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
                  </>
                )}
                {!!loteria.componentes_extras?.length && (
                  <ExtrasVolante
                    componentes={loteria.componentes_extras}
                    extras={extrasSel}
                    onChange={(tipo, valores) =>
                      setExtrasSel((prev) => ({ ...prev, [tipo]: valores }))
                    }
                  />
                )}
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
                <Input
                  placeholder="Buscar por nome ou autor..."
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  className="h-8 text-xs"
                />
                {carregandoLotes ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : lotesDaLoteria.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum jogo salvo para esta loteria.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {lotesDaLoteria
                      .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
                      .map((lote) => {
                        const expandido = loteExpandidoId === lote.id;
                        return (
                          <div key={lote.id} className="border rounded-lg overflow-hidden">
                            <div
                              className="flex items-center gap-2 p-2 bg-muted/30 border-b cursor-pointer hover:bg-accent/40 transition-colors"
                              onClick={() => setLoteExpandidoId(expandido ? null : lote.id)}
                            >
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
                                <p className="text-[10px] text-muted-foreground capitalize">
                                  {formatarData(lote.criado_em)} · {lote.jogos.length} jogo(s)
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  compararLoteInteiro(lote.id);
                                }}
                              >
                                <GitCompare className="h-3.5 w-3.5 mr-1" />
                                Comparar lote
                              </Button>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {expandido ? "▲" : "▼"}
                              </span>
                            </div>
                            {expandido && (
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
                                        {j.score_breakdown?.camuflagem && <span title="Jogo camuflado" className="text-amber-500 mr-1">✦</span>}
                                        {j.nome || `Jogo ${j.id.slice(0, 8)}`}
                                      </span>
                                      {j.score !== null && (
                                        <Badge variant={j.score >= 80 ? "default" : "secondary"} className="text-xs shrink-0">
                                          {j.score}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
              {j.dezenas.slice(0, 8).map((d, di) => (
                <span key={`${d}-${di}`} className="text-[10px] font-mono bg-muted rounded px-1">{String(d).padStart(2, "0")}</span>
                                      ))}
                                      {j.dezenas.length > 8 && (
                                        <span className="text-[10px] text-muted-foreground">+{j.dezenas.length - 8}</span>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
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
            {resultado.dezenas_sorteadas.sort((a, b) => a - b).map((d, di) => (
              <Badge key={`${d}-${di}`} variant="secondary" className="text-sm px-2 py-1">{String(d).padStart(2, "0")}</Badge>
                  ))}
                </div>
                {resultado.acumulou && <Badge variant="destructive" className="text-xs">Acumulou!</Badge>}
                <Button variant="outline" size="sm" onClick={buscarResultado} disabled={carregando}>Atualizar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleComparar} className="mb-6" disabled={carregando || (modoComparacao === "manual" ? (posicional ? colunasSel.some((c) => c.length === 0) : dezenasSelecionadas.length === 0) : !jogoSelecionadoId && !loteSelecionadoId)}>
        <GitCompare className="h-4 w-4 mr-2" /> Comparar
      </Button>

      {comparacoes.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-accent/40 transition-colors"
            onClick={() => setLoteResultadoExpandido(!loteResultadoExpandido)}
          >
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-primary" />
                Resultado do Lote
                <Badge variant="outline">{comparacoes.length} jogo(s)</Badge>
              </span>
              <span className="text-xs text-muted-foreground">{loteResultadoExpandido ? "▲ Retrair lote" : "▼ Expandir lote"}</span>
            </CardTitle>
          </CardHeader>
          {loteResultadoExpandido && (
          <CardContent className="space-y-6">
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
                  <span>
                    {comp.nome && <span className="text-muted-foreground text-sm mr-2">#{comp.nome}</span>}
                    {comp.camuflagem && <span title="Jogo camuflado" className="text-amber-500 mr-1">✦</span>}
                    Resultado
                  </span>
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
                      {comp.acertos.map((d, di) => (
                        <Badge key={`${d}-${di}`} variant="default" className="bg-green-500 text-white">{String(d).padStart(2, "0")}</Badge>
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
                      {comp.erros.map((d, di) => (
                        <Badge key={`${d}-${di}`} variant="outline" className="text-red-500">{String(d).padStart(2, "0")}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {!!comp.extraInfo?.length && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">Extras:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {comp.extraInfo.map((info) => (
                          <Badge key={info} variant="outline" className="text-emerald-600">{info}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {!!comp.avisos?.length && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                      {comp.avisos.map((a) => (
                        <p key={a}>{a}</p>
                      ))}
                    </div>
                  </div>
                )}
                {comp.acertos2 && (
                  <div className="border-t pt-4 space-y-3">
                    <span className="font-medium">2º Sorteio</span>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">Acertos ({comp.acertos2.length}):</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                      {comp.acertos2.map((d, di) => (
                        <Badge key={`${d}-${di}`} variant="default" className="bg-green-500 text-white">{String(d).padStart(2, "0")}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    {!!comp.erros2?.length && (
                      <div className="flex items-start gap-2">
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">Erros ({comp.erros2.length}):</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                      {comp.erros2.map((d, di) => (
                        <Badge key={`${d}-${di}`} variant="outline" className="text-red-500">{String(d).padStart(2, "0")}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {!!comp.grades2?.length && (
                      <div className="flex flex-wrap gap-1">
                        {comp.grades2.map((grade) => (
                          <Badge key={grade.nome} variant="secondary">{grade.nome} - {grade.descricao}</Badge>
                        ))}
                      </div>
                    )}
                    {comp.faixaPremio2 && (
                      <div>
                        <p className="text-sm text-muted-foreground">{comp.faixaPremio2}</p>
                        {comp.valorPremio2 ? (
                          <p className="text-sm font-semibold text-green-600">
                            R$ {comp.valorPremio2.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} por ganhador
                          </p>
                        ) : null}
                      </div>
                    )}
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
                  {comp.valorPremio > 0 && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-sm font-semibold text-green-600">
                        R$ {comp.valorPremio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} por ganhador
                      </p>
                      {comp.ganhadores > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {comp.ganhadores.toLocaleString("pt-BR")} ganhador(es) oficial(is)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {comparacoes.length > 0 && (() => {
            const contagemFaixas: Record<string, number> = {};
            comparacoes.forEach(c => {
              const key = c.acertos.length;
              contagemFaixas[key] = (contagemFaixas[key] || 0) + 1;
            });
            const faixas = Object.entries(contagemFaixas)
              .map(([acertos, qtd]) => ({ acertos: Number(acertos), qtd }))
              .sort((a, b) => b.acertos - a.acertos);
            const totalPremio = comparacoes.reduce((s, c) => s + c.valorPremio, 0);

            return (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5" />Resumo Estatístico</CardTitle></CardHeader>
                <CardContent className="space-y-4">
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

                  <div className="border-t pt-4">
                    <p className="font-semibold mb-2 text-sm">Acertos por Faixa ({comparacoes.length} jogos)</p>
                    <div className="space-y-1.5">
                      {faixas.map(f => (
                        <div key={f.acertos} className="flex items-center gap-2">
                          <span className="text-xs font-mono w-8 text-right">{f.acertos} ac.</span>
                          <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                            <div className="h-full bg-primary rounded" style={{ width: `${(f.qtd / comparacoes.length) * 100}%` }} />
                          </div>
                          <span className="text-xs font-bold w-8">{f.qtd}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {totalPremio > 0 && (() => {
                    const premioPorFaixa: Record<string, { qtd: number; valor: number; ganhadores: number; subtotal: number }> = {};
                    comparacoes.forEach(c => {
                      if (c.valorPremio > 0) {
                        const key = c.faixaPremio;
                        if (!premioPorFaixa[key]) premioPorFaixa[key] = { qtd: 0, valor: c.valorPremio, ganhadores: c.ganhadores, subtotal: 0 };
                        premioPorFaixa[key].qtd++;
                        premioPorFaixa[key].subtotal += c.valorPremio;
                      }
                    });
                    return (
                      <div className="border-t pt-4">
                        <p className="font-semibold mb-2 text-sm">Simulação de Premiação</p>
                        <div className="space-y-1">
                          {Object.entries(premioPorFaixa).map(([faixa, d]) => (
                            <div key={faixa} className="text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">{faixa} × {d.qtd}</span>
                                <span className="font-mono font-bold">
                                  R$ {d.subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                R$ {d.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/ganhador · {d.ganhadores.toLocaleString("pt-BR")} ganhador(es)
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="border-t mt-2 pt-2 bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                            R$ {totalPremio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Total estimado com base no concurso oficial</p>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            );
          })()}
          </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
