"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, ChevronDown, Wand2, RefreshCw, AlertTriangle } from "lucide-react";

interface MetricaPalpite {
  quentes: number;
  atrasadas: number;
  pares: number;
  impares: number;
  soma: number;
  somaMedia: number;
  faixa: [number, number];
}

interface PalpiteResposta {
  loteria: string;
  nome: string;
  dezenas: number[];
  extras?: Record<string, number[]>;
  colunas?: number[][];
  motivo: string;
  metricas: MetricaPalpite;
}

export function PalpiteCard({ slug }: { slug: string }) {
  const router = useRouter();
  const [dados, setDados] = useState<PalpiteResposta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/ia/palpite/${slug}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao carregar o palpite.");
      const json = (await res.json()) as PalpiteResposta;
      setDados(json);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setCarregando(false);
    }
  }, [slug]);

  useEffect(() => {
    setDados(null);
    void carregar();
  }, [carregar]);

  const usarNoGerador = () => {
    if (!dados) return;
    const q = new URLSearchParams();
    q.set("dezenas", dados.dezenas.join(","));
    if (dados.colunas?.length) {
      q.set("colunas", dados.colunas.map((c) => c.join(",")).join(";"));
    }
    if (dados.extras && Object.keys(dados.extras).length) {
      q.set(
        "extras",
        Object.entries(dados.extras)
          .map(([tipo, vals]) => `${tipo}:${vals.join(",")}`)
          .join(";")
      );
    }
    router.push(`/criar-jogo/${slug}?${q.toString()}`);
  };

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/40 bg-card px-4 py-2 text-sm font-semibold shadow-lg hover:bg-accent transition-colors cursor-pointer"
      >
        <Sparkles className="h-4 w-4 text-fuchsia-500" />
        Palpite Forte
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-fuchsia-500/30 bg-card shadow-xl">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="h-4 w-4 text-fuchsia-500" />
          Palpite Forte da IA
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void carregar()}
            disabled={carregando}
            title="Recalcular"
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setAberto(false)}
            title="Minimizar"
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 p-3">
        {carregando && !dados && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculando palpite...
          </div>
        )}

        {erro && !carregando && (
          <div className="flex items-start gap-2 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {dados && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {dados.nome}
              </span>
              <Badge variant="outline" className="text-[10px]">
                estatístico
              </Badge>
            </div>

            {dados.colunas?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {dados.colunas.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-bold text-primary"
                  >
                    <span className="text-[9px] font-normal text-muted-foreground">C{i + 1}</span>
                    {c.join("")}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {dados.dezenas.map((d, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center justify-center h-8 min-w-[2rem] rounded-full bg-primary/10 text-primary text-sm font-bold tabular-nums border border-primary/20"
                  >
                    {String(d).padStart(2, "0")}
                  </span>
                ))}
              </div>
            )}

            {dados.extras && Object.keys(dados.extras).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(dados.extras).map(([tipo, vals]) => (
                  <Badge key={tipo} variant="secondary" className="text-[10px]">
                    {tipo}: {vals.join(", ")}
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground leading-snug">{dados.motivo}</p>

            <Button
              onClick={usarNoGerador}
              className="w-full h-9 gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
              size="sm"
            >
              <Wand2 className="h-4 w-4" />
              Usar no Gerador
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
