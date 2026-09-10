"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dices,
  BarChart3,
  History,
  GitCompare,
  PenTool,
  Users,
  BookOpen,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Trophy,
  Clock,
} from "lucide-react";

const loterias = [
  { slug: "lotofacil", nome: "Lotofácil", numeros: "1-25", dezenas: "15", cor: "bg-purple-500", proximo: "Domingo 11h" },
  { slug: "megasena", nome: "Mega-Sena", numeros: "1-60", dezenas: "6", cor: "bg-green-500", proximo: "Domingo 11h" },
  { slug: "quina", nome: "Quina", numeros: "1-80", dezenas: "5", cor: "bg-blue-500", proximo: "Domingo 11h" },
  { slug: "lotomania", nome: "Lotomania", numeros: "0-99", dezenas: "50", cor: "bg-orange-500", proximo: "Terça 20h" },
  { slug: "duplasena", nome: "Dupla Sena", numeros: "1-50", dezenas: "6", cor: "bg-red-500", proximo: "Sábado 20h" },
  { slug: "timemania", nome: "Timemania", numeros: "1-80", dezenas: "10", cor: "bg-yellow-500", proximo: "Domingo 11h" },
  { slug: "diadesorte", nome: "Dia de Sorte", numeros: "1-31", dezenas: "7", cor: "bg-pink-500", proximo: "Domingo 11h" },
  { slug: "maismilionaria", nome: "+Milionária", numeros: "1-50", dezenas: "6", cor: "bg-indigo-500", proximo: "Domingo 11h" },
  { slug: "supersete", nome: "Super Sete", numeros: "0-9", dezenas: "7", cor: "bg-teal-500", proximo: "Sexta 20h" },
];

const features = [
  {
    icon: Dices,
    title: "Geração Inteligente",
    description: "10 estratégias avançadas para gerar jogos com base em estatísticas reais.",
  },
  {
    icon: BarChart3,
    title: "Score de Qualidade",
    description: "Cada jogo recebe um score de 0 a 100 de aderência estatística.",
  },
  {
    icon: TrendingUp,
    title: "Análise Completa",
    description: "Frequência, atraso, soma, paridade e distribuição detalhadas.",
  },
  {
    icon: GitCompare,
    title: "Comparação com Resultados",
    description: "Compare seus jogos com qualquer concurso da CAIXA.",
  },
  {
    icon: Users,
    title: "Simulação de Bolão",
    description: " Monte seu bolão e veja projeções de premiação por cota.",
  },
  {
    icon: Shield,
    title: "Dados Confiáveis",
    description: "Sincronização com APIs oficiais da CAIXA com fallback automático.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center space-y-8"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Badge variant="secondary" className="px-4 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              Sistema Inteligente de Loterias
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-6xl font-bold tracking-tight"
          >
            Gerador{" "}
            <span className="text-primary">Inteligente</span>
            <br />
            de Jogos de Loteria
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-2xl text-lg text-muted-foreground"
          >
            Ferramentas estatísticas e combinatórias para criar, analisar e comparar jogos
            das loterias da CAIXA. Cada jogo recebe um score de qualidade baseado em
            dados reais do histórico.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link href="/gerar/megasena">
              <Button size="lg" className="gap-2">
                <Zap className="h-4 w-4" />
                Começar a Gerar Jogos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/estrategias">
              <Button size="lg" variant="outline" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Ver Estratégias
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export function LoteriasGrid() {
  return (
    <section className="container mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center space-y-4 mb-12"
      >
        <h2 className="text-3xl font-bold">Loterias Disponíveis</h2>
        <p className="text-muted-foreground">
          Escolha a loteria e comece a gerar jogos inteligentes
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        {loterias.map((loteria) => (
          <motion.div key={loteria.slug} variants={item}>
            <Link href={`/gerar/${loteria.slug}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className={`w-full h-2 rounded-full ${loteria.cor} mb-2`} />
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {loteria.nome}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Números: {loteria.numeros}</p>
                    <p>Dezenas: {loteria.dezenas}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{loteria.proximo}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section className="container mx-auto px-4 py-16">
      <Separator className="mb-16" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center space-y-4 mb-12"
      >
        <h2 className="text-3xl font-bold">Funcionalidades</h2>
        <p className="text-muted-foreground">
          Tudo que você precisa para jogar de forma mais inteligente
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {features.map((feature) => (
          <motion.div key={feature.title} variants={item}>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export function CTASection() {
  return (
    <section className="container mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
      >
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Pronto para começar?</h3>
                <p className="text-primary-foreground/80">
                  Gere seus primeiros jogos agora mesmo com nossas estratégias inteligentes.
                </p>
              </div>
              <Link href="/gerar/megasena">
                <Button size="lg" variant="secondary" className="gap-2 whitespace-nowrap">
                  Gerar Jogos Agora
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
