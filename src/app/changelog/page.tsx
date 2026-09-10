import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { ScrollArea } from "@/components/ui/scroll-area";

interface ChangelogEntry {
  version: string;
  date: string;
  type: "major" | "minor" | "patch";
  changes: {
    type: "feature" | "fix" | "improvement" | "breaking";
    description: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-09-09",
    type: "major",
    changes: [
      { type: "feature", description: "Sistema completo de geração de jogos para 9 loterias da CAIXA" },
      { type: "feature", description: "10 estratégias de geração: Quentes, Frias, Par/Ímpar, Soma, Quadrantes, Delta, Exclusão de Padrões, Repetição Controlada, Fechamento Combinatório e Híbrida com IA" },
      { type: "feature", description: "Sistema de pontuação (score 0-100) com breakdown detalhado" },
      { type: "feature", description: "Motor de análise estatística: frequência, atraso, soma, paridade, distribuição" },
      { type: "feature", description: "Sincronização com APIs da CAIXA com fallback automático" },
      { type: "feature", description: "Páginas: Landing, Gerar, Histórico, Análise, Comparar, Criar Jogo, Bolão, Estratégias" },
      { type: "feature", description: "Sistema de versionamento com semantic-release e changelog automático" },
      { type: "feature", description: "Schema completo do banco de dados com RLS" },
      { type: "feature", description: "Framework de testes com Vitest" },
      { type: "improvement", description: "Design system com shadcn/ui e Tailwind CSS" },
      { type: "improvement", description: "Navegação responsiva com menu mobile" },
    ],
  },
];

function getBadgeVariant(type: string) {
  switch (type) {
    case "feature":
      return "default";
    case "fix":
      return "destructive";
    case "improvement":
      return "secondary";
    case "breaking":
      return "destructive";
    default:
      return "outline";
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case "feature":
      return "Nova Feature";
    case "fix":
      return "Correção";
    case "improvement":
      return "Melhoria";
    case "breaking":
      return "Breaking Change";
    default:
      return type;
  }
}

export default function ChangelogPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6 mb-8">
        <h1 className="text-3xl font-bold">Changelog</h1>
        <p className="text-muted-foreground">
          Histórico de todas as versões e alterações do sistema.
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-8">
          {changelog.map((entry) => (
            <Card key={entry.version}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      v{entry.version}
                      <Badge variant={entry.type === "major" ? "default" : "secondary"}>
                        {entry.type}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {new Date(entry.date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {entry.changes.map((change, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Badge variant={getBadgeVariant(change.type)} className="mt-0.5 shrink-0">
                        {getTypeLabel(change.type)}
                      </Badge>
                      <p className="text-sm">{change.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
