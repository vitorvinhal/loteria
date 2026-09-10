"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Calculator, TrendingUp, Plus, X, Dices } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";

interface Jogo {
  dezenas: number[];
  score: number;
}

export default function BolaoPage() {
  const [loteriaSlug, setLoteriaSlug] = useState("megasena");
  const [quantidadeCotas, setQuantidadeCotas] = useState(10);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [novoJogoInput, setNovoJogoInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const loteria = LOTERIAS.find(l => l.slug === loteriaSlug);

  const custoTotal = loteria ? loteria.preco_aposta_base * jogos.length : 0;
  const custoPorCota = quantidadeCotas > 0 ? custoTotal / quantidadeCotas : 0;

  const adicionarJogo = () => {
    if (!loteria) return;

    const dezenas = novoJogoInput
      .split(/[\s,;-]+/)
      .map(Number)
      .filter(n => !isNaN(n) && n >= loteria.universo_min && n <= loteria.universo_max)
      .sort((a, b) => a - b);

    if (dezenas.length < loteria.qtd_dezenas_min) return;

    setJogos(prev => [...prev, { dezenas, score: 0 }]);
    setNovoJogoInput("");
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
          estrategia: "quentes",
          quantidade: 5,
          score_minimo: 60,
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
              <Select value={loteriaSlug} onValueChange={(v) => v && setLoteriaSlug(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOTERIAS.map(l => (
                    <SelectItem key={l.slug} value={l.slug}>
                      {l.nome} (R$ {l.preco_aposta_base.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cotas">Quantidade de Cotas</Label>
              <Input
                id="cotas"
                type="number"
                min={1}
                value={quantidadeCotas}
                onChange={e => setQuantidadeCotas(Number(e.target.value))}
              />
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
              <span className="font-medium">R$ {custoTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo por cota:</span>
              <span className="font-medium text-primary">R$ {custoPorCota.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cotas:</span>
              <Badge variant="secondary">{quantidadeCotas}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Adicionar Jogos</span>
            <Button
              size="sm"
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
          </CardTitle>
          <CardDescription>
            Digite as dezenas ou gere jogos automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={loteria ? `Dezenas (${loteria.universo_min}-${loteria.universo_max})` : "Dezenas"}
              value={novoJogoInput}
              onChange={e => setNovoJogoInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && adicionarJogo()}
            />
            <Button onClick={adicionarJogo} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {jogos.length > 0 && (
            <div className="space-y-2">
              {jogos.map((jogo, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-8">#{index + 1}</span>
                    <div className="flex gap-1">
                      {jogo.dezenas.map(d => (
                        <Badge key={d} variant="outline">
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
