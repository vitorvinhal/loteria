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
import { GitCompare, CheckCircle2, XCircle, Save, Trash2, BarChart3, Trophy, List } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";
import type { Loteria, Concurso } from "@/types";

interface SavedGame {
  id: string;
  loteria: string;
  nome: string;
  dezenas: number[];
  criadoEm: string;
}

interface LoteFromAPI {
  id: string;
  loteria: string;
  nome: string;
  criado_em: string;
  jogos: {
    id: string;
    dezenas: number[];
    score: number | null;
  }[];
}

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

function compararJogo(
  dezenas: number[],
  resultado: Concurso,
  loteria: Loteria,
  nome?: string
): ComparacaoResultado {
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

  return {
    nome,
    dezenas,
    acertos,
    erros,
    percentual,
    grades,
    estatisticas,
    premioEstimado: premio.texto,
    valorPremio: premio.valor,
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

type ModoComparacao = "manual" | "jogo_salvo" | "lote";

export default function CompararPage() {
  const [loteriaSelecionada, setLoteriaSelecionada] = useState<string>("lotofacil");
  const [modoComparacao, setModoComparacao] = useState<ModoComparacao>("manual");
  const [jogoInput, setJogoInput] = useState("");
  const [resultado, setResultado] = useState<Concurso | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [comparacoes, setComparacoes] = useState<ComparacaoResultado[]>([]);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [lotes, setLotes] = useState<LoteFromAPI[]>([]);
  const [loteSelecionadoId, setLoteSelecionadoId] = useState<string>("");
  const [jogoSalvoSelecionadoId, setJogoSalvoSelecionadoId] = useState<string>("");
  const [nomeJogoSalvo, setNomeJogoSalvo] = useState("");
  const [carregandoLotes, setCarregandoLotes] = useState(false);

  const loteria = LOTERIAS.find((l) => l.id === loteriaSelecionada) || LOTERIAS[0];

  useEffect(() => {
    setSavedGames(loadSavedGames());
  }, []);

  const carregarLotes = useCallback(async () => {
    setCarregandoLotes(true);
    try {
      const res = await fetch("/api/lotes");
      if (res.ok) {
        const data = await res.json();
        setLotes(data.lotes || []);
      }
    } catch {
      // silently fail
    } finally {
      setCarregandoLotes(false);
    }
  }, []);

  useEffect(() => {
    carregarLotes();
  }, [carregarLotes]);

  const buscarResultado = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    setComparacoes([]);
    try {
      const res = await fetch(`/api/sync/${loteria.slug}`);
      if (!res.ok) throw new Error("Erro ao buscar resultado");
      const data = await res.json();
      setResultado(data.concurso);
    } catch {
      setErro("Não foi possível buscar o resultado. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [loteria.slug]);

  useEffect(() => {
    buscarResultado();
    setComparacoes([]);
    setJogoInput("");
    setLoteSelecionadoId("");
    setJogoSalvoSelecionadoId("");
  }, [buscarResultado]);

  const handleComparar = () => {
    if (!resultado) return;

    if (modoComparacao === "manual") {
      const dezenas = parseDezenas(jogoInput);
      if (dezenas.length === 0) return;
      setComparacoes([compararJogo(dezenas, resultado, loteria)]);
      return;
    }

    if (modoComparacao === "jogo_salvo") {
      const jogo = savedGames.find(
        (g) => g.id === jogoSalvoSelecionadoId && g.loteria === loteria.id
      );
      if (!jogo) return;
      setComparacoes([compararJogo(jogo.dezenas, resultado, loteria, jogo.nome)]);
      return;
    }

    if (modoComparacao === "lote") {
      const lote = lotes.find(
        (l) => l.id === loteSelecionadoId && l.loteria === loteria.id
      );
      if (!lote || lote.jogos.length === 0) return;
      const results = lote.jogos.map((jogo) =>
        compararJogo(jogo.dezenas, resultado, loteria, jogo.id.slice(0, 8))
      );
      setComparacoes(results);
    }
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
    if (jogoSalvoSelecionadoId === id) {
      setJogoSalvoSelecionadoId("");
    }
  };

  const jogosDaLoteria = savedGames.filter((g) => g.loteria === loteria.id);
  const lotesDaLoteria = lotes.filter((l) => l.loteria === loteria.id);

  const melhorComparacao = comparacoes.length > 0
    ? comparacoes.reduce((best, curr) => (curr.percentual > best.percentual ? curr : best), comparacoes[0])
    : null;

  const podeComparar =
    resultado &&
    ((modoComparacao === "manual" && parseDezenas(jogoInput).length > 0) ||
      (modoComparacao === "jogo_salvo" && !!jogoSalvoSelecionadoId) ||
      (modoComparacao === "lote" && !!loteSelecionadoId));

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GitCompare className="h-8 w-8 text-primary" />
          Comparar Jogos
        </h1>
        <p className="text-muted-foreground mt-2">
          Compare jogos com o resultado oficial e veja estatísticas detalhadas.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>Selecione a loteria e o modo de comparação</CardDescription>
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
              <Label>Modo de Comparação</Label>
              <Select value={modoComparacao} onValueChange={(v) => v && setModoComparacao(v as ModoComparacao)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Entrada Manual</SelectItem>
                  <SelectItem value="jogo_salvo">Jogo Salvo</SelectItem>
                  <SelectItem value="lote">Comparar Lote Inteiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {modoComparacao === "manual" && (
              <>
                <div className="space-y-2">
                  <Label>Seu Jogo</Label>
                  <Input
                    placeholder={`Ex: ${formatDezenas(
                      Array.from({ length: loteria.qtd_dezenas_padrao }, (_, i) => i + 1)
                    )}`}
                    value={jogoInput}
                    onChange={(e) => setJogoInput(e.target.value)}
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
              </>
            )}

            {modoComparacao === "jogo_salvo" && (
              <div className="space-y-2">
                <Label>Jogo Salvo</Label>
                {jogosDaLoteria.length > 0 ? (
                  <Select value={jogoSalvoSelecionadoId} onValueChange={(v) => v && setJogoSalvoSelecionadoId(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um jogo salvo" />
                    </SelectTrigger>
                    <SelectContent>
                      {jogosDaLoteria.map((jogo) => (
                        <SelectItem key={jogo.id} value={jogo.id}>
                          {jogo.nome} ({jogo.dezenas.length} dezenas)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum jogo salvo para esta loteria. Salve jogos na aba manual.
                  </p>
                )}
              </div>
            )}

            {modoComparacao === "lote" && (
              <div className="space-y-2">
                <Label>Lote</Label>
                {carregandoLotes ? (
                  <p className="text-sm text-muted-foreground">Carregando lotes...</p>
                ) : lotesDaLoteria.length > 0 ? (
                  <Select value={loteSelecionadoId} onValueChange={(v) => v && setLoteSelecionadoId(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotesDaLoteria.map((lote) => (
                        <SelectItem key={lote.id} value={lote.id}>
                          {lote.nome || `Lote ${lote.id.slice(0, 8)}`} ({lote.jogos.length} jogos)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum lote disponível para esta loteria.
                  </p>
                )}
              </div>
            )}
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

      <Button
        onClick={handleComparar}
        className="mb-6"
        disabled={!podeComparar}
      >
        <GitCompare className="h-4 w-4 mr-2" />
        {modoComparacao === "lote" ? `Comparar Lote (${lotesDaLoteria.find((l) => l.id === loteSelecionadoId)?.jogos.length || 0} jogos)` : "Comparar"}
      </Button>

      {comparacoes.length > 0 && (
        <div className="space-y-6">
          {melhorComparacao && comparacoes.length > 1 && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      Melhor resultado: {melhorComparacao.percentual}% de acerto
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {melhorComparacao.acertos.length} acertos
                      {melhorComparacao.nome && ` | Jogo: ${melhorComparacao.nome}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {comparacoes.map((comp, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-2">
                    {comp.nome && <span className="text-muted-foreground text-sm">#{comp.nome}</span>}
                    Resultado da Comparação
                  </span>
                  <div className="flex gap-2">
                    <Badge
                      variant={comp.percentual >= 50 ? "default" : "secondary"}
                      className="text-lg px-3"
                    >
                      {comp.percentual}%
                    </Badge>
                    {comp.acertos.length > 0 && (
                      <Badge variant="outline" className="text-lg px-3">
                        {comp.acertos.length} acertos
                      </Badge>
                    )}
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
                        <Badge key={d} variant="default" className="bg-green-500 text-white">
                          {String(d).padStart(2, "0")}
                        </Badge>
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
                          <Badge key={d} variant="outline" className="text-red-500">
                            {String(d).padStart(2, "0")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {comp.grades.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">Classificação:</span>
                    </div>
                    {comp.grades.map((grade) => (
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
                  <p className="text-sm text-muted-foreground">{comp.premioEstimado}</p>
                  {comp.valorPremio > 0 && (
                    <p className="text-lg font-bold text-green-600 mt-1">
                      R$ {comp.valorPremio.toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {comparacoes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5" />
                  Resumo Estatístico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {(() => {
                    const avg = (fn: (c: ComparacaoResultado) => number) =>
                      Math.round(comparacoes.reduce((a, c) => a + fn(c), 0) / comparacoes.length);
                    return [
                      { label: "Média Acertos", value: avg((c) => c.acertos.length), color: "text-green-600" },
                      { label: "Média %", value: `${avg((c) => c.percentual)}%`, color: "text-blue-600" },
                      { label: "Soma Média", value: avg((c) => c.estatisticas.soma), color: "" },
                      { label: "Pares Médios", value: avg((c) => c.estatisticas.pares), color: "text-blue-500" },
                      { label: "Ímpares Médios", value: avg((c) => c.estatisticas.impares), color: "text-orange-500" },
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
