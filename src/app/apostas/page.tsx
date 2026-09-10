"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trophy, XCircle, Loader2 } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";

interface Aposta {
  id: string;
  loteria_id: string;
  dezenas: number[];
  valor_apostado: number;
  resultado: ResultadoAposta | null;
  criado_em: string;
}

interface ResultadoAposta {
  ganhou: boolean;
  acertos: number;
  total_dezenas: number;
  dezenas_sorteadas: number[];
  concurso_numero: number;
  detalhes: string;
}

interface FormState {
  loteria_id: string;
  dezenas_input: string;
  valor_apostado: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ApostasPage() {
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [verificandoId, setVerificandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    loteria_id: "",
    dezenas_input: "",
    valor_apostado: "",
  });
  const [erro, setErro] = useState<string | null>(null);

  const carregarApostas = useCallback(async () => {
    try {
      const res = await fetch("/api/apostas");
      if (!res.ok) throw new Error("Erro ao carregar apostas");
      const data = await res.json();
      setApostas(data.apostas || []);
    } catch {
      setErro("Erro ao carregar apostas salvas");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarApostas();
  }, [carregarApostas]);

  const loteriaSelecionada = LOTERIAS.find((l) => l.id === form.loteria_id);

  const parseDezenas = (input: string): number[] => {
    return input
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map(Number)
      .filter((n) => !isNaN(n));
  };

  const validarDezenas = (dezenas: number[]): string | null => {
    if (!loteriaSelecionada) return "Selecione uma loteria";

    if (dezenas.length < loteriaSelecionada.qtd_dezenas_min) {
      return `Mínimo de ${loteriaSelecionada.qtd_dezenas_min} dezenas`;
    }
    if (dezenas.length > loteriaSelecionada.qtd_dezenas_max) {
      return `Máximo de ${loteriaSelecionada.qtd_dezenas_max} dezenas`;
    }

    for (const d of dezenas) {
      if (d < loteriaSelecionada.universo_min || d > loteriaSelecionada.universo_max) {
        return `Dezena ${d} fora do universo (${loteriaSelecionada.universo_min}-${loteriaSelecionada.universo_max})`;
      }
    }

    const unicos = new Set(dezenas);
    if (unicos.size !== dezenas.length) {
      return "Dezenas duplicadas não são permitidas";
    }

    return null;
  };

  const handleSalvar = async () => {
    setErro(null);
    const dezenas = parseDezenas(form.dezenas_input);
    const erroDezenas = validarDezenas(dezenas);
    if (erroDezenas) {
      setErro(erroDezenas);
      return;
    }

    const valor = parseFloat(form.valor_apostado);
    if (isNaN(valor) || valor <= 0) {
      setErro("Informe um valor válido");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/apostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loteria_id: form.loteria_id,
          dezenas,
          valor_apostado: valor,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar");
      }

      const data = await res.json();
      setApostas((prev) => [data.aposta, ...prev]);
      setForm({ loteria_id: "", dezenas_input: "", valor_apostado: "" });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar aposta");
    } finally {
      setSalvando(false);
    }
  };

  const handleVerificar = async (aposta: Aposta) => {
    setVerificandoId(aposta.id);
    try {
      const res = await fetch(`/api/apostas/verificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aposta_id: aposta.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao verificar");
      }

      const resultado: ResultadoAposta = await res.json();

      setApostas((prev) =>
        prev.map((a) => (a.id === aposta.id ? { ...a, resultado } : a))
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao verificar aposta");
    } finally {
      setVerificandoId(null);
    }
  };

  const handleRemover = async (id: string) => {
    try {
      const res = await fetch(`/api/apostas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover");
      setApostas((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setErro("Erro ao remover aposta");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-primary" />
          Minhas Apostas
        </h1>
        <p className="text-muted-foreground mt-2">
          Salve suas apostas e acompanhe os resultados.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nova Aposta
            </CardTitle>
            <CardDescription>Preencha os dados para salvar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Loteria</label>
              <Select
                value={form.loteria_id}
                onValueChange={(v) => v && setForm((f) => ({ ...f, loteria_id: v, dezenas_input: "" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {LOTERIAS.filter((l) => l.ativo).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loteriaSelecionada && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Dezenas ({loteriaSelecionada.qtd_dezenas_min} a{" "}
                  {loteriaSelecionada.qtd_dezenas_max})
                </label>
                <Input
                  placeholder={`Ex: 1 2 3 4 5 ou 1,2,3,4,5`}
                  value={form.dezenas_input}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dezenas_input: e.target.value }))
                  }
                />
                {form.dezenas_input && (
                  <p className="text-xs text-muted-foreground">
                    {parseDezenas(form.dezenas_input).length} dezenas digitadas
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Apostado (R$)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.valor_apostado}
                onChange={(e) =>
                  setForm((f) => ({ ...f, valor_apostado: e.target.value }))
                }
              />
            </div>

            {erro && (
              <p className="text-sm text-destructive">{erro}</p>
            )}

            <Button
              onClick={handleSalvar}
              disabled={salvando || !form.loteria_id || !form.dezenas_input || !form.valor_apostado}
              className="w-full"
            >
              {salvando ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Salvar Aposta
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Apostas Salvas ({apostas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
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
                      const loteria = LOTERIAS.find(
                        (l) => l.id === aposta.loteria_id
                      );
                      return (
                        <TableRow key={aposta.id}>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {loteria?.nome || aposta.loteria_id}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {aposta.dezenas.map((d) => (
                                <Badge
                                  key={d}
                                  variant={
                                    aposta.resultado?.ganhou ? "default" : "outline"
                                  }
                                  className="text-xs px-1.5 py-0"
                                >
                                  {String(d).padStart(2, "0")}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatCurrency(aposta.valor_apostado)}
                          </TableCell>
                          <TableCell>
                            {aposta.resultado ? (
                              <Badge
                                variant={
                                  aposta.resultado.ganhou ? "default" : "destructive"
                                }
                                className="flex items-center gap-1 text-xs"
                              >
                                {aposta.resultado.ganhou ? (
                                  <Trophy className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                {aposta.resultado.ganhou ? "Ganhou" : "Perdeu"}
                                <span className="ml-1 opacity-80">
                                  ({aposta.resultado.acertos}/{aposta.resultado.total_dezenas})
                                </span>
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVerificar(aposta)}
                                disabled={verificandoId === aposta.id}
                                className="text-xs"
                              >
                                {verificandoId === aposta.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Search className="h-3 w-3 mr-1" />
                                )}
                                Verificar
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(aposta.criado_em)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemover(aposta.id)}
                              className="h-7 w-7"
                            >
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
