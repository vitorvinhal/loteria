"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitCompare, CheckCircle2, XCircle, Save, Trash2, BarChart3, Trophy } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";
import type { Loteria, Concurso } from "@/types";

interface SavedGame {
  id: string;
  loteria: string;
  nome: string;
  dezenas: number[];
  criadoEm: string;
}

interface GradeAcerto {
  nome: string;
  qtd: number;
  descricao: string;
}

interface ComparacaoResultado {
  acertos: number[];
  erros: number[];
  percentual: number;
  grades: GradeAcerto[];
  estatisticas: {
    soma: number;
    pares: number;
    impares: number;
    sequencias: number;
    maiorSequencia: number;
  };
  premioEstimado: string;
  valorPremio: number;
}

function parseDezenas(input: string): number[] {
  return input
    .split(/[\s,;-]+/)
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);
}

function formatDezenas(dezenas: number[]): string {
  return dezenas.map((d) => String(d).padStart(2, "0")).join(" ");
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
    if (sorted[i] === sorted[i - 1] + 1) {
      atual++;
    } else {
      if (atual >= 2) sequencias++;
      maiorSequencia = Math.max(maiorSequencia, atual);
      atual = 1;
    }
  }
  if (atual >= 2) {
    sequencias++;
    maiorSequencia = Math.max(maiorSequencia, atual);
  }

  return { soma, pares, impares, sequencias, maiorSequencia };
}

function calcularGrades(acertos: number, loteria: Loteria): GradeAcerto[] {
  const nomesGrades: Record<string, GradeAcerto[]> = {
    megasena: [
      { nome: "Sena", qtd: 6, descricao: "6 acertos - Prêmio máximo" },
      { nome: "Quina", qtd: 5, descricao: "5 acertos - Prêmio intermediário" },
      { nome: "Quadra", qtd: 4, descricao: "4 acertos - Prêmio menor" },
    ],
    quina: [
      { nome: "Quina", qtd: 5, descricao: "5 acertos - Prêmio máximo" },
      { nome: "4 acertos", qtd: 4, descricao: "4 acertos - Prêmio maior" },
      { nome: "3 acertos", qtd: 3, descricao: "3 acertos - Prêmio intermediário" },
      { nome: "2 acertos", qtd: 2, descricao: "2 acertos - Prêmio menor" },
    ],
    lotofacil: [
      { nome: "15 acertos", qtd: 15, descricao: "15 acertos - Prêmio máximo" },
      { nome: "14 acertos", qtd: 14, descricao: "14 acertos" },
      { nome: "13 acertos", qtd: 13, descricao: "13 acertos" },
      { nome: "12 acertos", qtd: 12, descricao: "12 acertos" },
      { nome: "11 acertos", qtd: 11, descricao: "11 acertos - Prêmio menor" },
    ],
    lotomania: [
      { nome: "20 acertos", qtd: 20, descricao: "20 acertos - Prêmio máximo" },
      { nome: "19 acertos", qtd: 19, descricao: "19 acertos" },
      { nome: "18 acertos", qtd: 18, descricao: "18 acertos" },
      { nome: "17 acertos", qtd: 17, descricao: "17 acertos" },
      { nome: "16 acertos", qtd: 16, descricao: "16 acertos" },
      { nome: "15 acertos", qtd: 15, descricao: "15 acertos - Prêmio menor" },
      { nome: "0 acertos", qtd: 0, descricao: "0 acertos - Prêmio especial" },
    ],
    duplasena: [
      { nome: "6 acertos", qtd: 6, descricao: "6 acertos - Prêmio máximo" },
      { nome: "5 acertos", qtd: 5, descricao: "5 acertos" },
      { nome: "4 acertos", qtd: 4, descricao: "4 acertos" },
      { nome: "3 acertos", qtd: 3, descricao: "3 acertos - Prêmio menor" },
    ],
    timemania: [
      { nome: "7 acertos", qtd: 7, descricao: "7 acertos - Time do Coração" },
      { nome: "6 acertos", qtd: 6, descricao: "6 acertos" },
      { nome: "5 acertos", qtd: 5, descricao: "5 acertos" },
      { nome: "4 acertos", qtd: 4, descricao: "4 acertos" },
      { nome: "3 acertos", qtd: 3, descricao: "3 acertos - Prêmio menor" },
    ],
    diadesorte: [
      { nome: "7 acertos", qtd: 7, descricao: "7 acertos + Mês da Sorte" },
      { nome: "6 acertos", qtd: 6, descricao: "6 acertos + Mês da Sorte" },
      { nome: "5 acertos", qtd: 5, descricao: "5 acertos + Mês da Sorte" },
      { nome: "4 acertos", qtd: 4, descricao: "4 acertos + Mês da Sorte" },
    ],
    maismilionaria: [
      { nome: "6+2T", qtd: 6, descricao: "6 acertos + 2 Trevos" },
      { nome: "6+1T", qtd: 6, descricao: "6 acertos + 1 Trevo" },
      { nome: "6+0T", qtd: 6, descricao: "6 acertos + 0 Trevos" },
    ],
    supersete: [
      { nome: "7 colunas", qtd: 7, descricao: "7 colunas certas" },
      { nome: "6 colunas", qtd: 6, descricao: "6 colunas certas" },
      { nome: "5 colunas", qtd: 5, descricao: "5 colunas certas" },
      { nome: "4 colunas", qtd: 4, descricao: "4 colunas certas" },
      { nome: "3 colunas", qtd: 3, descricao: "3 colunas certas" },
    ],
  };

  const grades = nomesGrades[loteria.id] || [];
  return grades
    .filter((g) => acertos >= g.qtd && g.qtd > 0)
    .slice(0, 1);
}

function estimarPremio(
  acertos: number,
  loteria: Loteria,
  concurso: Concurso | null
): { texto: string; valor: number } {
  if (!concurso?.premiacoes) {
    const regra = loteria.regras_vitoria.find(
      (r) => acertos >= r.acertos_min && acertos <= r.acertos_max
    );
    return {
      texto: regra ? regra.descricao : "Sem premiação",
      valor: 0,
    };
  }

  const premiacao = concurso.premiacoes.find((p) => p.acertos === acertos);
  if (premiacao && premiacao.ganhadores > 0) {
    return {
      texto: `${premiacao.descricao} - R$ ${premiacao.premio.toLocaleString("pt-BR")}`,
      valor: premiacao.premio,
    };
  }

  const regra = loteria.regras_vitoria.find(
    (r) => acertos >= r.acertos_min && acertos <= r.acertos_max
  );
  return {
    texto: regra ? regra.descricao : "Sem premiação",
    valor: 0,
  };
}

function getSavesKey(): string {
  return "loterias-caixa-saved-games";
}

function loadSavedGames(): SavedGame[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getSavesKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGames(games: SavedGame[]) {
  localStorage.setItem(getSavesKey(), JSON.stringify(games));
}

export default function CompararPage() {
  const [loteriaSelecionada, setLoteriaSelecionada] = useState<string>("lotofacil");
  const [jogoInput, setJogoInput] = useState("");
  const [resultado, setResultado] = useState<Concurso | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [comparacao, setComparacao] = useState<ComparacaoResultado | null>(null);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [jogoSelecionadoId, setJogoSelecionadoId] = useState<string>("manual");
  const [nomeJogoSalvo, setNomeJogoSalvo] = useState("");

  const loteria = LOTERIAS.find((l) => l.id === loteriaSelecionada) || LOTERIAS[0];

  useEffect(() => {
    setSavedGames(loadSavedGames());
  }, []);

  const buscarResultado = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    setComparacao(null);
    try {
      const res = await fetch(`/api/sync/${loteria.slug}`);
      if (!res.ok) throw new Error("Erro ao buscar resultado");
      const data = await res.json();
      setResultado(data.concurso);
    } catch (e) {
      setErro("Não foi possível buscar o resultado. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [loteria.slug]);

  useEffect(() => {
    buscarResultado();
  }, [buscarResultado]);

  const handleComparar = () => {
    const dezenas = parseDezenas(jogoInput);
    if (dezenas.length === 0 || !resultado) return;

    const resultadoSet = new Set(resultado.dezenas_sorteadas);
    const acertos = dezenas
      .filter((d) => resultadoSet.has(d))
      .sort((a, b) => a - b);
    const erros = dezenas
      .filter((d) => !resultadoSet.has(d))
      .sort((a, b) => a - b);
    const percentual =
      dezenas.length > 0
        ? Math.round((acertos.length / dezenas.length) * 100)
        : 0;

    const grades = calcularGrades(acertos.length, loteria);
    const estatisticas = calcularEstatisticas(dezenas);
    const premio = estimarPremio(acertos.length, loteria, resultado);

    setComparacao({
      acertos,
      erros,
      percentual,
      grades,
      estatisticas,
      premioEstimado: premio.texto,
      valorPremio: premio.valor,
    });
  };

  const handleSalvarJogo = () => {
    const dezenas = parseDezenas(jogoInput);
    if (dezenas.length === 0) return;

    const novoJogo: SavedGame = {
      id: crypto.randomUUID(),
      loteria: loteria.id,
      nome: nomeJogoSalvo || `Jogo ${savedGames.filter((g) => g.loteria === loteria.id).length + 1}`,
      dezenas,
      criadoEm: new Date().toISOString(),
    };

    const updated = [...savedGames, novoJogo];
    setSavedGames(updated);
    saveGames(updated);
    setNomeJogoSalvo("");
  };

  const handleExcluirJogo = (id: string) => {
    const updated = savedGames.filter((g) => g.id !== id);
    setSavedGames(updated);
    saveGames(updated);
    if (jogoSelecionadoId === id) {
      setJogoSelecionadoId("manual");
      setJogoInput("");
    }
  };

  const handleSelecionarJogo = (id: string) => {
    setJogoSelecionadoId(id);
    const jogo = savedGames.find((g) => g.id === id);
    if (jogo) {
      setJogoInput(formatDezenas(jogo.dezenas));
    }
  };

  const jogosDaLoteria = savedGames.filter((g) => g.loteria === loteria.id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GitCompare className="h-8 w-8 text-primary" />
          Comparar Jogos
        </h1>
        <p className="text-muted-foreground mt-2">
          Compare seu jogo com o resultado oficial e veja estatísticas detalhadas.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>Selecione a loteria e monte seu jogo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Loteria</Label>
              <Select value={loteriaSelecionada} onValueChange={(v) => v && setLoteriaSelecionada(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
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

            <div className="space-y-2">
              <Label>Seu Jogo</Label>
              <Input
                placeholder={`Ex: ${formatDezenas(
                  Array.from({ length: loteria.qtd_dezenas_padrao }, (_, i) => i + 1)
                )}`}
                value={jogoInput}
                onChange={(e) => {
                  setJogoInput(e.target.value);
                  setJogoSelecionadoId("manual");
                }}
              />
              <p className="text-xs text-muted-foreground">
                {loteria.qtd_dezenas_min === loteria.qtd_dezenas_max
                  ? `${loteria.qtd_dezenas_padrao} dezenas obrigatórias`
                  : `${loteria.qtd_dezenas_min} a ${loteria.qtd_dezenas_max} dezenas`}
                {" | Universo: "}
                {loteria.universo_min} a {loteria.universo_max}
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Nome do jogo (opcional)"
                value={nomeJogoSalvo}
                onChange={(e) => setNomeJogoSalvo(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleSalvarJogo}
                disabled={parseDezenas(jogoInput).length === 0}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado do Concurso</CardTitle>
            <CardDescription>
              {resultado
                ? `Concurso #${resultado.numero_concurso} - ${new Date(resultado.data_sorteio).toLocaleDateString("pt-BR")}`
                : "Buscando último resultado..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {carregando && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}
            {erro && (
              <div className="text-destructive text-sm py-4">{erro}</div>
            )}
            {resultado && !carregando && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {resultado.dezenas_sorteadas
                    .sort((a, b) => a - b)
                    .map((d) => (
                      <Badge key={d} variant="secondary" className="text-sm px-2 py-1">
                        {String(d).padStart(2, "0")}
                      </Badge>
                    ))}
                </div>
                {resultado.acumulou && (
                  <Badge variant="destructive" className="text-xs">
                    Acumulou!
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={buscarResultado}
                  disabled={carregando}
                >
                  Atualizar Resultado
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {jogosDaLoteria.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Jogos Salvos</CardTitle>
            <CardDescription>Selecione um jogo salvo para comparar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {jogosDaLoteria.map((jogo) => (
                <div
                  key={jogo.id}
                  className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                    jogoSelecionadoId === jogo.id
                      ? "border-primary bg-primary/10"
                      : "hover:border-muted-foreground/50"
                  }`}
                  onClick={() => handleSelecionarJogo(jogo.id)}
                >
                  <span className="font-medium">{jogo.nome}</span>
                  <span className="text-muted-foreground text-xs">
                    ({jogo.dezenas.length} dezenas)
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExcluirJogo(jogo.id);
                    }}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleComparar}
        className="mb-6"
        disabled={!resultado || parseDezenas(jogoInput).length === 0}
      >
        <GitCompare className="h-4 w-4 mr-2" />
        Comparar Jogos
      </Button>

      {comparacao && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span>Resultado da Comparação</span>
                <div className="flex gap-2">
                  <Badge
                    variant={comparacao.percentual >= 50 ? "default" : "secondary"}
                    className="text-lg px-3"
                  >
                    {comparacao.percentual}% de acerto
                  </Badge>
                  {comparacao.acertos.length > 0 && (
                    <Badge variant="outline" className="text-lg px-3">
                      {comparacao.acertos.length} acertos
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">Acertos ({comparacao.acertos.length}):</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {comparacao.acertos.map((d) => (
                      <Badge key={d} variant="default" className="bg-green-500 text-white">
                        {String(d).padStart(2, "0")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {comparacao.erros.length > 0 && (
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Erros ({comparacao.erros.length}):</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {comparacao.erros.map((d) => (
                        <Badge key={d} variant="outline" className="text-red-500">
                          {String(d).padStart(2, "0")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {comparacao.grades.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">Classificação:</span>
                  </div>
                  {comparacao.grades.map((grade) => (
                    <Badge key={grade.nome} variant="default" className="mr-2">
                      {grade.nome} - {grade.descricao}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">Premiação Estimada:</span>
                </div>
                <p className="text-sm text-muted-foreground">{comparacao.premioEstimado}</p>
                {comparacao.valorPremio > 0 && (
                  <p className="text-lg font-bold text-green-600 mt-1">
                    R$ {comparacao.valorPremio.toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5" />
                Estatísticas do Seu Jogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{comparacao.estatisticas.soma}</p>
                  <p className="text-xs text-muted-foreground">Soma Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-500">{comparacao.estatisticas.pares}</p>
                  <p className="text-xs text-muted-foreground">Pares</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-500">{comparacao.estatisticas.impares}</p>
                  <p className="text-xs text-muted-foreground">Ímpares</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-500">{comparacao.estatisticas.sequencias}</p>
                  <p className="text-xs text-muted-foreground">Sequências</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-500">{comparacao.estatisticas.maiorSequencia}</p>
                  <p className="text-xs text-muted-foreground">Maior Seq.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
