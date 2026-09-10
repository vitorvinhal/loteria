"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp, Clock, Scale, Hash, Grid3X3, Shuffle, Repeat, Lock, Sparkles } from "lucide-react";
import { getEstrategiasAtivas } from "@/modules/strategies";

const categoriaIcons: Record<string, React.ReactNode> = {
  frequencia: <TrendingUp className="h-4 w-4" />,
  atraso: <Clock className="h-4 w-4" />,
  equilibrio: <Scale className="h-4 w-4" />,
  soma: <Hash className="h-4 w-4" />,
  distribuicao: <Grid3X3 className="h-4 w-4" />,
  sistema: <Shuffle className="h-4 w-4" />,
  exclusao: <Lock className="h-4 w-4" />,
  repeticao: <Repeat className="h-4 w-4" />,
  fechamento: <Lock className="h-4 w-4" />,
  hibrida: <Sparkles className="h-4 w-4" />,
};

const categoriaLabels: Record<string, string> = {
  frequencia: "Frequência",
  atraso: "Atraso",
  equilibrio: "Equilíbrio",
  soma: "Soma",
  distribuicao: "Distribuição",
  sistema: "Sistema",
  exclusao: "Exclusão",
  repeticao: "Repetição",
  fechamento: "Fechamento",
  hibrida: "Híbrida",
};

export default function EstrategiasPage() {
  const estrategias = getEstrategiasAtivas();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" />
          Estratégias de Geração
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Conheça todas as estratégias disponíveis para gerar jogos. Cada uma otimiza um
          aspecto diferente da combinação, mas nenhuma aumenta a probabilidade matemática
          de acerto — todas as combinações têm a mesma chance.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {estrategias.map(estrategia => (
          <Card key={estrategia.slug} className="h-full">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {categoriaIcons[estrategia.categoria] || <TrendingUp className="h-4 w-4" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{estrategia.nome}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {categoriaLabels[estrategia.categoria] || estrategia.categoria}
                    </Badge>
                  </div>
                </div>
              </div>
              <CardDescription className="mt-2">
                {estrategia.descricao_curta}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {estrategia.descricao_completa}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">Importante: O que o Score Representa</h3>
          <p className="text-sm text-muted-foreground">
            Em um sorteio de loteria honesto, cada combinação possível tem exatamente a mesma
            probabilidade de ser sorteada. O score de 0-100 é um <strong>índice de aderência
            estatística e qualidade combinatória</strong>, calculado a partir de: aderência a
            padrões observados no histórico, qualidade combinatória do jogo, e baixa probabilidade
            de coincidir com escolhas populares de outros apostadores (o que, em caso de acerto,
            reduz a chance de dividir o prêmio).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
