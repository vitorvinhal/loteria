const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nova funcionalidade
        'fix',      // Correção de bug
        'docs',     // Documentação
        'style',    // Formatação (não afeta lógica)
        'refactor', // Refatoração sem mudança de comportamento
        'perf',     // Melhoria de performance
        'test',     // Adição/correção de testes
        'build',    // Sistema de build ou dependências externas
        'ci',       // Configuração de CI/CD
        'chore',    // Tarefas de manutenção
        'revert',   // Reverter commit anterior
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 120],
    'footer-max-line-length': [1, 'always', 120],
  },
};

export default config;
