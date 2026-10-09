"use client";

import { Badge } from "@/components/ui/badge";
import { getFaixaColunas } from "@/lib/loterias";
import type { ComponenteExtra, Loteria } from "@/types";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ---------------------------------------------------------------------------
// Volante posicional (Super Sete): 7 colunas × dígitos 0–9
// ---------------------------------------------------------------------------

interface VolantePosicionalProps {
  loteria: Loteria;
  /** Total de marcações da aposta (7 a 21). */
  total: number;
  /** Estado controlado: uma lista de dígitos por coluna. */
  colunas: number[][];
  onChange: (colunas: number[][]) => void;
}

export function VolantePosicional({ loteria, total, colunas, onChange }: VolantePosicionalProps) {
  const cfg = loteria.colunas;
  if (!cfg) return null;

  const faixa = getFaixaColunas(loteria.slug, total);
  const min = faixa?.min ?? 1;
  const max = faixa?.max ?? 1;
  const totalMarcado = colunas.reduce((s, c) => s + c.length, 0);

  const digitos: number[] = [];
  for (let d = cfg.universo_min; d <= cfg.universo_max; d++) digitos.push(d);

  const toggle = (colIdx: number, digito: number) => {
    const atual = colunas[colIdx] ?? [];
    if (atual.includes(digito)) {
      // Só permite remover acima do mínimo por coluna da faixa.
      if (atual.length <= min) return;
      const novo = atual.filter(d => d !== digito).sort((a, b) => a - b);
      onChange(colunas.map((c, i) => (i === colIdx ? novo : c)));
    } else {
      if (atual.length >= max || totalMarcado >= total) return;
      const novo = [...atual, digito].sort((a, b) => a - b);
      onChange(colunas.map((c, i) => (i === colIdx ? novo : c)));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Marque de <strong>1 a {max}</strong> dígito{max > 1 ? "s" : ""} por coluna
        </span>
        <span className="text-sm font-bold">
          <span className={totalMarcado === total ? "text-emerald-500" : ""}>{totalMarcado}</span>
          <span className="text-muted-foreground"> / {total}</span>
        </span>
      </div>

      <div className="p-3 rounded-xl border border-muted bg-card/50 overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[420px]">
          {Array.from({ length: cfg.total_colunas }, (_, colIdx) => {
            const marcados = colunas[colIdx] ?? [];
            const completo = marcados.length >= min && marcados.length <= max;
            return (
              <div key={colIdx} className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Col {colIdx + 1}
                  </span>
                  <Badge
                    variant={completo && marcados.length > 0 ? "default" : "secondary"}
                    className="text-[10px] px-1 py-0"
                  >
                    {marcados.length}/{max}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  {digitos.map((d) => {
                    const isSelected = marcados.includes(d);
                    const disabled =
                      !isSelected && (marcados.length >= max || totalMarcado >= total);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggle(colIdx, d)}
                        disabled={disabled}
                        className={`
                          w-full aspect-square rounded-md text-sm font-mono font-bold
                          transition-all duration-150 border-2 flex items-center justify-center
                          ${isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                            : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                          }
                          ${disabled
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer active:scale-95"
                          }
                        `}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {colunas.map((c, i) => (
          <Badge key={i} variant={c.length > 0 ? "secondary" : "outline"} className="text-xs font-mono">
            C{i + 1}: {c.length > 0 ? c.join(" ") : "—"}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Volante de extras: Time do Coração, Mês da Sorte, Trevos
// ---------------------------------------------------------------------------

interface ExtrasVolanteProps {
  componentes: ComponenteExtra[];
  extras: Record<string, number[]>;
  onChange: (tipo: string, valores: number[]) => void;
}

export function ExtrasVolante({ componentes, extras, onChange }: ExtrasVolanteProps) {
  if (!componentes.length) return null;

  return (
    <div className="space-y-4">
      {componentes.map((comp) => {
        const selecionados = extras[comp.tipo] ?? [];
        const universo: number[] = [];
        for (let i = comp.universo_min; i <= comp.universo_max; i++) universo.push(i);
        const ehMultipla = comp.qtd_max > 1;

        const toggle = (valor: number) => {
          if (selecionados.includes(valor)) {
            onChange(comp.tipo, selecionados.filter(v => v !== valor).sort((a, b) => a - b));
          } else {
            if (ehMultipla && selecionados.length >= comp.qtd_max) return;
            onChange(comp.tipo, [...selecionados, valor].sort((a, b) => a - b));
          }
        };

        return (
          <div key={comp.tipo} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                {comp.tipo === "trevo" ? "🍀 " : comp.tipo === "time" ? "⚽ " : "📅 "}
                {comp.nome}
                {comp.obrigatorio && <span className="text-destructive ml-1">*</span>}
              </span>
              <span className="text-xs text-muted-foreground">
                {ehMultipla
                  ? `${selecionados.length} de até ${comp.qtd_max} (mín. ${comp.qtd_min})`
                  : selecionados.length > 0
                    ? "selecionado"
                    : "selecione 1"}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-muted bg-card/50">
              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                {universo.map((valor) => {
                  const isSelected = selecionados.includes(valor);
                  const disabled =
                    !isSelected && ehMultipla && selecionados.length >= comp.qtd_max;
                  const rotulo =
                    comp.tipo === "mes" ? MESES[valor - 1]?.slice(0, 3) : String(valor).padStart(2, "0");
                  return (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => toggle(valor)}
                      disabled={disabled}
                      title={comp.tipo === "mes" ? MESES[valor - 1] : undefined}
                      className={`
                        ${comp.tipo === "mes" ? "px-2 py-2" : "aspect-square"}
                        rounded-lg text-xs font-bold tabular-nums transition-all duration-150
                        border-2 flex items-center justify-center
                        ${isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                          : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                        }
                        ${disabled
                          ? "opacity-40 cursor-not-allowed"
                          : "cursor-pointer active:scale-95"
                        }
                      `}
                    >
                      {rotulo}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
