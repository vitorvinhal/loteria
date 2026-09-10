"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Dices, BarChart3, History, GitCompare, PenTool, Users, BookOpen, LogIn, LogOut, User, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/supabase/auth/provider";

const navItems = [
  { href: "/gerar/megasena", label: "Gerar Jogos", icon: Dices },
  { href: "/historico/jogos", label: "Histórico", icon: History },
  { href: "/analise", label: "Análise", icon: BarChart3 },
  { href: "/comparar", label: "Comparar", icon: GitCompare },
  { href: "/criar-jogo/megasena", label: "Criar Jogo", icon: PenTool },
  { href: "/bolao", label: "Bolão", icon: Users },
  { href: "/estrategias", label: "Estratégias", icon: BookOpen },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isLoading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Dices className="h-6 w-6 text-primary" />
          <span className="hidden font-bold sm:inline-block">
            Loterias CAIXA
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          {!isLoading && (
            <>
              {user ? (
                <div className="hidden md:flex items-center gap-2">
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm">
                      <LayoutDashboard className="h-4 w-4 mr-1" />
                      Painel
                    </Button>
                  </Link>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {user.email?.split("@")[0]}
                  </span>
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-1" />
                    Sair
                  </Button>
                </div>
              ) : (
                <Link href="/auth/login" className="hidden md:block">
                  <Button variant="ghost" size="sm">
                    <LogIn className="h-4 w-4 mr-1" />
                    Entrar
                  </Button>
                </Link>
              )}
            </>
          )}

          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                }
              />
              <SheetContent side="left">
                <div className="flex flex-col space-y-4 mt-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}

                  <div className="border-t pt-4 mt-4">
                    {!isLoading && (
                      <>
                        {user ? (
                          <div className="space-y-2">
                            <Link
                              href="/dashboard"
                              onClick={() => setOpen(false)}
                              className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                              <LayoutDashboard className="h-5 w-5" />
                              <span>Meu Painel</span>
                            </Link>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground px-3">
                              <User className="h-4 w-4" />
                              {user.email}
                            </div>
                            <button
                              onClick={() => {
                                signOut();
                                setOpen(false);
                              }}
                              className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground w-full"
                            >
                              <LogOut className="h-5 w-5" />
                              <span>Sair</span>
                            </button>
                          </div>
                        ) : (
                          <Link
                            href="/auth/login"
                            onClick={() => setOpen(false)}
                            className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            <LogIn className="h-5 w-5" />
                            <span>Entrar</span>
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
