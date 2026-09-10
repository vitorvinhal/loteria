"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GitCompare, Target, CheckCircle2, XCircle } from "lucide-react";

export default function CompararPage() {
  const [jogoInput, setJogoInput] = useState("");
  const [resultadoInput, setResultadoInput] = useState("");
  const [comparacao, setComparacao] = useState<{
    acertos: number[];
    erros: number[];
    percentual: number;
  } | null>(null);

  const handleComparar = () => {
    const jogo = new Set(
      jogoInput.split(/[\s,;-]+/).map(Number).filter(n => !isNaN(n))
    );
    const resultado = new Set(
      resultadoInput.split(/[\s,;-]+/).map(Number).filter(n => !isNaN(n))
    );

    const acertos = Array.from(jogo).filter(d => resultado.has(d)).sort((a, b) => a - b);
    const erros = Array.from(jogo).filter(d => !resultado.has(d)).sort((a, b) => a - b);
    const percentual = jogo.size > 0 ? Math.round((acertos.length / jogo.size) * 100) : 0;

    setComparacao({ acertos, erros, percentual });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GitCompare className="h-8 w-8 text-primary" />
          Comparar Jogos
        </h1>
        <p className="text-muted-foreground mt-2">
          Compare seu jogo com o resultado de um concurso e veja o percentual de acerto.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Seu Jogo</CardTitle>
            <CardDescription>Digite as dezenas do seu jogo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="jogo">Dezenas</Label>
              <Input
                id="jogo"
                placeholder="Ex: 5 12 23 34 45 56"
                value={jogoInput}
                onChange={e => setJogoInput(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado do Concurso</CardTitle>
            <CardDescription>Digite as dezenas sorteadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="resultado">Dezenas Sorteadas</Label>
              <Input
                id="resultado"
                placeholder="Ex: 3 12 25 34 48 56"
                value={resultadoInput}
                onChange={e => setResultadoInput(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleComparar} className="mb-6">
        <GitCompare className="h-4 w-4 mr-2" />
        Comparar Jogos
      </Button>

      {comparacao && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Resultado da Comparação</span>
              <Badge variant={comparacao.percentual >= 50 ? "default" : "secondary"} className="text-lg px-3">
                {comparacao.percentual}% de acerto
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium">Acertos ({comparacao.acertos.length}):</span>
              <div className="flex gap-1">
                {comparacao.acertos.map(d => (
                  <Badge key={d} variant="default" className="bg-green-500">
                    {String(d).padStart(2, "0")}
                  </Badge>
                ))}
              </div>
            </div>

            {comparacao.erros.length > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium">Erros ({comparacao.erros.length}):</span>
                <div className="flex gap-1">
                  {comparacao.erros.map(d => (
                    <Badge key={d} variant="outline" className="text-red-500">
                      {String(d).padStart(2, "0")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
