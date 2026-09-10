"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Calculator, TrendingUp } from "lucide-react";

export default function BolaoPage() {
  const [quantidadeCotas, setQuantidadeCotas] = useState(10);
  const [custoAposta, setCustoAposta] = useState(50);
  const [jogos, setJogos] = useState<number[][]>([
    [5, 12, 23, 34, 45, 56],
    [3, 18, 29, 41, 52, 60],
    [1, 15, 28, 37, 44, 55],
  ]);

  const custoTotal = custoAposta * jogos.length;
  const custoPorCota = custoTotal / quantidadeCotas;

  const projecoes = [
    { acertos: 4, premioEstimado: 1500, porCota: 1500 / quantidadeCotas },
    { acertos: 5, premioEstimado: 35000, porCota: 35000 / quantidadeCotas },
    { acertos: 6, premioEstimado: 3500000, porCota: 3500000 / quantidadeCotas },
  ];

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
              <Label htmlFor="cotas">Quantidade de Cotas</Label>
              <Input
                id="cotas"
                type="number"
                min={1}
                value={quantidadeCotas}
                onChange={e => setQuantidadeCotas(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custo">Custo da Aposta (R$)</Label>
              <Input
                id="custo"
                type="number"
                min={0}
                step={0.5}
                value={custoAposta}
                onChange={e => setCustoAposta(Number(e.target.value))}
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
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cotas:</span>
              <Badge variant="secondary">{quantidadeCotas}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Jogos do Bolão</CardTitle>
          <CardDescription>{jogos.length} jogos incluídos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {jogos.map((jogo, index) => (
              <div key={index} className="flex items-center gap-4 p-2 border rounded-lg">
                <span className="text-sm text-muted-foreground w-8">#{index + 1}</span>
                <div className="flex gap-1">
                  {jogo.map(d => (
                    <Badge key={d} variant="outline">
                      {String(d).padStart(2, "0")}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
          <div className="space-y-4">
            {projecoes.map((proj) => (
              <div key={proj.acertos} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{proj.acertos} acertos (Quadra/Quina/Sena)</p>
                  <p className="text-sm text-muted-foreground">
                    Prêmio estimado: R$ {proj.premioEstimado.toLocaleString("pt-BR")}
                  </p>
                </div>
                <Badge variant="default" className="text-lg">
                  R$ {proj.porCota.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  <span className="text-xs ml-1">/cota</span>
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
