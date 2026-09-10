import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthProvider } from "@/lib/supabase/auth/provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Loterias CAIXA - Gerador Inteligente de Jogos",
  description: "Sistema completo para geração, pontuação e análise de jogos das loterias da CAIXA. Ferramentas estatísticas e combinatórias para apoiar suas escolhas.",
  keywords: ["loterias", "caixa", "lotofácil", "mega-sena", "quina", "lotomania", "gerador de jogos", "estatísticas"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          <TooltipProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
