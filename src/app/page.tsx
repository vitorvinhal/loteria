"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dices,
  BarChart3,
  GitCompare,
  Users,
  BookOpen,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Clock,
  Trophy,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { HeroSection, LoteriasGrid, FeaturesSection, CTASection } from "@/components/lottery/hero-section";

interface ResultadoLoteria {
  slug: string;
  nome: string;
  numero_concurso: number;
  dezenas_sorteadas: number[];
  valor_acumulado: number;
  acumulou: boolean;
  data_sorteio: string;
  proximo_concurso: { numero: number; data: string; acumulado: number } | null;
  fonte: "caixa" | "indisponivel" | "erro";
}

interface LoteriasResponse {
  loterias: ResultadoLoteria[];
  atualizado_em: string;
}

const loteriasMeta: Record<string, { cor: string; emoji: string }> = {
  lotofacil: { cor: "bg-purple-500", emoji: "🟣" },
  megasena: { cor: "bg-green-500", emoji: "🟢" },
  quina: { cor: "bg-blue-500", emoji: "🔵" },
  lotomania: { cor: "bg-orange-500", emoji: "🟠" },
  duplasena: { cor: "bg-red-500", emoji: "🔴" },
  timemania: { cor: "bg-yellow-500", emoji: "🟡" },
  diadesorte: { cor: "bg-pink-500", emoji: "🩷" },
  maismilionaria: { cor: "bg-indigo-500", emoji: "🔮" },
  supersete: { cor: "bg-teal-500", emoji: "🩵" },
};

function formatCurrency(value: number): string {
  if (value === 0) return "Indisponível";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    // Handle DD/MM/YYYY format from CAIXA API
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${day}/${month}/${year}`;
      }
    }
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function ResultadoCard({ resultado, index }: { resultado: ResultadoLoteria; index: number }) {
  const meta = loteriasMeta[resultado.slug] || { cor: "bg-gray-500", emoji: "⚪" };
  const isIndisponivel = resultado.fonte !== "caixa";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
    >
      <Card className="h-full hover:shadow-lg transition-all duration-300 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${meta.cor}`} />
              <CardTitle className="text-base">{resultado.nome}</CardTitle>
            </div>
            <Badge variant={resultado.acumulou ? "default" : "secondary"} className="text-xs">
              {isIndisponivel ? "Sem dados" : `#${resultado.numero_concurso}`}
            </Badge>
          </div>
          {resultado.data_sorteio && (
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(resultado.data_sorteio)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isIndisponivel ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <AlertCircle className="h-4 w-4" />
              <span>Dados indisponíveis no momento</span>
            </div>
          ) : (
            <>
              <div className="flex gap-1 flex-wrap">
                {resultado.dezenas_sorteadas.map((d) => (
                  <Badge
                    key={d}
                    variant="outline"
                    className="min-w-[2rem] justify-center font-mono text-xs"
                  >
                    {String(d).padStart(2, "0")}
                  </Badge>
                ))}
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    Acumulado
                  </span>
                  <span className={`font-bold ${resultado.acumulou ? "text-yellow-500" : "text-primary"}`}>
                    {formatCurrency(resultado.valor_acumulado)}
                  </span>
                </div>

                {resultado.proximo_concurso && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Próximo
                    </span>
                    <span className="font-bold text-emerald-500">
                      {formatCurrency(resultado.proximo_concurso.acumulado)}
                    </span>
                  </div>
                )}

                {resultado.acumulou && (
                  <Badge variant="destructive" className="w-full justify-center text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    ACUMULOU!
                  </Badge>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ResultadosSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="h-[220px] animate-pulse">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
              <div className="h-5 w-12 bg-muted rounded" />
            </div>
            <div className="h-3 w-20 bg-muted rounded mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="h-6 w-8 bg-muted rounded" />
              ))}
            </div>
            <div className="h-4 w-32 bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Home() {
  const [resultados, setResultados] = useState<ResultadoLoteria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchResultados = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    setError(null);

    try {
      const res = await fetch("/api/loterias");
      if (!res.ok) throw new Error("Erro ao buscar resultados");
      const data: LoteriasResponse = await res.json();
      setResultados(data.loterias);
      setUltimaAtualizacao(data.atualizado_em);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchResultados();
    const interval = setInterval(() => fetchResultados(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchResultados]);

  const resultadosDisponiveis = resultados.filter((r) => r.fonte === "caixa");

  return (
    <div className="flex flex-col">
      <HeroSection />

      {/* Resultados em Tempo Real */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </div>
              <h2 className="text-2xl font-bold">Resultados em Tempo Real</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Concursos mais recentes das loterias da CAIXA
              {ultimaAtualizacao && (
                <span className="ml-2">
                  · Atualizado {formatDate(ultimaAtualizacao)}
                </span>
              )}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchResultados(true)}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </Button>
          </motion.div>
        </div>

        {isLoading ? (
          <ResultadosSkeleton />
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar resultados</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => fetchResultados()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </motion.div>
        ) : resultadosDisponiveis.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum resultado disponível no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resultadosDisponiveis.map((resultado, index) => (
              <ResultadoCard key={resultado.slug} resultado={resultado} index={index} />
            ))}
          </div>
        )}
      </section>

      <LoteriasGrid />
      <FeaturesSection />
      <CTASection />
    </div>
  );
}
