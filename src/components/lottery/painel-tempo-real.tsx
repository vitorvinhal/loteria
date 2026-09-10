"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, TrendingUp, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface LoteriaInfo {
  slug: string;
  nome: string;
  proximo_sorteio: string;
  valor_acumulado: number;
  ultimo_resultado: number[];
  numero_concurso: number;
}

const loteriasDestaque: LoteriaInfo[] = [
  {
    slug: "megasena",
    nome: "Mega-Sena",
    proximo_sorteio: "2026-09-14T11:00:00",
    valor_acumulado: 45000000,
    ultimo_resultado: [5, 12, 23, 34, 45, 56],
    numero_concurso: 2850,
  },
  {
    slug: "lotofacil",
    nome: "Lotofácil",
    proximo_sorteio: "2026-09-14T11:00:00",
    valor_acumulado: 12000000,
    ultimo_resultado: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25],
    numero_concurso: 3200,
  },
  {
    slug: "quina",
    nome: "Quina",
    proximo_sorteio: "2026-09-14T11:00:00",
    valor_acumulado: 8500000,
    ultimo_resultado: [10, 25, 40, 55, 70],
    numero_concurso: 6500,
  },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getTimeRemaining(dateStr: string): string {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return "Sorteio em andamento!";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export function PainelTempoReal() {
  const [loterias, setLoterias] = useState(loteriasDestaque);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setLoterias(prev => [...prev]);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Painel em Tempo Real
          </h2>
          <p className="text-muted-foreground text-sm">
            Concursos mais recentes e próximos sorteios
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {loterias.map((loteria, index) => (
          <motion.div
            key={loteria.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{loteria.nome}</CardTitle>
                  <Badge variant="secondary">#{loteria.numero_concurso}</Badge>
                </div>
                <CardDescription>Último concurso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-1 flex-wrap">
                  {loteria.ultimo_resultado.slice(0, 6).map(d => (
                    <Badge key={d} variant="outline" className="min-w-[2rem] justify-center">
                      {String(d).padStart(2, "0")}
                    </Badge>
                  ))}
                  {loteria.ultimo_resultado.length > 6 && (
                    <Badge variant="secondary">+{loteria.ultimo_resultado.length - 6}</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      Acumulado
                    </span>
                    <span className="font-bold text-primary">
                      {formatCurrency(loteria.valor_acumulado)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Próximo sorteio
                    </span>
                    <span className="font-medium">
                      {getTimeRemaining(loteria.proximo_sorteio)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
