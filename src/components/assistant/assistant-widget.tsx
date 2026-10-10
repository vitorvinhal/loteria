"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/supabase/auth/provider";
import { Avatar11 } from "./avatar-11";
import { useSpeechRecognition } from "./use-speech-recognition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { isAdminUser } from "@/lib/admin";
import { LOTERIAS } from "@/lib/loterias";
import {
  MessageCircle,
  X,
  Maximize2,
  Minimize2,
  Send,
  Mic,
  MicOff,
  Volume2,
  Loader2,
  Paperclip,
  Plus,
  Copy,
  CheckCircle2,
  Sparkles,
  Trophy,
  Wrench,
} from "lucide-react";
import { toast } from "react-hot-toast";

type Modo = "fechado" | "compacto" | "expandido";
type Aba = "chat" | "dev" | "placar";

interface Chat {
  id: string;
  title: string;
  created_by_user: string;
  created_at: string;
}

interface Anexo {
  nome: string;
  url: string;
  mime: string;
}

interface Msg {
  id: string;
  user_id: string | null;
  user_name: string;
  user_avatar: string | null;
  content: string;
  attachments: Anexo[];
  created_at: string;
}

interface Melhoria {
  id: string;
  requested_by: string;
  original_feedback: string;
  generated_prompt: string;
  status: string;
  created_at: string;
}

interface LinhaRanking {
  user_name: string;
  total_acertos: number;
  total_palpites: number;
  melhor_acerto: number;
  ultimo_palpite_em: string | null;
}

const CORES_STATUS: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  em_andamento: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  feito: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  rejeitado: "bg-red-500/15 text-red-600 border-red-500/30",
};

function AvatarHumano({ nome, url, size = 28 }: { nome: string; url?: string | null; size?: number }) {
  if (url && url.startsWith("data:image/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={nome} width={size} height={size} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  const iniciais = nome
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="rounded-full bg-indigo-500/20 text-indigo-600 font-bold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {iniciais || "?"}
    </span>
  );
}

export function AssistantWidget() {
  const { user, isLoading } = useAuth();
  const [modo, setModo] = useState<Modo>("fechado");
  const [aba, setAba] = useState<Aba>("chat");
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatAtivo, setChatAtivo] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [melhorias, setMelhorias] = useState<Melhoria[]>([]);
  const [ranking, setRanking] = useState<LinhaRanking[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [audioCarregando, setAudioCarregando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [palpiteLoteria, setPalpiteLoteria] = useState("megasena");
  const [palpiteDezenas, setPalpiteDezenas] = useState("");
  const [enviandoPalpite, setEnviandoPalpite] = useState(false);

  const msgsRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { suporta, ouvindo, transcricao, iniciar, parar } = useSpeechRecognition();

  const ehAdmin = isAdminUser(user);

  const irParaFim = useCallback(() => {
    requestAnimationFrame(() => {
      msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  const carregarChats = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/chats");
      if (!res.ok) return;
      const json = (await res.json()) as { chats: Chat[] };
      setChats(json.chats);
    } catch {
      /* silencioso */
    }
  }, []);

  const carregarMensagens = useCallback(async (chatId: string) => {
    setCarregandoChat(true);
    try {
      const res = await fetch(`/api/assistant/messages?chat_id=${encodeURIComponent(chatId)}`);
      if (!res.ok) return;
      const json = (await res.json()) as { mensagens: Msg[] };
      setMensagens(json.mensagens);
      irParaFim();
    } finally {
      setCarregandoChat(false);
    }
  }, [irParaFim]);

  const carregarMelhorias = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/improvements");
      if (!res.ok) return;
      const json = (await res.json()) as { melhorias: Melhoria[] };
      setMelhorias(json.melhorias);
    } catch {
      /* silencioso */
    }
  }, []);

  const carregarRanking = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/scores");
      if (!res.ok) return;
      const json = (await res.json()) as { ranking: LinhaRanking[] };
      setRanking(json.ranking);
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    if (modo !== "fechado") void carregarChats();
  }, [modo, carregarChats]);

  useEffect(() => {
    if (modo === "expandido") {
      if (aba === "dev") void carregarMelhorias();
      if (aba === "placar") void carregarRanking();
    }
  }, [modo, aba, carregarMelhorias, carregarRanking]);

  const enviarMensagem = useCallback(
    async (conteudo: string, listaAnexos: Anexo[]) => {
      if ((!conteudo.trim() && !listaAnexos.length) || enviando) return;
      setEnviando(true);
      setTexto("");
      setAnexos([]);
      const otimista: Msg = {
        id: `tmp-${Date.now()}`,
        user_id: user?.id ?? null,
        user_name: user?.email?.split("@")[0] ?? "Você",
        user_avatar: null,
        content: conteudo,
        attachments: listaAnexos,
        created_at: new Date().toISOString(),
      };
      setMensagens((prev) => [...prev, otimista]);
      irParaFim();
      try {
        const res = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatAtivo, content: conteudo, attachments: listaAnexos }),
        });
        const json = (await res.json()).catch(() => null);
        if (!res.ok) {
          toast.error(json?.error ?? "Erro ao enviar mensagem");
          return;
        }
        const novoChatId = json.chat_id as string;
        if (novoChatId !== chatAtivo) setChatAtivo(novoChatId);
        if (json.melhoria_salva) toast.success("Sugestão salva na Central de Melhorias!");
        await carregarMensagens(novoChatId);
        void carregarChats();
      } catch {
        toast.error("Erro de rede ao enviar mensagem");
      } finally {
        setEnviando(false);
      }
    },
    [chatAtivo, enviando, user, irParaFim, carregarMensagens, carregarChats]
  );

  const falar = useCallback(async (id: string, conteudo: string) => {
    if (audioCarregando === id) return;
    setAudioCarregando(id);
    try {
      const res = await fetch(`/api/tts?text=${encodeURIComponent(conteudo.slice(0, 2000))}`);
      if (!res.ok) throw new Error("falha");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      toast.error("Não consegui falar agora. Tente novamente.");
    } finally {
      setAudioCarregando(null);
    }
  }, [audioCarregando]);

  const enviarArquivo = useCallback(
    async (file: File) => {
      setEnviandoAnexo(true);
      try {
        const form = new FormData();
        form.append("arquivo", file);
        const res = await fetch("/api/assistant/upload", { method: "POST", body: form });
        const json = (await res.json()).catch(() => null);
        if (!res.ok) {
          toast.error(json?.error ?? "Erro no upload");
          return;
        }
        setAnexos((prev) => [...prev, { nome: json.nome, url: json.url, mime: json.mime }]);
      } catch {
        toast.error("Erro de rede no upload");
      } finally {
        setEnviandoAnexo(false);
      }
    },
    []
  );

  const copiarPrompt = useCallback(async (m: Melhoria) => {
    try {
      await navigator.clipboard.writeText(m.generated_prompt);
      setCopiado(m.id);
      toast.success("Prompt copiado!");
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }, []);

  const mudarStatus = useCallback(async (id: string, status: string) => {
    try {
      const res = await fetch("/api/assistant/improvements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const json = (await res.json()).catch(() => null);
        toast.error(json?.error ?? "Erro ao atualizar");
        return;
      }
      setMelhorias((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    } catch {
      toast.error("Erro de rede");
    }
  }, []);

  const enviarPalpite = useCallback(async () => {
    const nums = palpiteDezenas
      .split(/[,\s]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isInteger(n));
    if (!nums.length) {
      toast.error("Informe as dezenas separadas por vírgula ou espaço");
      return;
    }
    setEnviandoPalpite(true);
    try {
      const res = await fetch("/api/assistant/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_type: palpiteLoteria, numbers: nums }),
      });
      const json = (await res.json()).catch(() => null);
      if (!res.ok) {
        toast.error(json?.error ?? "Erro ao registrar palpite");
        return;
      }
      toast.success(
        json.conferido_contra
          ? `Palpite salvo e conferido no concurso ${json.conferido_contra}: ${json.palpite.hits} acerto(s)!`
          : "Palpite salvo (sem concurso recente para conferir ainda)"
      );
      setPalpiteDezenas("");
      void carregarRanking();
    } catch {
      toast.error("Erro de rede");
    } finally {
      setEnviandoPalpite(false);
    }
  }, [palpiteDezenas, palpiteLoteria, carregarRanking]);

  if (isLoading || !user) return null;

  const onMic = () => {
    if (ouvindo) {
      parar();
      return;
    }
    iniciar((final) => setTexto((t) => (t ? `${t} ${final}` : final)));
  };

  const chatTitulo = chats.find((c) => c.id === chatAtivo)?.title ?? "Novo chat";

  const listaMensagens = (
    <div ref={msgsRef} className="flex-1 overflow-y-auto space-y-3 p-3">
      {carregandoChat && (
        <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando conversa...
        </div>
      )}
      {!carregandoChat && mensagens.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
          <Sparkles className="h-8 w-8 mx-auto text-fuchsia-500 opacity-60" />
          <p>Olá! Sou a <strong>11</strong>, assistente do site.</p>
          <p className="text-xs">Pergunte sobre gerador de jogos, estrégias ou deixe um feedback!</p>
        </div>
      )}
      {mensagens.map((m) => {
        const da11 = m.user_name === "11" && !m.user_id;
        return (
          <div key={m.id} className={`flex gap-2 ${da11 ? "" : "flex-row-reverse"}`}>
            {da11 ? (
              <Avatar11 size={28} className="shrink-0 rounded-full" />
            ) : (
              <AvatarHumano nome={m.user_name} url={m.user_avatar} />
            )}
            <div className={`max-w-[80%] space-y-1 ${da11 ? "" : "items-end flex flex-col"}`}>
              <span className="text-[10px] text-muted-foreground px-1">
                {da11 ? "11" : m.user_name}
              </span>
              <div
                className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                  da11
                    ? "bg-fuchsia-500/10 border border-fuchsia-500/20 text-foreground"
                    : "bg-primary/10 border border-primary/20"
                }`}
              >
                {m.content}
              </div>
              {m.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.attachments.map((a, i) =>
                    a.mime.startsWith("image/") ? (
                      <a key={i} href={a.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.url} alt={a.nome} className="h-24 rounded-lg border object-cover" />
                      </a>
                    ) : (
                      <a
                        key={i}
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline text-muted-foreground"
                      >
                        {a.nome}
                      </a>
                    )
                  )}
                </div>
              )}
              {da11 && (
                <button
                  type="button"
                  onClick={() => void falar(m.id, m.content)}
                  disabled={audioCarregando === m.id}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-fuchsia-600 transition-colors cursor-pointer px-1"
                >
                  {audioCarregando === m.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                  Ouvir
                </button>
              )}
            </div>
          </div>
        );
      })}
      {enviando && (
        <div className="flex gap-2 items-center text-sm text-muted-foreground">
          <Avatar11 size={28} className="shrink-0 rounded-full" />
          <span className="flex items-center gap-2 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 px-3 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> 11 está pensando...
          </span>
        </div>
      )}
    </div>
  );

  const barraEntrada = (
    <div className="border-t p-2 space-y-2">
      {anexos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {anexos.map((a, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] gap-1">
              {a.nome}
              <button
                type="button"
                onClick={() => setAnexos((prev) => prev.filter((_, j) => j !== i))}
                className="cursor-pointer hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            files.forEach((f) => void enviarArquivo(f));
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => fileRef.current?.click()}
          disabled={enviandoAnexo}
          title="Anexar arquivo ou imagem"
        >
          {enviandoAnexo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </Button>
        <Textarea
          value={ouvindo && transcricao ? `${texto} ${transcricao}`.trim() : texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void enviarMensagem(texto, anexos);
            }
          }}
          placeholder={ouvindo ? "Ouvindo..." : "Fale ou escreva com a 11..."}
          rows={1}
          className="min-h-[38px] max-h-28 resize-none text-sm"
        />
        {suporta && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-9 w-9 shrink-0 ${ouvindo ? "text-red-500 animate-pulse" : ""}`}
            onClick={onMic}
            title={ouvindo ? "Parar microfone" : "Falar com microfone"}
          >
            {ouvindo ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 shrink-0 bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
          onClick={() => void enviarMensagem(texto, anexos)}
          disabled={enviando || (!texto.trim() && !anexos.length)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (modo === "expandido") {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) setModo("compacto"); }}>
        <DialogContent className="max-w-5xl w-[96vw] h-[92vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Assistente 11 — Workspace</DialogTitle>
            <DialogDescription>Chat colaborativo, central de melhorias e placar</DialogDescription>
          </DialogHeader>
          <div className="flex h-full min-h-0">
            <aside className="w-64 border-r flex flex-col min-h-0 shrink-0">
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <Avatar11 size={26} className="rounded-full" /> 11
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setModo("compacto")}
                  title="Restaurar janela compacta"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mx-3 mt-3 gap-1.5"
                onClick={() => {
                  setChatAtivo(null);
                  setMensagens([]);
                  setAba("chat");
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Novo chat
              </Button>
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-1">
                  {chats.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setChatAtivo(c.id);
                        setAba("chat");
                        void carregarMensagens(c.id);
                      }}
                      className={`w-full text-left rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer ${
                        chatAtivo === c.id ? "bg-fuchsia-500/15 text-foreground" : "hover:bg-accent"
                      }`}
                    >
                      <span className="block truncate font-medium">{c.title}</span>
                      <span className="block text-[10px] text-muted-foreground truncate">
                        por {c.created_by_user}
                      </span>
                    </button>
                  ))}
                  {chats.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum chat ainda</p>
                  )}
                </div>
              </ScrollArea>
            </aside>
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
              <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)} className="flex-1 flex flex-col min-h-0">
                <div className="border-b px-3 flex items-center justify-between gap-2">
                  <TabsList className="my-2">
                    <TabsTrigger value="chat" className="gap-1.5 text-xs">
                      <MessageCircle className="h-3.5 w-3.5" /> Chat
                    </TabsTrigger>
                    <TabsTrigger value="dev" className="gap-1.5 text-xs">
                      <Wrench className="h-3.5 w-3.5" /> Central do Dev
                    </TabsTrigger>
                    <TabsTrigger value="placar" className="gap-1.5 text-xs">
                      <Trophy className="h-3.5 w-3.5" /> Placar
                    </TabsTrigger>
                  </TabsList>
                  <span className="text-xs text-muted-foreground truncate max-w-[14rem]">{chatTitulo}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setModo("compacto")}>
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                </div>
                <TabsContent value="chat" className="flex-1 min-h-0 mt-0 flex flex-col data-[state=active]:flex">
                  {listaMensagens}
                  {barraEntrada}
                </TabsContent>
                <TabsContent value="dev" className="flex-1 min-h-0 mt-0 overflow-y-auto">
                  <div className="p-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sugestões capturadas pela 11 na conversa. Copie o prompt técnico e cole no Open Code.
                    </p>
                    {melhorias.length === 0 && (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        Nenhuma melhoria registrada ainda.
                      </p>
                    )}
                    {melhorias.map((m) => (
                      <div key={m.id} className="rounded-xl border p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{m.original_feedback}</p>
                            <p className="text-[11px] text-muted-foreground">
                              por {m.requested_by} · {new Date(m.created_at).toLocaleString("pt-BR")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline" className={`text-[10px] ${CORES_STATUS[m.status] ?? ""}`}>
                              {m.status.replace("_", " ")}
                            </Badge>
                            {ehAdmin && (
                              <select
                                value={m.status}
                                onChange={(e) => void mudarStatus(m.id, e.target.value)}
                                className="text-[11px] rounded-md border bg-background px-1.5 py-1 cursor-pointer"
                              >
                                <option value="pendente">pendente</option>
                                <option value="em_andamento">em andamento</option>
                                <option value="feito">feito</option>
                                <option value="rejeitado">rejeitado</option>
                              </select>
                            )}
                          </div>
                        </div>
                        <pre className="text-[11px] bg-muted/50 rounded-lg p-2.5 overflow-x-auto max-h-44 whitespace-pre-wrap break-words">
                          {m.generated_prompt}
                        </pre>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => void copiarPrompt(m)}
                        >
                          {copiado === m.id ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          Copiar Prompt
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="placar" className="flex-1 min-h-0 mt-0 overflow-y-auto">
                  <div className="p-4 space-y-4">
                    <div className="rounded-xl border p-3 space-y-2">
                      <p className="text-sm font-semibold">Registrar palpite</p>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={palpiteLoteria}
                          onChange={(e) => setPalpiteLoteria(e.target.value)}
                          className="text-sm rounded-lg border bg-background px-2 py-1.5 cursor-pointer"
                        >
                          {LOTERIAS.filter((l) => l.ativo).map((l) => (
                            <option key={l.slug} value={l.slug}>{l.nome}</option>
                          ))}
                        </select>
                        <Input
                          value={palpiteDezenas}
                          onChange={(e) => setPalpiteDezenas(e.target.value)}
                          placeholder="dezenas: 4, 12, 23, 34, 45, 56"
                          className="flex-1 min-w-[12rem] h-9 text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void enviarPalpite()}
                          disabled={enviandoPalpite}
                          className="gap-1.5"
                        >
                          {enviandoPalpite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          Apostar palpite
                        </Button>
                      </div>
                    </div>
                    {ranking.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">Nenhum palpite registrado.</p>
                    ) : (
                      <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 text-xs text-muted-foreground">
                            <tr>
                              <th className="text-left px-3 py-2">#</th>
                              <th className="text-left px-3 py-2">Membro</th>
                              <th className="text-right px-3 py-2">Acertos</th>
                              <th className="text-right px-3 py-2">Melhor</th>
                              <th className="text-right px-3 py-2">Palpites</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ranking.map((r, i) => (
                              <tr key={r.user_name} className="border-t">
                                <td className="px-3 py-2 font-bold">{i + 1}º</td>
                                <td className="px-3 py-2">{r.user_name}</td>
                                <td className="px-3 py-2 text-right font-bold tabular-nums">{r.total_acertos}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{r.melhor_acerto}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{r.total_palpites}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (modo === "compacto") {
    return (
      <div className="fixed bottom-4 left-4 z-[60] w-[22rem] max-w-[calc(100vw-2rem)] h-[26rem] max-h-[calc(100vh-6rem)] rounded-xl border border-fuchsia-500/30 bg-card shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2 bg-fuchsia-500/5">
          <span className="flex items-center gap-2 text-sm font-bold">
            <Avatar11 size={24} className="rounded-full" />
            11
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setModo("expandido")}
              title="Expandir"
              className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setModo("fechado")}
              title="Fechar"
              className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {listaMensagens}
        {barraEntrada}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setModo("compacto")}
      className="fixed bottom-4 left-4 z-[60] inline-flex items-center gap-2 rounded-full border border-fuchsia-500/40 bg-card px-4 py-2 text-sm font-semibold shadow-lg hover:bg-accent transition-colors cursor-pointer"
    >
      <Avatar11 size={22} className="rounded-full" />
      Falar com a 11
    </button>
  );
}
