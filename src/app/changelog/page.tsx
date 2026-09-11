"use client";

import { Badge } from "@/components/ui/badge";
import {
  Zap,
  BarChart3,
  Palette,
  Database,
  Code2,
  Layers,
  CheckCircle2,
  Target,
  Layout,
  PenLine,
  Users,
  ShieldCheck,
  GitCompare,
} from "lucide-react";

interface ChangelogSection {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: string[];
}

interface ChangelogEntry {
  version: string;
  date: string;
  type: "major" | "minor" | "patch";
  tag?: string;
  sections: ChangelogSection[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "2.7.0",
    date: "2026-09-10",
    type: "minor",
    tag: "Comparar todos + Estatísticas completas + Mobile",
    sections: [
      {
        title: "Comparar Jogos",
        icon: <GitCompare className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "Aba de comparação agora mostra TODOS os lotes salvos, de qualquer loteria",
          "Ao clicar 'Comparar lote', busca automaticamente o resultado da loteria correta",
          "Jogo selecionado usa a loteria dele para comparar",
        ],
      },
      {
        title: "Estatísticas Completas",
        icon: <BarChart3 className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "Estatísticas agora usam TODOS os concursos do banco (não só 50/100)",
        ],
      },
      {
        title: "Mobile",
        icon: <Layout className="w-5 h-5" />,
        color: "text-purple-500",
        items: [
          "Filtros segmentados com rolagem horizontal no mobile",
          "Melhor espaçamento entre cabeçalhos flexíveis",
        ],
      },
    ],
  },
  {
    version: "2.6.9",
    date: "2026-09-10",
    type: "minor",
    tag: "Foto nos lotes",
    sections: [
      {
        title: "Foto de Perfil nos Lotes",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "Ao subir foto, todos os seus lotes são atualizados com a nova foto automaticamente",
          "Lotes antigos sem foto agora mostram a foto do usuário logado",
          "Lotes sem criador mostram o nome do usuário logado",
        ],
      },
    ],
  },
  {
    version: "2.6.8",
    date: "2026-09-10",
    type: "minor",
    tag: "Score 90+ + Copiar + Mobile",
    sections: [
      {
        title: "Score para 90+",
        icon: <Target className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "Score recalibrado (45 + total×56) — bons candidatos alcançam 80-95",
          "Pedir jogos com 90 agora é viável",
        ],
      },
      {
        title: "Copiar Jogos",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "Copiar lote inteiro de uma vez no histórico",
          "Copiar jogo individual em cada linha",
        ],
      },
      {
        title: "Melhorias Mobile",
        icon: <Layout className="w-5 h-5" />,
        color: "text-purple-500",
        items: [
          "Ajustes de responsividade (inputs menores, botões compactos, padding)",
          "Tabelas com rolagem suave no toque",
        ],
      },
    ],
  },
  {
    version: "2.6.5",
    date: "2026-09-10",
    type: "minor",
    tag: "Score corrigido + rejeição",
    sections: [
      {
        title: "Score Recalibrado",
        icon: <Target className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "Scores recalibrados (20 + score×80) — agora scores altos são alcançáveis",
          "A melhor estratégia continua na frente (ordem relativa preservada)",
        ],
      },
      {
        title: "Rejeição de Jogos Baixos",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "Jogos abaixo do score mínimo são REJEITADOS (não aparecem)",
          "O sistema gera até achar a quantidade pedida que passa na meta",
          "Aviso claro quando não é possível gerar todos acima da meta",
        ],
      },
      {
        title: "Geração",
        icon: <BarChart3 className="w-5 h-5" />,
        color: "text-red-500",
        items: [
          "60 candidatos por tentativa (antes 40)",
          "Se não atingir a meta, mostra quantos foram aprovados e quantos rejeitados",
        ],
      },
    ],
  },
  {
    version: "2.6.4",
    date: "2026-09-10",
    type: "minor",
    tag: "Análise lote completo",
    sections: [
      {
        title: "Análise",
        icon: <BarChart3 className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "Botão 'Analisar Lote Todo' analisa todos os jogos do lote",
          "Botão individual de análise por jogo",
          "Resultados do lote exibidos em cards com score e estatísticas",
        ],
      },
      {
        title: "Criador do lote",
        icon: <Users className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "Jogos gerados agora registram criado_por e avatar do usuário",
          "Lotes novos não aparecem mais como 'Anônimo'",
        ],
      },
      {
        title: "Sync",
        icon: <Database className="w-5 h-5" />,
        color: "text-purple-500",
        items: [
          "Batch-completo corrigido para não duplicar concursos",
          "Status de sincronização mais confiável",
        ],
      },
    ],
  },
  {
    version: "2.6.3",
    date: "2026-09-10",
    type: "minor",
    tag: "Fix 494 + Bolão com convite",
    sections: [
      {
        title: "Fix 494 (header grande)",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-red-500",
        items: [
          "Middleware de auth removido — proteção agora é client-side (AuthGuard)",
          "Foto de perfil movida para tabela perfil_foto no banco (fora do JWT)",
          "Cookie/JWT ficam pequenos — não estoura mais o limite do Vercel",
          "IMPORTANTE: faça logout/login ou limpe os cookies após atualizar",
        ],
      },
      {
        title: "Bolão com Convite",
        icon: <Users className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "Convide outro usuário do site por email para o bolão",
          "O convite registra loteria, cotas e jogos",
          "Participantes convidados aparecem na lista do bolão",
          "Nova tabela convites_bolao no banco",
        ],
      },
      {
        title: "Geração",
        icon: <Target className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "Tentativas ampliadas (até 200.000) com timeout seguro de 50s",
        ],
      },
    ],
  },
  {
    version: "2.6.2",
    date: "2026-09-10",
    type: "minor",
    tag: "Progresso real + score + fix header",
    sections: [
      {
        title: "Progresso Real",
        icon: <BarChart3 className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "Barra de progresso agora mostra a contagem real: N de M jogos com score mínimo",
          "Exibe maior score encontrado na busca",
          "Aviso claro quando não é possível atingir o score mínimo pedido",
        ],
      },
      {
        title: "Geração de Scores Altos",
        icon: <Target className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "Gera até 40 candidatos por tentativa (antes 6) — mais chance de achar scores altos",
          "Limite de tentativas ampliado (até 20.000)",
          "Estratégia gera 8 variações + completadas por aleatórias",
          "Melhor rastreamento do maior score encontrado",
        ],
      },
      {
        title: "Correção Header 494",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-red-500",
        items: [
          "Middleware não renova token a cada request (getSession em vez de getUser)",
          "Matcher não processa mais assets (css/js/ico)",
          "Corrige REQUEST_HEADER_TOO_LARGE no Vercel",
        ],
      },
    ],
  },
  {
    version: "2.6.1",
    date: "2026-09-10",
    type: "minor",
    tag: "Filtros por data + visual",
    sections: [
      {
        title: "Filtros por Data",
        icon: <BarChart3 className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "Análise, Comparação e Histórico agora filtram por período (Tudo / 7 dias / 30 dias)",
          "Filtro como botões segmentados ao lado dos controles",
        ],
      },
      {
        title: "Visual Reorganizado",
        icon: <Layout className="w-5 h-5" />,
        color: "text-purple-500",
        items: [
          "Análise: contagem de lotes, botão filtrar período, botão 'Analisar 1º jogo' por lote",
          "Comparação: botão 'Comparar lote' em cada lote + filtro por período",
          "Histórico: filtros de loteria e período juntos, cards de lote mais limpos",
        ],
      },
      {
        title: "Comparação",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "link ?loteId= na URL compara o lote inteiro automaticamente",
          "Botão 'Comparar lote' compara todos os jogos do lote de uma vez",
        ],
      },
    ],
  },
  {
    version: "2.6.0",
    date: "2026-09-10",
    type: "minor",
    tag: "Login obrigatório + Painel Admin",
    sections: [
      {
        title: "Login Obrigatório",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "O site agora exige login para usar todas as funcionalidades",
          "Sem login você acessa apenas a home, changelog e as telas de autenticação",
          "Sessão protegida por cookies (redireciona para /auth/login)",
        ],
      },
      {
        title: "Painel do Administrador",
        icon: <ShieldCheck className="w-5 h-5" />,
        color: "text-purple-500",
        items: [
          "Nova página /admin exclusiva para administradores",
          "Admin pode excluir qualquer lote do histórico (de qualquer usuário)",
          "Visão geral: total de jogos, criadores e lotes",
          "Acesso ao painel aparece no navbar para o admin",
        ],
      },
      {
        title: "Controle de Acesso",
        icon: <Users className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "DELETE de lotes: admin pode excluir tudo, demais usuários só os próprios",
          "admin identificado por metadata de role ou e-mail de administrador",
        ],
      },
    ],
  },
  {
    version: "2.5.1",
    date: "2026-09-10",
    type: "minor",
    tag: "Histórico compartilhado",
    sections: [
      {
        title: "Histórico Compartilhado",
        icon: <Users className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "Jogos de todos os usuários aparecem no histórico",
          "Cada lote mostra a foto de perfil e o nome do criador",
          "Só o dono pode excluir o próprio lote",
          "Jogos agrupados por lote (cada geração é um grupo separado)",
        ],
      },
      {
        title: "Análise e Comparação",
        icon: <Layout className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "Análise lista os lotes salvos com foto, criador, data e dia",
          "Comparação lista os lotes salvos agrupados por criador",
          "Interface mais intuitiva para escolher jogos dos lotes",
        ],
      },
      {
        title: "Perfil",
        icon: <PenLine className="w-5 h-5" />,
        color: "text-purple-500",
        items: [
          "Navbar mostra o nome escolhido nas configurações (não mais o email)",
          "Foto de perfil maior e mais visível no navbar e no mobile",
        ],
      },
    ],
  },
  {
    version: "2.5.0",
    date: "2026-09-10",
    type: "minor",
    tag: "Sync completo + RLS + Visual",
    sections: [
      {
        title: "Sincronização Completa",
        icon: <Database className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "Novo endpoint /api/sync/batch-completo baixa TODOS os concursos de todas as loterias em poucas chamadas",
          "Sem limite de concursos — histórico completo disponível no banco",
          "''Baixar Todos'' e ''Sincronizar Todas'' agora usam a sincronização em massa",
          "Sincronização muito mais rápida (bulk em vez de concurso por concurso)",
        ],
      },
      {
        title: "RLS Corrigido (histórico vazio)",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-red-500",
        items: [
          "Rotas de lotes/jogos usam cliente autenticado (respeita auth.uid() do RLS)",
          "Histórico, Painel, Análise e Comparar agora exibem os jogos do usuário logado",
          "Jogos salvos sem login permanecem públicos",
        ],
      },
      {
        title: "Visual",
        icon: <Layout className="w-5 h-5" />,
        color: "text-purple-500",
        items: [
          "Dropdown de seleção mais visível (contraste, borda e itens maiores)",
          "Sheet de detalhes do concurso redesenhada (cards, data formatada corretamente)",
          "Correção de data (''Invalid Date'') ao exibir concursos",
        ],
      },
      {
        title: "Foto de perfil",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-green-500",
        items: [
          "Salva no banco (user_metadata) — visível em qualquer dispositivo",
          "Exibida no navbar (desktop e mobile)",
        ],
      },
    ],
  },
  {
    version: "2.4.2",
    date: "2026-09-10",
    type: "minor",
    tag: "Foto de perfil no banco",
    sections: [
      {
        title: "Foto de Perfil",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-green-500",
        items: [
          "Foto agora é salva no banco (user_metadata) como imagem base64 comprimida (256px)",
          "Não depende mais do Storage (corrige 'Bucket not found')",
          "Visível na navbar (desktop e mobile) e na página de Configurações",
          "Funciona em qualquer dispositivo onde o usuário estiver logado",
        ],
      },
    ],
  },
  {
    version: "2.4.1",
    date: "2026-09-10",
    type: "minor",
    tag: "Score Real + Nomear Jogos + Supabase 100%",
    sections: [
      {
        title: "Score System Corrigido",
        icon: <Target className="w-5 h-5" />,
        color: "text-green-500",
        items: [
          "Estatísticas agora buscam da API externa quando o banco está vazio (score não fica zerado)",
          "Geração gera 6 candidatos por tentativa (estratégia + aleatórios) até atingir a quantidade pedida",
          "Relaxamento progressivo de score se o mínimo for inatingível, com aviso",
          "Limites de tentativas ampliados (até 10.000 tentativas / 120s)",
        ],
      },
      {
        title: "Nomear Jogos",
        icon: <PenLine className="w-5 h-5" />,
        color: "text-purple-500",
        items: [
          "Lista completa de Jogos Salvos na análise com nome, data e dia da geração",
          "Nomeie e salve um jogo individual — ele aparece na lista com o nome escolhido",
          "Renomeie qualquer jogo salvo a qualquer momento",
          "Comparar agora lista os jogos salvos por nome e data para seleção rápida",
          "Salvar Todos + Salvar individual em cada jogo gerado",
        ],
      },
      {
        title: "100% Supabase (sem localStorage)",
        icon: <Database className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "Tema (dark/light/system) agora salvo no banco via user_metadata",
          "Removido todo uso de localStorage/sessionStorage do projeto",
          "Todos os dados (jogos, histórico, concursos, configurações) persistidos no Supabase",
        ],
      },
      {
        title: "Auth Corrigida",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-red-500",
        items: [
          "Provider usa createBrowserClient do @supabase/ssr (cookies, não localStorage)",
          "updateUser nas rotas usa cliente SSR autenticado (corrige 'Não autorizado')",
          "Salvar configurações do perfil agora funciona",
        ],
      },
      {
        title: "Concursos",
        icon: <Layout className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "Botão 'Baixar Todos' sincroniza histórico completo de uma vez (não só 100)",
          "Limite de batch ampliado de 200 para 1000 concursos",
          "Endpoint batch-todas para sincronizar todas as loterias",
        ],
      },
    ],
  },
  {
    version: "2.4.0",
    date: "2026-09-10",
    type: "minor",
    tag: "UI + Scoring + Persistência",
    sections: [
      {
        title: "Scoring Completo",
        icon: <Target className="w-5 h-5" />,
        color: "text-green-500",
        items: [
          "Análise de jogo agora usa /api/analisar com o módulo calcularScore real (0-100)",
          "Breakdown por critério: frequência, atraso, par/ímpar, soma, distribuição e padrões",
          "Estratégia sugerida exibida conforme a explicação do score",
        ],
      },
      {
        title: "Inputs Polidos",
        icon: <Zap className="w-5 h-5" />,
        color: "text-yellow-500",
        items: [
          "Input numérico digitable + botões -/+ circulares em Criar Jogo, Gerar e Bolão",
          "Removidas as setinhas nativas dos inputs numéricos (CSS global)",
          "Limites respeitam qtd_dezenas_min/max de cada loteria",
          "Cotas do bolão com controles +/-, aceita digitação direta",
        ],
      },
      {
        title: "Circle Picker",
        icon: <Layout className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "Grid adaptativo ao tamanho do universo (volantes de 80/99 números ficam compactos)",
          "Limite de seleção respeita a quantidade de dezenas escolhida",
        ],
      },
      {
        title: "Persistência",
        icon: <Database className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "Salvar Jogo agora grava em /api/lotes (persistência unificada com o histórico)",
          "Jogo salvo inclui o score calculado na análise",
        ],
      },
      {
        title: "Corrigido",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-red-500",
        items: [
          "Estado de análise unificado (removido estado duplicado)",
          "Imports não utilizados removidos",
        ],
      },
    ],
  },
  {
    version: "2.2.0",
    date: "2026-09-09",
    type: "minor",
    tag: "Backend Fix + DB Migration",
    sections: [
      {
        title: "Corrigido",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-green-500",
        items: [
          "API /api/loterias: busca o último concurso da CAIXA (sem número fixo) com timeout de 8s",
          "API /api/lotes: corrigida para usar tabelas lotes_geracao/jogos_gerados (não lotes/jogos)",
          "API /api/lotes: adicionado handler POST para salvar jogos criados manualmente",
          "Schema: estrategia_id agora é nullable em lotes_geracao e jogos_gerados",
          "API /api/admin/setup: criação automática de estratégias seed no banco",
          "Landing page: exibe resultados reais da CAIXA (último concurso de cada loteria)",
        ],
      },
      {
        title: "Criar Jogo",
        icon: <Palette className="w-5 h-5" />,
        color: "text-purple-500",
        items: [
          "Seletor de loteria com ícones, preço e próximo sorteio",
          "Exibição do valor da aposta (R$) na barra de seleção",
          "Botão 'Salvar' que grava jogo no Supabase via API",
          "Feedback visual de salvamento (loading → check → texto)",
        ],
      },
      {
        title: "Infraestrutura",
        icon: <Database className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "Migration SQL para tornar estrategia_id nullable",
          "Seed de 12 estratégias no banco via /api/admin/setup",
          "ER diagram atualizado com colunas nullable",
        ],
      },
    ],
  },
  {
    version: "2.1.0",
    date: "2026-09-09",
    type: "minor",
    tag: "UX Polish",
    sections: [
      {
        title: "Melhorias de Visualização",
        icon: <Palette className="w-5 h-5" />,
        color: "text-purple-500",
        items: [
          "Grid de números com botões circulares e bordas visíveis",
          "Container com fundo delimitado para o grid de seleção",
          "Estados de seleção com anel (ring) e sombra destacada",
          "Dropdowns de loteria com opções maiores e z-50 para sobreposição",
          "Espaçamento generoso entre seções nos formulários",
          "Botões de ação com largura total e altura aumentada",
          "Badges de dezenas selecionadas com fundo sutil destacado",
          "Separadores visuais entre seções de configuração",
        ],
      },
      {
        title: "Páginas Atualizadas",
        icon: <Layout className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "Análise — grid com circulos, dropdown renovado, spacing generoso",
          "Comparar — grid circular, z-50 nos dropdowns, container delimitado",
          "Apostas — grid circular, input de valor com h-11, botão largura total",
        ],
      },
    ],
  },
  {
    version: "2.0.0",
    date: "2026-09-09",
    type: "major",
    tag: "Atualização Completa",
    sections: [
      {
        title: "Funcionalidades Core",
        icon: <Zap className="w-5 h-5" />,
        color: "text-yellow-500",
        items: [
          "Sistema de geração de jogos com 12 estratégias inteligentes",
          "Score de aderência estatística (0-100)",
          "9 loterias da CAIXA (Mega-Sena, Lotofácil, Quina, Lotomania, etc.)",
          "Comparação de jogos com resultados reais",
          "Simulação de bolão com projeções de premiação",
          "Apostas salvas com verificação automática de ganhos",
        ],
      },
      {
        title: "Análise e Estatísticas",
        icon: <BarChart3 className="w-5 h-5" />,
        color: "text-blue-500",
        items: [
          "Análise detalhada de jogos com breakdown por critério",
          "Estatísticas avançadas com gráficos de frequência",
          "Números quentes, frios e mais atrasados",
          "Distribuição por quadrante e par/ímpar",
          "Gráficos interativos com Recharts",
        ],
      },
      {
        title: "Interface do Usuário",
        icon: <Palette className="w-5 h-5" />,
        color: "text-purple-500",
        items: [
          "Landing page com resultados em tempo real",
          "Dark mode (light/dark/system)",
          "Seleção visual de números por clique",
          "Cards de loteria com informações visuais",
          "Compartilhar jogos (WhatsApp, Twitter, Facebook)",
          "Exportação PDF profissional",
        ],
      },
      {
        title: "Sistema de Dados",
        icon: <Database className="w-5 h-5" />,
        color: "text-emerald-500",
        items: [
          "Cadastro e login com Supabase Auth",
          "Dashboard do usuário com gráficos",
          "Configurações persistentes no banco",
          "Notificações in-app",
          "Sincronização de resultados (3 fontes API)",
          "Histórico completo de jogos",
        ],
      },
      {
        title: "Técnico",
        icon: <Code2 className="w-5 h-5" />,
        color: "text-orange-500",
        items: [
          "Next.js 16 + TypeScript + Tailwind CSS v4",
          "shadcn/ui components",
          "Supabase/PostgreSQL database",
          "SEO otimizado (sitemap, robots, meta tags)",
          "Deploy automático no Vercel",
          "12 APIs RESTful",
        ],
      },
      {
        title: "Infraestrutura",
        icon: <Layers className="w-5 h-5" />,
        color: "text-cyan-500",
        items: [
          "9 tabelas no Supabase com RLS",
          "Service worker para PWA",
          "Versioning com semantic-release",
          "Testes unitários com Vitest",
          "CI/CD com Husky + commitlint",
        ],
      },
    ],
  },
  {
    version: "2.0.0",
    date: "2026-09-09",
    type: "major",
    tag: "Estratégias",
    sections: [
      {
        title: "12 Estratégias Implementadas",
        icon: <Target className="w-5 h-5" />,
        color: "text-violet-500",
        items: [
          "Quentes — números mais frequentes no histórico",
          "Frias — números mais atrasados há muito tempo",
          "Par/Ímpar — distribuição equilibrada entre pares e ímpares",
          "Soma — faixa ideal de soma dos números sorteados",
          "Quadrantes — distribuição uniforme por zona do volante",
          "Sequências — inclusão de números consecutivos",
          "Aleatório — seleção puramente aleatória",
          "Estatística — combinação ponderada de métricas",
          "Freq-Atraso — produto de frequência × atraso",
          "Zonas — divisão do universo em faixas",
          "Fechamento — sistema de rolagem com cobertura",
          "Híbrida IA — combinação inteligente de todas as estratégias",
        ],
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-09-01",
    type: "major",
    tag: "Lançamento Inicial",
    sections: [
      {
        title: "Funcionalidades Core",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-green-500",
        items: [
          "Sistema completo de geração de jogos para 9 loterias da CAIXA",
          "10 estratégias iniciais de geração",
          "Sistema de pontuação (score 0-100) com breakdown detalhado",
          "Motor de análise estatística: frequência, atraso, soma, paridade, distribuição",
          "Sincronização com APIs da CAIXA com fallback automático",
          "Schema completo do banco de dados com RLS",
          "Framework de testes com Vitest",
          "Sistema de versionamento com semantic-release e changelog automático",
        ],
      },
      {
        title: "Páginas e Navegação",
        icon: <Layout className="w-5 h-5" />,
        color: "text-indigo-500",
        items: [
          "Landing page com apresentação do sistema",
          "Gerador de jogos com seleção interativa",
          "Histórico de jogos salvos",
          "Análise estatística detalhada",
          "Comparação de jogos com resultados reais",
          "Simulador de bolão com projeções",
          "Página de estratégias com explicações",
          "Design system com shadcn/ui e Tailwind CSS",
          "Navegação responsiva com menu mobile",
        ],
      },
    ],
  },
];

function VersionTimeline({ entry, index }: { entry: ChangelogEntry; index: number }) {
  const isLast = index === changelog.length - 1;
  return (
    <div className="relative flex gap-6 pb-10">
      <div className="flex flex-col items-center">
        <div
          className={`w-4 h-4 rounded-full border-2 ${
            entry.type === "major"
              ? "border-violet-500 bg-violet-500/20"
              : entry.type === "minor"
                ? "border-blue-500 bg-blue-500/20"
                : "border-emerald-500 bg-emerald-500/20"
          } z-10 shrink-0`}
        />
        {!isLast && (
          <div className="w-px flex-1 bg-gradient-to-b from-border to-transparent mt-1" />
        )}
      </div>

      <div className="flex-1 min-w-0 -mt-1">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h2 className="text-xl font-bold tracking-tight">v{entry.version}</h2>
          <Badge
            variant="outline"
            className="text-xs font-semibold border-violet-500/50 text-violet-500"
          >
            {entry.tag || entry.type}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {new Date(entry.date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>

        <div className="space-y-4">
          {entry.sections.map((section) => (
            <div
              key={section.title}
              className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={section.color}>{section.icon}</span>
                <h3 className="font-semibold text-sm">{section.title}</h3>
              </div>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary/40 mt-1.5">
                      <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                        <circle cx="3" cy="3" r="3" />
                      </svg>
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChangelogPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="space-y-2 mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Changelog</h1>
        <p className="text-muted-foreground text-lg">
          Histórico de todas as versões e alterações do sistema Loterias CAIXA.
        </p>
      </div>

      <div className="relative">
        {changelog.map((entry, index) => (
          <VersionTimeline key={`${entry.version}-${entry.tag}-${index}`} entry={entry} index={index} />
        ))}
      </div>
    </div>
  );
}
