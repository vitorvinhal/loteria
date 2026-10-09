import { Concurso } from '@/types';

/**
 * Extrai os componentes extras (trevos, time, mês) do objeto bruto de um
 * concurso retornado pelas fontes externas. Os campos variam por loteria:
 * trevos (+Milionária), timeCoracao (Timemania) e mesSorte (Dia de Sorte).
 */
export function extrasDoConcurso(concurso: Concurso): Record<string, number[]> {
  const raw = (concurso.raw_response ?? {}) as Record<string, unknown>;
  const out: Record<string, number[]> = {};
  const paraNumeros = (v: unknown): number[] => {
    if (Array.isArray(v)) return v.map(Number).filter((n) => !isNaN(n));
    if (v != null && v !== '') {
      const n = Number(v);
      if (!isNaN(n)) return [n];
    }
    return [];
  };
  const trevos = paraNumeros(raw.trevos);
  if (trevos.length) out.trevo = trevos;
  const time = paraNumeros(raw.timeCoracao);
  if (time.length) out.time = time;
  const mes = paraNumeros(raw.mesSorte);
  if (mes.length) out.mes = mes;
  return out;
}
