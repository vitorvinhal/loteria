"use client";

import { Avatar11 } from "./avatar-11";
import { Button } from "@/components/ui/button";
import { Loader2, PhoneOff, Phone, Mic, Volume2 } from "lucide-react";

function formatarTempo(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

interface Props {
  ativa: boolean;
  fase: string;
  rotuloFase: string;
  transcricao: string;
  ultimaFala11: string;
  erro: string | null;
  segundos: number;
  suporta: boolean;
  onIniciar: () => void;
  onParar: () => void;
  onFechar: () => void;
}

export function VoiceCallPanel({
  ativa,
  fase,
  rotuloFase,
  transcricao,
  ultimaFala11,
  erro,
  segundos,
  suporta,
  onIniciar,
  onParar,
  onFechar,
}: Props) {
  if (!ativa) return null;

  const ouvindo = fase === "ouvindo";
  const pensando = fase === "pensando";
  const falando = fase === "falando";

  return (
    <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 gap-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        Ligação ao vivo · {formatarTempo(segundos)}
      </div>

      <div className="relative">
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 ${
            ouvindo
              ? "bg-primary/20 scale-110 animate-pulse"
              : falando
                ? "bg-emerald-500/20 scale-110 animate-pulse"
                : pensando
                  ? "bg-amber-500/15 scale-105"
                  : "bg-muted/30"
          }`}
          style={{ width: 140, height: 140 }}
        />
        <div className="relative">
          <Avatar11 size={120} className="rounded-full" />
        </div>
      </div>

      <div className="text-center space-y-1 max-w-md">
        <p className="text-lg font-semibold">
          {fase === "parado" ? "Pronto para ligar" : fase === "erro" ? "Algo deu errado" : rotuloFase}
        </p>
        {ouvindo && <p className="text-sm text-primary">Fale agora — a 11 está ouvindo</p>}
        {pensando && <p className="text-sm text-amber-500">Processando sua fala...</p>}
        {falando && (
          <p className="text-sm text-emerald-500 flex items-center justify-center gap-1.5">
            <Volume2 className="h-4 w-4" /> Falando com você
          </p>
        )}
      </div>

      {(transcricao || ultimaFala11) && (
        <div className="w-full max-w-md space-y-3 max-h-40 overflow-y-auto">
          {transcricao && (
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm max-w-[85%]">
                {transcricao}
              </div>
            </div>
          )}
          {ultimaFala11 && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-tl-sm px-3.5 py-2 text-sm max-w-[85%]">
                {ultimaFala11}
              </div>
            </div>
          )}
        </div>
      )}

      {erro && <p className="text-sm text-destructive text-center max-w-md">{erro}</p>}

      {!suporta && (
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Seu navegador não suporta ligação por voz. Use Chrome ou Edge.
        </p>
      )}

      <div className="flex items-center gap-4 mt-2">
        {fase === "parado" || fase === "erro" ? (
          <Button
            type="button"
            size="lg"
            onClick={onIniciar}
            disabled={!suporta}
            className="h-16 w-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white"
            title="Ligar para a 11"
          >
            <Phone className="h-7 w-7" />
          </Button>
        ) : (
          <>
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              {ouvindo ? <Mic className="h-5 w-5 text-primary animate-pulse" /> : <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
            <Button
              type="button"
              size="lg"
              onClick={onParar}
              className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-500 text-white"
              title="Desligar"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onFechar}
        className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer mt-2"
      >
        Voltar ao chat
      </button>
    </div>
  );
}
