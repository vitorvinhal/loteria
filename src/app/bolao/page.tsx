"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Calculator, TrendingUp, Plus, Minus, X, Dices, Coins, RotateCcw } from "lucide-react";
import { LOTERIAS, getPreco, getOpcoesQtd } from "@/lib/loterias";

interface Jogo {
  dezenas: number[];
  score: number;
}

export default function BolaoPage() {
  const [loteriaSlug, setLoteriaSlug] = useState("megasena");
  const [quantidadeCotas, setQuantidadeCotas] = useState(10);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [dezenasSelecionadas, setDezenasSelecionadas] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qtdDezenas, setQtdDezenas] = useState<number>(LOTERIAS.find(l => l.slug === "megasena")?.qtd_dezenas_padrao || 6);
  const [emailConvidado, setEmailConvidado] = useState("");
  const [participantes, setParticipantes] = useState<{ nome: string; email: string; cotas: number }[]>([]);
  const [convidando, setConvidando] = useState(false);

  const loteria = LOTERIAS.find(l => l.slug === loteriaSlug);

  const opcoesQtd = useMemo(() => getOpcoesQtd(loteriaSlug), [loteriaSlug]);
  const precoAtual = getPreco(loteriaSlug, qtdDezenas);

  const custoTotal = loteria ? precoAtual * jogos.length : 0;
  const custoPorCota = quantidadeCotas > 0 ? custoTotal / quantidadeCotas : 0;

  const todosNumeros = useMemo(() => {
    if (!loteria) return [];
    const nums: number[] = [];
    for (let i = loteria.universo_min; i <= loteria.universo_max; i++) {
      nums.push(i);
    }
    return nums;
  }, [loteria]);

  const toggleDezena = (num: number) => {
    if (dezenasSelecionadas.includes(num)) {
      setDezenasSelecionadas(dezenasSelecionadas.filter(d => d !== num));
    } else if (loteria && dezenasSelecionadas.length < qtdDezenas) {
      setDezenasSelecionadas([...dezenasSelecionadas, num].sort((a, b) => a - b));
    }
  };

  const limparSelecao = () => {
    setDezenasSelecionadas([]);
  };

  const selecionarAleatorio = () => {
    if (!loteria) return;
    const copia = [...todosNumeros];
    const selecionadas: number[] = [];
    for (let i = 0; i < qtdDezenas; i++) {
      const idx = Math.floor(Math.random() * copia.length);
      selecionadas.push(copia.splice(idx, 1)[0]);
    }
    setDezenasSelecionadas(selecionadas.sort((a, b) => a - b));
  };

  const adicionarJogo = () => {
    if (!loteria || dezenasSelecionadas.length < loteria.qtd_dezenas_min) return;

    setJogos(prev => [...prev, { dezenas: [...dezenasSelecionadas], score: 0 }]);
    setDezenasSelecionadas([]);
  };

  const removerJogo = (index: number) => {
    setJogos(prev => prev.filter((_, i) => i !== index));
  };

  const gerarJogosAutomaticos = async () => {
    if (!loteria) return;

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/gerar/${loteriaSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estrategias: ["quentes"],
          quantidade: 5,
          score_minimo: 60,
          qtd_dezenas: qtdDezenas,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const novosJogos = data.jogos.map((j: Jogo) => ({
          dezenas: j.dezenas,
          score: j.score,
        }));
        setJogos(prev => [...prev, ...novosJogos]);
      }
    } catch (error) {
      console.error("Erro ao gerar jogos:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConvidar = async () => {
    const email = emailConvidado.trim();
    if (!email || !loteria || jogos.length === 0) {
      alert("Informe o email do usuário e adicione jogos ao bolão antes de convidar.");
      return;
    }
    setConvidando(true);
    try {
      const res = await fetch("/api/bolao/convites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_convidado: email,
          loteria_id: loteria.id,
          quantidade_cotas: quantidadeCotas,
          jogos: jogos,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setParticipantes(prev => [...prev, { nome: email.split("@")[0], email, cotas: quantidadeCotas }]);
        setEmailConvidado("");
        alert(`Convite enviado para ${email}.`);
      } else {
        alert(data.error || "Erro ao enviar convite.");
      }
    } catch (e) {
      console.error("Erro ao convidar:", e);
      alert("Erro ao enviar convite. Tente novamente.");
    } finally {
      setConvidando(false);
    }
  };

  const projecoes = loteria?.regras_vitoria.map(regra => {
    const premiosEstimados: Record<number, number> = {
      4: 1500,
      5: 35000,
      6: 3500000,
      11: 2000,
      12: 5000,
      13: 50000,
      14: 500000,
      15: 5000000,
      2: 500,
      3: 2000,
      7: 100000,
    };

    const premio = premiosEstimados[regra.acertos_min] || 1000;
    return {
      acertos: regra.acertos_min,
      descricao: regra.descricao,
      premioEstimado: premio,
      porCota: quantidadeCotas > 0 ? premio / quantidadeCotas : 0,
    };
  }) || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
          Simulação de Bolão
        </h1>
        <p className="text-muted-foreground mt-2">
          Monte seu bolão e veja projeções de premiação por cota.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Bolão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Loteria</Label>
              <Select value={loteriaSlug} onValueChange={(v) => { if (v) { setLoteriaSlug(v); setDezenasSelecionadas([]); const nova = LOTERIAS.find(l => l.slug === v); setQtdDezenas(nova?.qtd_dezenas_padrao || 6); } }}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {LOTERIAS.filter(l => l.ativo).map(l => (
                    <SelectItem key={l.slug} value={l.slug} className="py-2.5">
                      <span className="font-medium">{l.nome}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        R$ {l.preco_aposta_base.toFixed(2).replace('.', ',')}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cotas">Quantidade de Cotas</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full shrink-0"
                  disabled={quantidadeCotas <= 1}
                  onClick={() => setQuantidadeCotas(prev => Math.max(1, prev - 1))}
                  aria-label="Diminuir cotas"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="cotas"
                  type="number"
                  min={1}
                  value={quantidadeCotas}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setQuantidadeCotas(Math.max(1, val));
                  }}
                  className="w-16 h-10 text-center text-lg font-bold tabular-nums"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full shrink-0"
                  onClick={() => setQuantidadeCotas(prev => prev + 1)}
                  aria-label="Aumentar cotas"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Resumo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jogos no bolão:</span>
              <span className="font-medium">{jogos.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo total:</span>
              <span className="font-medium">R$ {custoTotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo por cota:</span>
              <span className="font-medium text-primary">R$ {custoPorCota.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cotas:</span>
              <Badge variant="secondary">{quantidadeCotas}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {opcoesQtd.length > 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quantidade de Dezenas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {opcoesQtd.map(qtd => {
                const preco = getPreco(loteriaSlug, qtd);
                const isSelected = qtd === qtdDezenas;
                return (
                  <button
                    key={qtd}
                    onClick={() => { setQtdDezenas(qtd); setDezenasSelecionadas([]); }}
                    className={`flex flex-col items-center px-3 py-2 rounded-lg border-2 transition-all cursor-pointer ${
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
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Adicionar Jogos</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={gerarJogosAutomaticos}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Dices className="h-4 w-4 mr-1 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Dices className="h-4 w-4 mr-1" />
                    Gerar 5 Jogos
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Selecione as dezenas clicando nos números abaixo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loteria && (
            <>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <span>Seu Jogo</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {dezenasSelecionadas.length} / {qtdDezenas}
                  </span>
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground mr-1">
                    <Coins className="h-3 w-3 inline mr-0.5" />
                    R$ {precoAtual.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {dezenasSelecionadas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/30">
                  {dezenasSelecionadas.map(d => (
                    <Badge key={d} variant="secondary" className="text-sm px-2.5 py-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive" onClick={() => toggleDezena(d)}>
                      {String(d).padStart(2, "0")} <span className="ml-1 text-xs opacity-60">✕</span>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="p-3 rounded-xl border border-muted bg-card/50">
                <div
                  className="grid gap-1.5"
                  style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${(loteria?.universo_max || 99) >= 80 ? "2rem" : "2.5rem"}, 1fr))`,
                  }}
                >
                  {todosNumeros.map(numero => {
                    const isSelected = dezenasSelecionadas.includes(numero);
                    const atLimit = !isSelected && dezenasSelecionadas.length >= qtdDezenas;
                    return (
                      <button
                        key={numero}
                        type="button"
                        disabled={atLimit}
                        onClick={() => toggleDezena(numero)}
                        className={`aspect-square rounded-full text-sm font-bold tabular-nums transition-all duration-150 cursor-pointer flex items-center justify-center ${
                          isSelected
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

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={limparSelecao}
                  disabled={dezenasSelecionadas.length === 0}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Limpar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selecionarAleatorio}
                >
                  <Dices className="h-3.5 w-3.5 mr-1" />
                  Aleatório
                </Button>
                <Button
                  onClick={adicionarJogo}
                  disabled={dezenasSelecionadas.length < loteria.qtd_dezenas_min}
                  className="ml-auto"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Jogo
                </Button>
              </div>
            </>
          )}

          {jogos.length > 0 && (
            <div className="space-y-2 mt-4">
              {jogos.map((jogo, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-8">#{index + 1}</span>
                    <div className="flex gap-1">
                      {jogo.dezenas.map(d => (
                        <Badge key={d} variant="outline" className="text-xs">
                          {String(d).padStart(2, "0")}
                        </Badge>
                      ))}
                    </div>
                    {jogo.score > 0 && (
                      <Badge variant="secondary">{jogo.score}</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removerJogo(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convite */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Convidar Usuário para o Bolão
          </CardTitle>
          <CardDescription>
            Envie um convite por email para outro usuário do site participar deste bolão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={emailConvidado}
              onChange={e => setEmailConvidado(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleConvidar} disabled={convidando || jogos.length === 0 || !emailConvidado.trim()}>
              {convidando ? (
                <>
                  <Dices className="h-4 w-4 mr-1 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-1" />
                  Convidar
                </>
              )}
            </Button>
          </div>
          {jogos.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Adicione jogos ao bolão primeiro para poder convidar.
            </p>
          )}

          {participantes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{participantes.length} participante(s) convidado(s)</p>
              {participantes.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                  <Badge variant="outline">{p.cotas} cota(s)</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Projeções de Premiação
          </CardTitle>
          <CardDescription>
            Valores estimados baseados no prêmio atual. Não é garantia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jogos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Adicione jogos para ver as projeções de premiação.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projecoes.map((proj) => (
                <div key={proj.acertos} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{proj.acertos} acertos</p>
                    <p className="text-sm text-muted-foreground">{proj.descricao}</p>
                  </div>
                  <Badge variant="default" className="text-lg">
                    R$ {proj.porCota.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    <span className="text-xs ml-1">/cota</span>
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
