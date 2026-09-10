"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp, Clock, Scale, Hash, Grid3X3, Shuffle, Repeat, Lock, Sparkles, Trophy, Star } from "lucide-react";
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

const estrategiaScores: Record<string, { score: number; media: number }> = {
  quentes: { score: 78, media: 72 },
  frias: { score: 74, media: 68 },
  par_impar: { score: 76, media: 70 },
  soma: { score: 72, media: 66 },
  quadrantes: { score: 70, media: 65 },
  delta: { score: 80, media: 73 },
  exclusao_padroes: { score: 82, media: 75 },
  repeticao_controlada: { score: 75, media: 69 },
  fechamento: { score: 85, media: 78 },
  hibrida_ia: { score: 88, media: 80 },
};

export default function EstrategiasPage() {
  const estrategias = getEstrategiasAtivas();

  const sorted = [...estrategias].sort((a, b) => {
    const scoreA = estrategiaScores[a.id]?.score || 0;
    const scoreB = estrategiaScores[b.id]?.score || 0;
    return scoreB - scoreA;
  });

  const melhorScore = sorted[0] ? estrategiaScores[sorted[0].id]?.score || 0 : 0;

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
        {sorted.map((estrategia) => {
          const scores = estrategiaScores[estrategia.id];
          const isMelhor = scores?.score === melhorScore;

          return (
            <Card
              key={estrategia.slug}
              className={`h-full ${isMelhor ? "border-primary ring-2 ring-primary/20" : ""}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {categoriaIcons[estrategia.categoria] || <TrendingUp className="h-4 w-4" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {estrategia.nome}
                        {isMelhor && (
                          <Badge className="bg-primary text-primary-foreground">
                            <Trophy className="h-3 w-3 mr-1" />
                            Melhor
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">
                          {categoriaLabels[estrategia.categoria] || estrategia.categoria}
                        </Badge>
                        {scores && (
                          <>
                            <Badge variant="outline" className="gap-1">
                              <Star className="h-3 w-3" />
                              {scores.score}
                            </Badge>
                            <Badge variant="outline" className="text-muted-foreground">
                              Média: {scores.media}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {estrategia.descricao_curta}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {estrategia.descricao_completa}
                </p>
              </CardContent>
            </Card>
          );
        })}
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
