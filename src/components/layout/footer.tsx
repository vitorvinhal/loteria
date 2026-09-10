import Link from "next/link";
import { Dices } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <Link href="/" className="flex items-center space-x-2">
              <Dices className="h-5 w-5 text-primary" />
              <span className="font-bold">Loterias CAIXA</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Ferramentas estatísticas e combinatórias para apoiar suas escolhas nas loterias da CAIXA.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Loterias</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <Link href="/gerar/lotofacil" className="hover:text-foreground">Lotofácil</Link>
              <Link href="/gerar/megasena" className="hover:text-foreground">Mega-Sena</Link>
              <Link href="/gerar/quina" className="hover:text-foreground">Quina</Link>
              <Link href="/gerar/lotomania" className="hover:text-foreground">Lotomania</Link>
              <Link href="/gerar/duplasena" className="hover:text-foreground">Dupla Sena</Link>
              <Link href="/gerar/timemania" className="hover:text-foreground">Timemania</Link>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Ferramentas</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/estrategias" className="hover:text-foreground">Estratégias</Link>
              <Link href="/historico/jogos" className="hover:text-foreground">Histórico</Link>
              <Link href="/comparar" className="hover:text-foreground">Comparar Jogos</Link>
              <Link href="/bolao" className="hover:text-foreground">Simular Bolão</Link>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Sistema</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/changelog" className="hover:text-foreground">Changelog</Link>
              <Link href="/estrategias" className="hover:text-foreground">Como Funciona</Link>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Aviso Importante:</strong> Loterias são jogos de azar: cada combinação tem a mesma probabilidade matemática de ser sorteada, independentemente de histórico ou estatísticas. As ferramentas deste site organizam dados públicos e aplicam critérios estatísticos e combinatórios para apoiar sua escolha, mas não alteram nem preveem o resultado dos sorteios, que são conduzidos pela CAIXA.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Loterias CAIXA - Gerador Inteligente de Jogos. Todos os direitos reservados.</p>
            <p>Dados públicos da CAIXA. Não é um site oficial da CAIXA.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
