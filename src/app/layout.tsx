import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { VersionBadge } from "@/components/layout/version-badge";
import { AuthProvider } from "@/lib/supabase/auth/provider";
import { AuthGuard } from "@/components/layout/auth-guard";
import { AssistantWidget } from "@/components/assistant/assistant-widget";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Loterias CAIXA - Gerador de Jogos Inteligente",
  description:
    "Sistema completo para geração, análise e comparação de jogos das loterias da CAIXA",
  keywords: ["loterias", "caixa", "megasena", "lotofacil", "quina", "gerador de jogos"],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
  },
  openGraph: {
    title: "Loterias CAIXA - Gerador de Jogos Inteligente",
    description:
      "Sistema completo para geração, análise e comparação de jogos das loterias da CAIXA",
    url: "https://loterias-caixa-omega.vercel.app",
    siteName: "Loterias CAIXA",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Loterias CAIXA - Gerador de Jogos Inteligente",
    description:
      "Sistema completo para geração, análise e comparação de jogos das loterias da CAIXA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <TooltipProvider>
            <AuthGuard>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster />
            <VersionBadge />
            <AssistantWidget />
            </AuthGuard>
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
