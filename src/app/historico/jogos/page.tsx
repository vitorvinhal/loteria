"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { History, RefreshCw, Filter, Trash2, Target, GitCompareArrows, Share2, Copy, User, Users } from "lucide-react";
import { LOTERIAS } from "@/lib/loterias";
import { useAuth } from "@/lib/supabase/auth/provider";

interface JogoHistorico {
  id: string;
  loteria: string;
  dezenas: number[];
  score: number | null;
  criado_em: string;
  estrategia: string;
  nome?: string | null;
}

interface LoteHistorico {
  id: string;
  loteria: string;
  nome?: string | null;
  criado_em: string;
  estrategia: string;
  criado_por: string | null;
  criador_avatar_url: string | null;
  usuario_pode_excluir: boolean;
  jogos: JogoHistorico[];
}

interface UsuarioAtualOpt {
  id: string;
  email: string;
  nome: string;
  avatar_url: string | null;
}

export default function HistoricoJogosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loteriaFiltro, setLoteriaFiltro] = useState("todas");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todos" | "7" | "30">("todos");
  const [lotes, setLotes] = useState<LoteHistorico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usuariosCount, setUsuariosCount] = useState(0);

  const fetchJogos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/lotes");
      if (response.ok) {
        const data = await response.json();
        const listaLotes: LoteHistorico[] = (data.lotes || []).map((lote: any) => ({
          id: lote.id,
          loteria: lote.loteria || lote.loteria_id,
          criado_em: lote.criado_em,
          estrategia: lote.estrategia || "manual",
          criado_por: lote.criado_por || null,
          criador_avatar_url: lote.criador_avatar_url || null,
          usuario_pode_excluir: lote.usuario_pode_excluir || false,
          jogos: (lote.jogos || []).map((j: any) => ({
            id: j.id,
            loteria: lote.loteria || lote.loteria_id,
            dezenas: j.dezenas || [],
            score: j.score ?? null,
            criado_em: j.criado_em,
            estrategia: lote.estrategia || "manual",
            nome: j.nome || null,
          })),
        }));
        setLotes(listaLotes);
        const criadores = new Set<string>();
        listaLotes.forEach((l) => {
          if (l.criado_por) criadores.add(l.criado_por);
        });
        setUsuariosCount(criadores.size);
      }
    } catch (error) {
      console.error("Erro ao carregar jogos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJogos();
  }, []);

  const lotesFiltrados = useMemo(() => {
    return lotes.filter((l) => {
      if (loteriaFiltro !== "todas" && l.loteria !== loteriaFiltro) return false;
      if (filtroPeriodo === "todos") return true;
      const dias = parseInt(filtroPeriodo, 10);
      return new Date(l.criado_em).getTime() >= Date.now() - dias * 86400000;
    });
  }, [lotes, loteriaFiltro, filtroPeriodo]);

  const formatarData = (dataISO: string) => {
    const d = new Date(dataISO);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      weekday: "long",
    });
  };

  const formatarHora = (dataISO: string) => {
    const d = new Date(dataISO);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const excluirLote = async (loteId: string) => {
    if (!confirm("Tem certeza que deseja excluir este lote inteiro?")) return;
    try {
      const response = await fetch(`/api/lotes/${loteId}`, { method: "DELETE" });
      if (response.ok) {
        setLotes((prev) => prev.filter((l) => l.id !== loteId));
      } else {
        alert("Só o criador deste lote pode excluí-lo.");
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const compartilharLote = (lote: LoteHistorico) => {
    const texto = `Meu lote ${lote.loteria} (${lote.jogos.length} jogos):\n${lote.jogos
      .map((j, i) => `${i + 1}) ${j.dezenas.map((d) => String(d).padStart(2, "0")).join(" - ")}`)
      .join("\n")}`;
    if (navigator.share) {
      navigator.share({ title: "Meu Lote Loterias", text: texto });
    } else {
      navigator.clipboard.writeText(texto);
    }
  };

  const copiarJogo = (jogo: JogoHistorico) => {
    const texto = `${jogo.dezenas.map((d) => String(d).padStart(2, "0")).join(" - ")}`;
    navigator.clipboard.writeText(texto).then(() => alert("Jogo copiado!"));
  };

  const copiarLote = (lote: LoteHistorico) => {
    const texto = lote.jogos
      .map((j, i) => `${i + 1}) ${j.dezenas.map((d) => String(d).padStart(2, "0")).join(" - ")}`)
      .join("\n");
    navigator.clipboard.writeText(texto).then(() => alert("Lote copiado!"));
  };

  const totalJogos = lotes.reduce((s, l) => s + l.jogos.length, 0);
  const criadoresUnicos = new Set(lotes.map((l) => l.criado_por).filter(Boolean)).size;

  const loteIcone = (loteria: string) => {
    const icons: Record<string, string> = {
      lotofacil: "⭐", lotomania: "🎱", megasena: "🏆", quina: "💎",
      duplasena: "🔄", timemania: "⚽", diadesorte: "🌟", maismilionaria: "💰", supersete: "7️⃣",
    };
    return icons[loteria] || "🎲";
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-8 w-8 text-primary" />
          Histórico de Jogos
        </h1>
        <p className="text-muted-foreground mt-2">
          Jogos criados por todos os usuários. Cada geração forma um lote separado.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalJogos}</p>
              <p className="text-xs text-muted-foreground">Jogos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <p className="text-2xl font-bold">{criadoresUnicos}</p>
              <p className="text-xs text-muted-foreground">Criadores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Filter className="h-6 w-6 text-primary" />
            <div>
              <p className="text-2xl font-bold">{lotes.length}</p>
              <p className="text-xs text-muted-foreground">Lotes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtro */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 flex-wrap">
        <Select value={loteriaFiltro} onValueChange={(v) => v && setLoteriaFiltro(v)}>
          <SelectTrigger className="w-full sm:w-[220px] h-10">
            <SelectValue placeholder="Todas as loterias" />
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="todas" className="py-2">Todas as loterias</SelectItem>
            {LOTERIAS.filter((l) => l.ativo).map((l) => (
              <SelectItem key={l.slug} value={l.slug} className="py-2">
                {loteIcone(l.slug)} {l.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 seg-filter">
          {([["todos", "Tudo"], ["7", "7 dias"], ["30", "30 dias"]] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setFiltroPeriodo(val)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                filtroPeriodo === val ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button variant="outline" className="gap-2" onClick={fetchJogos} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
          <p>Carregando histórico...</p>
        </div>
      ) : lotesFiltrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Filter className="h-8 w-8 mx-auto mb-2" />
          <p>Nenhum lote encontrado.</p>
          <p className="text-sm mt-2">Gere jogos para aparecerem aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lotesFiltrados.map((lote) => (
            <Card key={lote.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Foto do criador */}
                    {lote.criador_avatar_url ? (
                      <img
                        src={lote.criador_avatar_url}
                        alt="Foto"
                        className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <span className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <User className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold">
                          {loteIcone(lote.loteria)} {LOTERIAS.find((l) => l.slug === lote.loteria)?.nome || lote.loteria}
                        </span>
                        <Badge variant="outline">{lote.jogos.length} jogos</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-muted-foreground capitalize">
                          {formatarData(lote.criado_em)}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatarHora(lote.criado_em)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Criado por <span className="font-medium text-foreground">{lote.criado_por || "Anônimo"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0 flex-wrap">
                    <Button variant="ghost" size="icon-sm" title="Copiar lote" onClick={() => copiarLote(lote)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Comparar" onClick={() => router.push(`/comparar?loteId=${lote.id}`)}>
                      <GitCompareArrows className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Compartilhar" onClick={() => compartilharLote(lote)}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                    {lote.usuario_pode_excluir && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Excluir lote"
                        onClick={() => excluirLote(lote.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lote.jogos.map((jogo, idx) => (
                    <div key={jogo.id} className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-8 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                        {jogo.dezenas.map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center justify-center h-8 min-w-[2rem] rounded-full bg-primary/10 text-primary text-sm font-bold tabular-nums"
                          >
                            {String(d).padStart(2, "0")}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {jogo.nome && <Badge variant="outline" className="max-w-[140px] truncate">{jogo.nome}</Badge>}
                        {jogo.score !== null && (
                          <Badge variant={jogo.score >= 80 ? "default" : "secondary"} className="text-xs">
                            {jogo.score}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Copiar"
                          onClick={() => copiarJogo(jogo)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Analisar"
                          onClick={() => router.push(`/analise?loteria=${jogo.loteria}&dezenas=${jogo.dezenas.join(",")}`)}
                        >
                          <Target className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}