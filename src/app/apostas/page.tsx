"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trophy, XCircle, Loader2 } from "lucide-react";
import { LOTERIAS, getOpcoesQtd } from "@/lib/loterias";
import { VolantePosicional, ExtrasVolante } from "@/components/lottery/volante";
import type { ResultadoAposta } from "@/types";

interface Aposta {
  id: string;
  loteria_id: string;
  dezenas: number[];
  valor_apostado: number;
  resultado: ResultadoAposta | null;
  criado_em: string;
  metadados?: ({ colunas?: number[][] } & Record<string, unknown>) | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ApostasPage() {
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [verificandoId, setVerificandoId] = useState<string | null>(null);
  const [loteriaId, setLoteriaId] = useState("");
  const [dezenasSelecionadas, setDezenasSelecionadas] = useState<number[]>([]);
  const [colunasSel, setColunasSel] = useState<number[][]>([]);
  const [extrasSel, setExtrasSel] = useState<Record<string, number[]>>({});
  const [qtdPosicional, setQtdPosicional] = useState(7);
  const [valorApostado, setValorApostado] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const loteria = LOTERIAS.find((l) => l.id === loteriaId);
  const posicional = loteria?.mecanica === "posicional" && !!loteria.colunas;
  const componentesExtras = loteria?.componentes_extras ?? [];
  const extrasFaltando = componentesExtras.filter(
    (c) => c.obrigatorio && (extrasSel[c.tipo]?.length ?? 0) < c.qtd_min
  );
  const baseOk = posicional ? colunasSel.every((c) => c.length > 0) : dezenasSelecionadas.length > 0;

  const selecionarLoteria = (id: string) => {
    setLoteriaId(id);
    setDezenasSelecionadas([]);
    setExtrasSel({});
    const l = LOTERIAS.find((x) => x.id === id);
    setColunasSel(
      l?.colunas ? Array.from({ length: l.colunas.total_colunas }, () => [] as number[]) : []
    );
    setQtdPosicional(l?.qtd_dezenas_padrao ?? 7);
  };

  const carregarApostas = useCallback(async () => {
    try {
      const res = await fetch("/api/apostas");
      if (!res.ok) throw new Error("Erro ao carregar");
      const data = await res.json();
      setApostas(data.apostas || []);
    } catch { setErro("Erro ao carregar apostas"); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregarApostas(); }, [carregarApostas]);

  const toggleDezena = (n: number) => {
    setDezenasSelecionadas(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  };

  const handleSalvar = async () => {
    setErro(null);
    if (!loteria) { setErro("Selecione uma loteria"); return; }
    const valor = parseFloat(valorApostado);
    if (isNaN(valor) || valor <= 0) { setErro("Informe um valor válido"); return; }
    if (extrasFaltando.length > 0) { setErro(`Selecione: ${extrasFaltando.map((c) => c.nome).join(", ")}`); return; }

    let dezenas: number[];
    const metadados: Record<string, unknown> = {};

    if (posicional && loteria.colunas) {
      if (colunasSel.some((c) => c.length === 0)) { setErro("Marque ao menos 1 dígito em cada coluna"); return; }
      const total = colunasSel.reduce((s, c) => s + c.length, 0);
      if (total < loteria.qtd_dezenas_min || total > loteria.qtd_dezenas_max) {
        setErro(`Total de ${total} fora do intervalo ${loteria.qtd_dezenas_min}–${loteria.qtd_dezenas_max}`);
        return;
      }
      dezenas = colunasSel.map((c) => c[0]);
      // Só exige a coluna completa quando há múltipla (aposta simples cabe em dezenas).
      if (colunasSel.some((c) => c.length > 1)) metadados.colunas = colunasSel;
    } else {
      if (dezenasSelecionadas.length < loteria.qtd_dezenas_min) { setErro(`Mínimo ${loteria.qtd_dezenas_min} dezenas`); return; }
      if (dezenasSelecionadas.length > loteria.qtd_dezenas_max) { setErro(`Máximo ${loteria.qtd_dezenas_max} dezenas`); return; }
      dezenas = [...dezenasSelecionadas].sort((a, b) => a - b);
    }

    for (const comp of componentesExtras) {
      const vals = extrasSel[comp.tipo] ?? [];
      if (vals.length > 0) metadados[comp.tipo] = vals;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/apostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loteria_id: loteriaId,
          dezenas,
          valor_apostado: valor,
          ...(Object.keys(metadados).length ? { metadados } : {}),
        }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Erro ao salvar"); }
      const data = await res.json();
      setApostas((prev) => [data.aposta, ...prev]);
      setDezenasSelecionadas([]);
      setColunasSel((prev) => prev.map(() => []));
      setExtrasSel({});
      setValorApostado("");
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro ao salvar"); }
    finally { setSalvando(false); }
  };

  const handleVerificar = async (aposta: Aposta) => {
    setVerificandoId(aposta.id);
    try {
      const res = await fetch("/api/apostas/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aposta_id: aposta.id }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Erro ao verificar"); }
      const resultado: ResultadoAposta = await res.json();
      setApostas((prev) => prev.map((a) => (a.id === aposta.id ? { ...a, resultado } : a)));
    } catch (err) { setErro(err instanceof Error ? err.message : "Erro ao verificar"); }
    finally { setVerificandoId(null); }
  };

  const handleRemover = async (id: string) => {
    try {
      const res = await fetch(`/api/apostas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover");
      setApostas((prev) => prev.filter((a) => a.id !== id));
    } catch { setErro("Erro ao remover"); }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-primary" /> Minhas Apostas
        </h1>
        <p className="text-muted-foreground mt-2">Salve suas apostas e acompanhe os resultados.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Nova Aposta</CardTitle>
            <CardDescription>Selecione loteria e números</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Loteria</Label>
              <Select value={loteriaId} onValueChange={(v) => { if (v) selecionarLoteria(v); }}>
                <SelectTrigger className="w-full h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="z-50">
                  {LOTERIAS.filter((l) => l.ativo).map((l) => (
                    <SelectItem key={l.id} value={l.id} className="py-2.5">
                      <span className="font-medium">{l.nome}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({l.universo_min}–{l.universo_max})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loteria && posicional && loteria.colunas && (
              <div className="space-y-2">
                <Label>Total de Números</Label>
                <Select value={String(qtdPosicional)} onValueChange={(v) => setQtdPosicional(Number(v))}>
                  <SelectTrigger className="w-full h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-50">
                    {getOpcoesQtd(loteria.slug).map((qtd) => (
                      <SelectItem key={qtd} value={String(qtd)} className="py-2.5">{qtd} números</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {loteria && (
              <div className="space-y-3">
                {posicional && loteria.colunas ? (
                  <div className="space-y-2">
                    <Label>Dezenas (7 colunas × 0–9)</Label>
                    <VolantePosicional
                      loteria={loteria}
                      total={qtdPosicional}
                      colunas={colunasSel}
                      onChange={setColunasSel}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="flex items-center justify-between">
                      <span>Dezenas</span>
                      <span className="text-xs text-muted-foreground font-normal">{dezenasSelecionadas.length} / {loteria.qtd_dezenas_padrao}</span>
                    </Label>
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
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
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
                {componentesExtras.length > 0 && (
                  <ExtrasVolante
                    componentes={componentesExtras}
                    extras={extrasSel}
                    onChange={(tipo, valores) => setExtrasSel((prev) => ({ ...prev, [tipo]: valores }))}
                  />
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Valor Apostado (R$)</Label>
              <Input type="number" min="0" step="0.01" placeholder="0,00" value={valorApostado} onChange={(e) => setValorApostado(e.target.value)} className="h-11" />
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <Button onClick={handleSalvar} disabled={salvando || !loteriaId || !baseOk || extrasFaltando.length > 0 || !valorApostado} className="w-full h-11">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Salvar Aposta
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Apostas Salvas ({apostas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : apostas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma aposta salva ainda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loteria</TableHead>
                      <TableHead>Dezenas</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apostas.map((aposta) => {
                      const l = LOTERIAS.find((x) => x.id === aposta.loteria_id);
                      return (
                        <TableRow key={aposta.id}>
                          <TableCell><Badge variant="secondary" className="text-xs">{l?.nome || aposta.loteria_id}</Badge></TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {aposta.dezenas.map((d, i) => (
                                <Badge key={`${d}-${i}`} variant={aposta.resultado?.ganhou ? "default" : "outline"} className="text-xs px-1.5 py-0">
                                  {String(d).padStart(2, "0")}
                                </Badge>
                              ))}
                              {aposta.metadados &&
                                Object.entries(aposta.metadados)
                                  .filter(([k, v]) => k !== "colunas" && Array.isArray(v) && v.length > 0)
                                  .map(([k, vals]) => (
                                    <Badge key={k} variant="outline" className="text-xs px-1.5 py-0 text-emerald-600">
                                      {k === "trevo" ? "🍀" : k === "time" ? "⚽" : "📅"} {(vals as number[]).join(" ")}
                                    </Badge>
                                  ))}
                              {Array.isArray(aposta.metadados?.colunas) && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0">múltipla</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{formatCurrency(aposta.valor_apostado)}</TableCell>
                          <TableCell>
                            {aposta.resultado ? (
                              <>
                                <Badge variant={aposta.resultado.ganhou ? "default" : "destructive"} className="flex items-center gap-1 text-xs">
                                  {aposta.resultado.ganhou ? <Trophy className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                  {aposta.resultado.ganhou ? "Ganhou" : "Perdeu"} ({aposta.resultado.acertos}/{aposta.resultado.total_dezenas})
                                </Badge>
                                {aposta.resultado.avisos?.map((a) => (
                                  <p key={a} className="text-[10px] text-amber-600 mt-1 max-w-[180px]">{a}</p>
                                ))}
                              </>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => handleVerificar(aposta)} disabled={verificandoId === aposta.id} className="text-xs">
                                {verificandoId === aposta.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
                                Verificar
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(aposta.criado_em)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemover(aposta.id)} className="h-7 w-7">
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
