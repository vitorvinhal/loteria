"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Dices, BarChart3, History, GitCompare, PenTool, Users, BookOpen, LogIn, LogOut, User, LayoutDashboard, Settings, Bell, RefreshCw, PieChart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/supabase/auth/provider";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { isAdminUser } from "@/lib/admin";

const navItems = [
  { href: "/gerar/megasena", label: "Gerar Jogos", icon: Dices },
  { href: "/criar-jogo/megasena", label: "Criar Jogo", icon: PenTool },
  { href: "/historico/jogos", label: "Histórico", icon: History },
  { href: "/analise", label: "Análise", icon: BarChart3 },
  { href: "/comparar", label: "Comparar", icon: GitCompare },
  { href: "/estatisticas", label: "Estatísticas", icon: PieChart },
  { href: "/concursos", label: "Concursos", icon: BookOpen },
  { href: "/sincronizar", label: "Sincronizar", icon: RefreshCw },
  { href: "/bolao", label: "Bolão", icon: Users },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isLoading, signOut, avatarUrl } = useAuth();

  const isAdmin = isAdminUser(user);

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
          <ThemeToggle />

          {!isLoading && (
            <>
              {user ? (
                <>
                  <div className="hidden md:flex items-center gap-2">
                    <Link href="/notificacoes">
                      <Button variant="ghost" size="sm">
                        <Bell className="h-4 w-4 mr-1" />
                        Notificações
                      </Button>
                    </Link>
                    <Link href="/dashboard">
                      <Button variant="ghost" size="sm">
                        <LayoutDashboard className="h-4 w-4 mr-1" />
                        Painel
                      </Button>
                    </Link>
                    <Link href="/configuracoes" className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-sm transition-colors hover:bg-accent">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Foto de perfil"
                          className="h-9 w-9 rounded-full object-cover border-2 border-primary/40 ring-2 ring-primary/20"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/30">
                          <User className="h-4 w-4" />
                        </span>
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {user.user_metadata?.nome || user.email?.split("@")[0]}
                      </span>
                    </Link>
                    {isAdmin && (
                      <Link href="/admin">
                        <Button variant="ghost" size="sm" className="text-primary">
                          <ShieldCheck className="h-4 w-4 mr-1" />
                          Admin
                        </Button>
                      </Link>
                    )}
                    <Button variant="ghost" size="sm" onClick={signOut}>
                      <LogOut className="h-4 w-4 mr-1" />
                      Sair
                    </Button>
                  </div>
                  {/* Avatar visível no mobile */}
                  <Link href="/configuracoes" className="md:hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Foto de perfil"
                        className="h-9 w-9 rounded-full object-cover border-2 border-primary/40"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/30">
                        <User className="h-4 w-4" />
                      </span>
                    )}
                  </Link>
                </>
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
                    <div className="flex items-center gap-2 px-3 mb-2">
                      <ThemeToggle />
                      <span className="text-sm text-muted-foreground">Tema</span>
                    </div>

                    {!isLoading && (
                      <>
                        {user ? (
                          <div className="space-y-2">
                            <Link
                              href="/notificacoes"
                              onClick={() => setOpen(false)}
                              className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                              <Bell className="h-5 w-5" />
                              <span>Notificações</span>
                            </Link>
                            <Link
                              href="/dashboard"
                              onClick={() => setOpen(false)}
                              className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                              <LayoutDashboard className="h-5 w-5" />
                              <span>Meu Painel</span>
                            </Link>
                            <Link
                              href="/configuracoes"
                              onClick={() => setOpen(false)}
                              className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                              <Settings className="h-5 w-5" />
                              <span>Configurações</span>
                            </Link>
                            {isAdmin && (
                              <Link
                                href="/admin"
                                onClick={() => setOpen(false)}
                                className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-accent hover:text-accent-foreground"
                              >
                                <ShieldCheck className="h-5 w-5" />
                                <span>Painel Admin</span>
                              </Link>
                            )}
                            <div className="flex items-center gap-2 text-sm px-3 py-1">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt="Foto de perfil"
                                  className="h-9 w-9 rounded-full object-cover border-2 border-primary/40"
                                />
                              ) : (
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/30">
                                  <User className="h-4 w-4" />
                                </span>
                              )}
                              <span className="font-medium text-foreground">
                                {user.user_metadata?.nome || user.email?.split("@")[0]}
                              </span>
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
