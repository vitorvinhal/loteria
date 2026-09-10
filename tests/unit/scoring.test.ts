import { describe, it, expect } from 'vitest';
import { calcularScore, gerarExplicacaoScore } from '@/modules/scoring';
import { Loteria, Estatisticas } from '@/types';

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
  regras_vitoria: [
    { acertos_min: 4, acertos_max: 4, descricao: 'Quadra' },
    { acertos_min: 5, acertos_max: 5, descricao: 'Quina' },
    { acertos_min: 6, acertos_max: 6, descricao: 'Sena' },
  ],
  ativo: true,
};

const estatisticasMock: Estatisticas = {
  frequencia: new Map([
    [1, 10], [2, 8], [3, 12], [4, 6], [5, 15],
    [10, 14], [15, 11], [20, 9], [25, 13], [30, 7],
    [35, 10], [40, 8], [45, 12], [50, 6], [55, 15], [60, 11],
  ]),
  frequencia_percentual: new Map([
    [1, 5], [2, 4], [3, 6], [4, 3], [5, 7.5],
    [10, 7], [15, 5.5], [20, 4.5], [25, 6.5], [30, 3.5],
    [35, 5], [40, 4], [45, 6], [50, 3], [55, 7.5], [60, 5.5],
  ]),
  atraso: new Map([
    [1, 5], [2, 3], [3, 1], [4, 8], [5, 2],
    [10, 1], [15, 4], [20, 6], [25, 2], [30, 7],
    [35, 3], [40, 5], [45, 1], [50, 9], [55, 2], [60, 4],
  ]),
  distribuicao_par_impar: [
    { par: 3, impar: 3 },
    { par: 2, impar: 4 },
    { par: 4, impar: 2 },
  ],
  soma_concursos: {
    min: 50,
    max: 250,
    media: 150,
    desvio_padrao: 40,
    faixa_frequente: [120, 180],
  },
  distribuicao_quadrantes: new Map([
    [1, 15], [2, 12], [3, 10], [4, 8],
  ]),
  repeticao_entre_concursos: [2, 3, 1, 4, 2],
  sequencias_consecutivas: [2, 3, 2],
  terminacoes: new Map([
    [0, 5], [1, 8], [2, 6], [3, 7], [4, 5],
    [5, 9], [6, 4], [7, 6], [8, 5], [9, 7],
  ]),
};

describe('calcularScore', () => {
  it('deve retornar score entre 0 e 100', () => {
    const dezenas = [5, 15, 25, 35, 45, 55];
    const score = calcularScore(dezenas, loteriaMock, estatisticasMock);

    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it('deve retornar breakdown com todos os campos', () => {
    const dezenas = [5, 15, 25, 35, 45, 55];
    const score = calcularScore(dezenas, loteriaMock, estatisticasMock);

    expect(score).toHaveProperty('frequencia');
    expect(score).toHaveProperty('atraso');
    expect(score).toHaveProperty('par_impar');
    expect(score).toHaveProperty('soma');
    expect(score).toHaveProperty('distribuicao');
    expect(score).toHaveProperty('exclusao_padroes');
    expect(score).toHaveProperty('aderencia_estrategia');
    expect(score).toHaveProperty('pesos');
    expect(score).toHaveProperty('total');
  });

  it('deve penalizar sequências longas', () => {
    const dezenasComSequencia = [1, 2, 3, 4, 5, 6];
    const dezenasSemSequencia = [1, 15, 30, 45, 52, 60];

    const scoreComSequencia = calcularScore(dezenasComSequencia, loteriaMock, estatisticasMock);
    const scoreSemSequencia = calcularScore(dezenasSemSequencia, loteriaMock, estatisticasMock);

    expect(scoreComSequencia.exclusao_padroes).toBeLessThan(scoreSemSequencia.exclusao_padroes);
  });

  it('deve premiar boa distribuição por quadrantes', () => {
    const dezenasDistribuidas = [5, 20, 35, 50, 55, 60];
    const dezenasConcentradas = [1, 2, 3, 4, 5, 6];

    const scoreDistribuido = calcularScore(dezenasDistribuidas, loteriaMock, estatisticasMock);
    const scoreConcentrado = calcularScore(dezenasConcentradas, loteriaMock, estatisticasMock);

    expect(scoreDistribuido.distribuicao).toBeGreaterThanOrEqual(scoreConcentrado.distribuicao);
  });
});

describe('gerarExplicacaoScore', () => {
  it('deve gerar explicação com score total', () => {
    const breakdown = {
      frequencia: 0.8,
      atraso: 0.6,
      par_impar: 0.9,
      soma: 0.7,
      distribuicao: 0.85,
      exclusao_padroes: 0.95,
      aderencia_estrategia: 0.7,
      pesos: {},
      total: 82,
    };

    const explicacao = gerarExplicacaoScore(breakdown, loteriaMock);

    expect(explicacao).toContain('82/100');
    expect(typeof explicacao).toBe('string');
    expect(explicacao.length).toBeGreaterThan(0);
  });
});
