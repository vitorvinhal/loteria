import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap,
  BarChart3,
  Palette,
  Database,
  Code2,
  Layers,
  Shield,
  CheckCircle2,
  TrendingUp,
  Users,
  FileText,
  Globe,
  RefreshCw,
  Lock,
  Sparkles,
  Target,
  Hash,
  Layout,
  GitBranch,
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
      {/* Timeline line */}
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

      {/* Content */}
      <div className="flex-1 min-w-0 -mt-1">
        {/* Version header */}
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

        {/* Sections */}
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

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="relative">
          {changelog.map((entry, index) => (
            <VersionTimeline key={`${entry.version}-${entry.tag}-${index}`} entry={entry} index={index} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
