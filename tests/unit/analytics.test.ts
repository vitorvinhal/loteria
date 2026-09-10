import { describe, it, expect } from 'vitest';
import { calcularEstatisticas, calcularFrequenciaEmJanela, calcularAtrasoAtual } from '@/modules/analytics';
import { Loteria, Concurso } from '@/types';

const loteriaMock: Loteria = {
  id: 'megasena',
  slug: 'megasena',
  nome: 'Mega-Sena',
  universo_min: 1,
  universo_max: 60,
  qtd_dezenas_min: 6,
  qtd_dezenas_max: 15,
  qtd_dezenas_padrao: 6,
  dias_sorteio: ['domingo'],
  horario_sorteio: '11:00',
  preco_aposta_base: 5.00,
  regras_vitoria: [],
  ativo: true,
};

const concursosMock: Concurso[] = [
  {
    id: 'megasena-1',
    loteria_id: 'megasena',
    numero_concurso: 1,
    data_sorteio: '2026-01-01',
    dezenas_sorteadas: [5, 12, 23, 34, 45, 56],
    acumulou: false,
    valor_acumulado: 0,
    valor_estimado_proximo: 500000,
    data_proximo_concurso: '2026-01-08',
    local_sorteio: 'São Paulo',
    premiacoes: [],
    raw_response: null,
    criado_em: '2026-01-01',
    atualizado_em: '2026-01-01',
  },
  {
    id: 'megasena-2',
    loteria_id: 'megasena',
    numero_concurso: 2,
    data_sorteio: '2026-01-08',
    dezenas_sorteadas: [3, 18, 29, 41, 52, 60],
    acumulou: true,
    valor_acumulado: 500000,
    valor_estimado_proximo: 1000000,
    data_proximo_concurso: '2026-01-15',
    local_sorteio: 'Rio de Janeiro',
    premiacoes: [],
    raw_response: null,
    criado_em: '2026-01-08',
    atualizado_em: '2026-01-08',
  },
  {
    id: 'megasena-3',
    loteria_id: 'megasena',
    numero_concurso: 3,
    data_sorteio: '2026-01-15',
    dezenas_sorteadas: [1, 15, 28, 37, 44, 55],
    acumulou: false,
    valor_acumulado: 1000000,
    valor_estimado_proximo: 2000000,
    data_proximo_concurso: '2026-01-22',
    local_sorteio: 'Brasília',
    premiacoes: [],
    raw_response: null,
    criado_em: '2026-01-15',
    atualizado_em: '2026-01-15',
  },
];

describe('calcularEstatisticas', () => {
  it('deve calcular frequência de dezenas', () => {
    const stats = calcularEstatisticas(concursosMock, loteriaMock);

    expect(stats.frequencia.get(5)).toBe(1);
    expect(stats.frequencia.get(12)).toBe(1);
    expect(stats.frequencia.get(3)).toBe(1);
  });

  it('deve calcular distribuição par/ímpar', () => {
    const stats = calcularEstatisticas(concursosMock, loteriaMock);

    expect(stats.distribuicao_par_impar.length).toBe(3);
    expect(stats.distribuicao_par_impar[0]).toHaveProperty('par');
    expect(stats.distribuicao_par_impar[0]).toHaveProperty('impar');
  });

  it('deve calcular soma dos concursos', () => {
    const stats = calcularEstatisticas(concursosMock, loteriaMock);

    expect(stats.soma_concursos.min).toBeGreaterThan(0);
    expect(stats.soma_concursos.max).toBeGreaterThan(stats.soma_concursos.min);
    expect(stats.soma_concursos.media).toBeGreaterThan(0);
  });

  it('deve calcular repetição entre concursos', () => {
    const stats = calcularEstatisticas(concursosMock, loteriaMock);

    expect(stats.repeticao_entre_concursos.length).toBe(2);
  });

  it('deve retornar estatísticas vazias para lista vazia', () => {
    const stats = calcularEstatisticas([], loteriaMock);

    expect(stats.frequencia.size).toBe(60);
    expect(stats.distribuicao_par_impar.length).toBe(0);
  });

  it('deve respeitar janela de concursos', () => {
    const stats = calcularEstatisticas(concursosMock, loteriaMock, 2);

    expect(stats.repeticao_entre_concursos.length).toBe(1);
  });
});

describe('calcularFrequenciaEmJanela', () => {
  it('deve calcular frequência na janela especificada', () => {
    const freq = calcularFrequenciaEmJanela(concursosMock, 2);

    expect(freq.get(3)).toBe(1);
    expect(freq.get(18)).toBe(1);
    expect(freq.get(1)).toBe(1);
  });
});

describe('calcularAtrasoAtual', () => {
  it('deve calcular atraso de cada dezena', () => {
    const atraso = calcularAtrasoAtual(concursosMock, 1, 10);

    expect(atraso.get(1)).toBe(2);
    expect(atraso.get(5)).toBe(0);
    expect(atraso.get(7)).toBe(3);
  });
});
