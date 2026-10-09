"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, PenTool, Target, RotateCcw, CheckCircle2, Calendar, Coins, Save, Loader2, BarChart3, Plus, Minus } from "lucide-react";
import { LOTERIAS, getLoteriaPorSlug, getPreco, getOpcoesQtd, getFaixaColunas } from "@/lib/loterias";
import { obterRegra } from "@/modules/lottery";
import { ShareGame } from "@/components/lottery/share-game";
import { VolantePosicional, ExtrasVolante } from "@/components/lottery/volante";

interface Analise {
  score: number;
  soma: number;
  pares: number;
  impares: number;
  melhorEstrategia: string;
}

export default function CriarJogoPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.loteria as string;
  const loteria = getLoteriaPorSlug(slug);

  const [dezenas, setDezenas] = useState<number[]>([]);
  const [colunas, setColunas] = useState<number[][]>([]);
  const [extras, setExtras] = useState<Record<string, number[]>>({});
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [qtdDezenas, setQtdDezenas] = useState<number>(loteria?.qtd_dezenas_padrao || 15);

  const opcoesQtd = useMemo(() => getOpcoesQtd(slug), [slug]);
  const precoAtual = getPreco(slug, qtdDezenas);

  const todosNumeros = useMemo(() => {
    if (!loteria) return [];
    const nums: number[] = [];
    for (let i = loteria.universo_min; i <= loteria.universo_max; i++) {
      nums.push(i);
    }
    return nums;
  }, [loteria]);

  // Ao trocar de modalidade, reseta toda a seleção (dezenas, colunas, extras)
  useEffect(() => {
    const l = getLoteriaPorSlug(slug);
    setDezenas([]);
    setColunas(
      l?.colunas
        ? Array.from({ length: l.colunas.total_colunas }, () => [] as number[])
        : []
    );
    setExtras({});
    setAnalise(null);
  }, [slug]);

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

  const posicional = loteria.mecanica === "posicional" && !!loteria.colunas;
  const faixaPos = posicional ? getFaixaColunas(slug, qtdDezenas) : null;
  const totalColunas = loteria.colunas?.total_colunas ?? 0;
  const totalMarcado = colunas.reduce((s, c) => s + c.length, 0);

  // Super Sete: dezenas = primeiro dígito de cada coluna (convenção do motor)
  const dezenasAtuais = posicional ? colunas.map((c) => c[0] ?? -1) : dezenas;

  const posCompleto =
    posicional &&
    !!faixaPos &&
    colunas.length === totalColunas &&
    totalMarcado === qtdDezenas &&
    colunas.every((c) => c.length >= faixaPos.min && c.length <= faixaPos.max);

  const extrasValidos = (loteria.componentes_extras ?? []).every((comp) => {
    const vals = extras[comp.tipo] ?? [];
    if (!comp.obrigatorio) return true;
    return vals.length >= comp.qtd_min && vals.length <= comp.qtd_max;
  });

  const completo = posicional ? posCompleto : dezenas.length >= loteria.qtd_dezenas_min;
  const selecionadasCount = posicional ? totalMarcado : dezenas.length;

  const toggleDezena = (num: number) => {
    setAnalise(null);
    if (dezenas.includes(num)) {
      setDezenas(dezenas.filter((d) => d !== num));
    } else if (dezenas.length < qtdDezenas) {
      setDezenas([...dezenas, num].sort((a, b) => a - b));
    }
  };

  const limparSelecao = () => {
    setDezenas([]);
    setColunas(
      loteria.colunas
        ? Array.from({ length: loteria.colunas.total_colunas }, () => [] as number[])
        : []
    );
    setExtras({});
    setAnalise(null);
  };

  const mudarQtd = (qtd: number) => {
    setQtdDezenas(qtd);
    setDezenas([]);
    if (loteria.colunas) {
      setColunas(
        Array.from({ length: loteria.colunas.total_colunas }, () => [] as number[])
      );
    }
    setAnalise(null);
  };

  const selecionarAleatorio = () => {
    const resultado = obterRegra(loteria).gerarAleatorio({ loteria, qtdDezenas });
    if (posicional) {
      setColunas(resultado.colunas ?? []);
    } else {
      setDezenas([...resultado.dezenas].sort((a, b) => a - b));
    }
    if (resultado.extras) setExtras(resultado.extras);
    setAnalise(null);
  };

  const handleAnalisar = async () => {
    const base = dezenasAtuais;
    if (posicional ? !posCompleto : dezenas.length < 2) return;
    const dezenasParaAnalise = base.filter((d) => d >= 0);

    try {
      const res = await fetch(`/api/analisar/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dezenas: dezenasParaAnalise }),
      });
      if (res.ok) {
        const data = await res.json();
        const paresCalc = dezenasParaAnalise.filter((d) => d % 2 === 0).length;
        setAnalise({
          score: data.score,
          soma: data.estatisticas?.soma ?? dezenasParaAnalise.reduce((a, b) => a + b, 0),
          pares: paresCalc,
          impares: dezenasParaAnalise.length - paresCalc,
          melhorEstrategia: data.explicacao?.split("—")[0]?.trim() || "Análise Completa",
        });
      }
    } catch {
      const paresCalc = dezenasParaAnalise.filter((d) => d % 2 === 0).length;
      setAnalise({
        score: 0,
        soma: dezenasParaAnalise.reduce((a, b) => a + b, 0),
        pares: paresCalc,
        impares: dezenasParaAnalise.length - paresCalc,
        melhorEstrategia: "Erro na análise",
      });
    }
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

  const LOTERIA_ICONS: Record<string, string> = {
    lotofacil: "⭐", lotomania: "🎱", megasena: "🏆", quina: "💎",
    duplasena: "🔄", timemania: "⚽", diadesorte: "🌟", maismilionaria: "💰", supersete: "7️⃣",
  };

  const calcularProximoSorteio = (dias: string[]): string => {
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
  };

  const handleSalvar = async () => {
    if (!completo || !extrasValidos) return;

    const metadados: Record<string, unknown> = {};
    if (posicional) metadados.colunas = colunas;
    for (const comp of loteria.componentes_extras ?? []) {
      const vals = extras[comp.tipo];
      if (vals?.length) metadados[comp.tipo] = vals;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loteria: loteria.id,
          estrategia: "manual",
          jogos: [
            {
              dezenas: posicional ? colunas.map((c) => c[0]) : dezenas,
              score: analise?.score || null,
              metadados: Object.keys(metadados).length ? metadados : undefined,
            },
          ],
        }),
      });

      if (res.ok) {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 3000);
      }
    } catch {
      // erro silencioso
    } finally {
      setSalvando(false);
    }
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

        {/* Lottery Selector */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Escolha a Loteria
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {LOTERIAS.filter(l => l.ativo).map(l => {
              const isSelected = l.slug === slug;
              return (
                <button
                  key={l.slug}
                  onClick={() => { router.push(`/criar-jogo/${l.slug}`); setQtdDezenas(l.qtd_dezenas_padrao); }}
                  className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 text-center cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
                  }`}
                >
                  <span className="text-2xl mb-1">{LOTERIA_ICONS[l.slug] || "🎲"}</span>
                  <span className={`text-xs font-semibold leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {l.nome}
                  </span>
                  <span className={`inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    <Coins className="h-2.5 w-2.5" />
                    R$ {l.preco_aposta_base.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5" />
                    {calcularProximoSorteio(l.dias_sorteio)}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Quantity Selector */}
        {opcoesQtd.length > 1 && (
          <section className="mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {posicional ? "Total de Números (7 colunas)" : "Quantidade de Dezenas"}
            </h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {opcoesQtd.map(qtd => {
                const preco = getPreco(slug, qtd);
                const isSelected = qtd === qtdDezenas;
                return (
                  <button
                    key={qtd}
                    onClick={() => mudarQtd(qtd)}
                    className={`flex flex-col items-center px-3 py-2 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className={`text-sm font-bold ${isSelected ? "text-primary" : ""}`}>
                      {posicional ? `${qtd} números` : `${qtd} dezenas`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      R$ {preco.toFixed(2).replace('.', ',')}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Typeable +/- Input */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full shrink-0"
                disabled={qtdDezenas <= (loteria.qtd_dezenas_min || opcoesQtd[0])}
                onClick={() => {
                  const idx = opcoesQtd.indexOf(qtdDezenas);
                  if (idx > 0) {
                    mudarQtd(opcoesQtd[idx - 1]);
                  }
                }}
                aria-label="Diminuir dezenas"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <input
                type="number"
                value={qtdDezenas}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && opcoesQtd.includes(val)) {
                    mudarQtd(val);
                  }
                }}
                className="w-16 h-10 text-center text-lg font-bold rounded-lg border border-input bg-background tabular-nums focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                min={opcoesQtd[0]}
                max={opcoesQtd[opcoesQtd.length - 1]}
                aria-label="Quantidade de dezenas"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full shrink-0"
                disabled={qtdDezenas >= (loteria.qtd_dezenas_max || opcoesQtd[opcoesQtd.length - 1])}
                onClick={() => {
                  const idx = opcoesQtd.indexOf(qtdDezenas);
                  if (idx < opcoesQtd.length - 1) {
                    mudarQtd(opcoesQtd[idx + 1]);
                  }
                }}
                aria-label="Aumentar dezenas"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </section>
        )}

        {/* Selection Status Bar */}
        <div className="mb-4 p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {posicional ? "Números marcados (7 colunas)" : "Dezenas selecionadas"}
            </span>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs gap-1">
                <Coins className="h-3 w-3" />
                R$ {precoAtual.toFixed(2).replace('.', ',')}
              </Badge>
              <span className="text-sm font-bold">
                <span className={selecionadasCount === qtdDezenas ? "text-emerald-500" : ""}>
                  {selecionadasCount}
                </span>
                <span className="text-muted-foreground"> / {qtdDezenas}</span>
              </span>
            </div>
          </div>

          {!posicional && dezenas.length > 0 ? (
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
          ) : posicional ? (
            <p className="text-sm text-muted-foreground py-2">
              {faixaPos
                ? `Marque de ${faixaPos.min} a ${faixaPos.max} dígito${faixaPos.max > 1 ? "s" : ""} por coluna no volante abaixo`
                : "Marque 1 dígito por coluna no volante abaixo"}
            </p>
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
            disabled={selecionadasCount === 0 && Object.keys(extras).length === 0}
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

        {/* Number Grid / Volante posicional */}
        <Card className="mb-6">
          <CardContent className="p-4">
            {posicional && loteria.colunas ? (
              <VolantePosicional
                loteria={loteria}
                total={qtdDezenas}
                colunas={colunas}
                onChange={setColunas}
              />
            ) : (
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
                      disabled={!isSelected && dezenas.length >= qtdDezenas}
                      className={`
                        aspect-square rounded-full text-sm font-mono font-medium
                        transition-all duration-150 border-2
                        ${isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                          : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                        }
                        ${!isSelected && dezenas.length >= qtdDezenas
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
            )}
          </CardContent>
        </Card>

        {/* Extras obrigatórios (Time, Mês, Trevos) */}
        {!!loteria.componentes_extras?.length && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <ExtrasVolante
                componentes={loteria.componentes_extras}
                extras={extras}
                onChange={(tipo, valores) =>
                  setExtras((prev) => ({ ...prev, [tipo]: valores }))
                }
              />
              {!extrasValidos && (
                <p className="text-xs text-destructive mt-3">
                  Complete os campos obrigatórios acima para salvar.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Analysis + Save */}
        <div className="flex gap-2 mb-6">
          <Button
            variant="outline"
            onClick={handleAnalisar}
            disabled={posicional ? !posCompleto : dezenas.length < 2}
            className="flex-1"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analisar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={!completo || !extrasValidos || salvando}
            className="flex-1"
          >
            {salvando ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : salvo ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {salvo ? "Salvo!" : "Salvar Jogo"}
          </Button>
        </div>

        {/* Analysis Result */}
        {analise && (
          <Card className="mb-6 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Análise do Jogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className={`text-2xl font-bold ${getScoreColor(analise.score)}`}>
                    {analise.score}
                    <span className="text-xs font-normal ml-1">({getScoreLabel(analise.score)})</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estratégia</p>
                  <p className="text-sm font-medium">{analise.melhorEstrategia}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Soma</p>
                  <p className="text-sm font-medium">{analise.soma}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Par/Ímpar</p>
                  <p className="text-sm font-medium">{analise.pares}P / {analise.impares}I</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Share */}
        {completo && (
          <ShareGame
            dezenas={posicional ? colunas.map((c) => c[0]) : dezenas}
            loteria={loteria.nome}
            score={analise?.score || null}
          />
        )}
      </div>
    </div>
  );
}
