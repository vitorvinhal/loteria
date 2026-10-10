"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, supabase } from "@/lib/supabase/auth/provider";
import { Avatar11 } from "./avatar-11";
import { MarkdownText } from "./markdown-text";
import { useSpeechRecognition } from "./use-speech-recognition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { SALA_ID, SALA_TITULO } from "@/modules/assistant/sala";
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
  Copy,
  CheckCircle2,
  Sparkles,
  Trophy,
  Wrench,
} from "lucide-react";
import { toast } from "react-hot-toast";

type Modo = "fechado" | "compacto" | "expandido";
type Aba = "chat" | "dev" | "placar";

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

function AvatarUsuario({ nome, url, size = 32 }: { nome: string; url?: string | null; size?: number }) {
  if (url && url.startsWith("data:image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={nome}
        className="rounded-full object-cover shrink-0 border"
        style={{ width: size, height: size }}
      />
    );
  }
  const iniciais = nome
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const cores = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  const cor = cores[nome.charCodeAt(0) % cores.length];
  return (
    <span
      className={`${cor} text-white font-bold rounded-full flex items-center justify-center shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {iniciais || "?"}
    </span>
  );
}

export function AssistantWidget() {
  const { user, isLoading, avatarUrl } = useAuth();
  const [modo, setModo] = useState<Modo>("fechado");
  const [aba, setAba] = useState<Aba>("chat");
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
  const nomeUsuario = (() => {
    const meta = user?.user_metadata;
    const nome = meta?.nome || meta?.name || meta?.full_name;
    if (typeof nome === "string" && nome.trim()) return nome.trim();
    if (user?.email) {
      const base = user.email.split("@")[0];
      return base.charAt(0).toUpperCase() + base.slice(1);
    }
    return "Você";
  })();

  const irParaFim = useCallback(() => {
    requestAnimationFrame(() => {
      msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  const carregarMensagens = useCallback(async () => {
    setCarregandoChat(true);
    try {
      const res = await fetch(`/api/assistant/messages?chat_id=${SALA_ID}`);
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
    if (modo === "fechado") return;
    void carregarMensagens();
  }, [modo, carregarMensagens]);

  useEffect(() => {
    if (modo === "expandido") {
      if (aba === "dev") void carregarMelhorias();
      if (aba === "placar") void carregarRanking();
    }
  }, [modo, aba, carregarMelhorias, carregarRanking]);

  useEffect(() => {
    if (modo === "fechado" || !supabase) return;
    const canal = supabase
      .channel("sala-11-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${SALA_ID}` },
        (payload) => {
          const nova = payload.new as Msg;
          setMensagens((prev) => {
            if (prev.some((m) => m.id === nova.id)) return prev;
            const semOtimista = prev.filter((m) => !m.id.startsWith("tmp-"));
            return [...semOtimista, { ...nova, attachments: nova.attachments ?? [] }];
          });
          irParaFim();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [modo, irParaFim]);

  const enviarMensagem = useCallback(
    async (conteudo: string, listaAnexos: Anexo[]) => {
      if ((!conteudo.trim() && !listaAnexos.length) || enviando) return;
      setEnviando(true);
      setTexto("");
      setAnexos([]);
      const otimista: Msg = {
        id: `tmp-${Date.now()}`,
        user_id: user?.id ?? null,
        user_name: nomeUsuario,
        user_avatar: avatarUrl,
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
          body: JSON.stringify({ content: conteudo, attachments: listaAnexos }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          toast.error(json?.error ?? "Erro ao enviar mensagem");
          return;
        }
        if (json.melhoria_salva) toast.success("Sugestão salva na Central de Melhorias!");
        await carregarMensagens();
      } catch {
        toast.error("Erro de rede ao enviar mensagem");
      } finally {
        setEnviando(false);
      }
    },
    [enviando, user, nomeUsuario, avatarUrl, irParaFim, carregarMensagens]
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

  const enviarArquivo = useCallback(async (file: File) => {
    setEnviandoAnexo(true);
    try {
      const form = new FormData();
      form.append("arquivo", file);
      const res = await fetch("/api/assistant/upload", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
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
  }, []);

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
        const json = await res.json().catch(() => null);
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
      const json = await res.json().catch(() => null);
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

  const listaMensagens = (
    <div ref={msgsRef} className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-1">
      {carregandoChat && (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando conversa...
        </div>
      )}
      {!carregandoChat && mensagens.length === 0 && (
        <div className="text-center py-16 text-muted-foreground space-y-3">
          <Avatar11 size={56} className="mx-auto rounded-full" />
          <p className="text-lg font-medium">Bem-vindo à Sala da 11</p>
          <p className="text-sm max-w-sm mx-auto">Converse com a 11 e com outros membros. Pergunte sobre loterias, jogos ou deixe um feedback.</p>
        </div>
      )}
      {mensagens.map((m, idx) => {
        const da11 = m.user_name === "11" && !m.user_id;
        const meu = m.user_id === user.id;
        const anterior = mensagens[idx - 1];
        const mesmoAutor = anterior && anterior.user_name === m.user_name && anterior.user_id === m.user_id;
        const mostrarNome = !mesmoAutor;
        return (
          <div key={m.id} className={`flex gap-2 pt-2 ${meu ? "flex-row-reverse" : ""}`}>
            <div className="w-8 shrink-0 self-start">
              {!mesmoAutor &&
                (da11 ? (
                  <Avatar11 size={32} className="rounded-full" />
                ) : (
                  <AvatarUsuario nome={m.user_name} url={m.user_avatar} />
                ))}
            </div>
            <div className={`max-w-[88%] sm:max-w-[72%] min-w-0 ${meu ? "items-end text-right" : ""}`}>
              {mostrarNome && (
                <p className={`text-[11px] font-medium mb-0.5 px-1 ${meu ? "text-primary" : "text-muted-foreground"}`}>
                  {meu ? "Você" : m.user_name}
                  {da11 && <span className="ml-1 text-[9px] bg-primary text-primary-foreground rounded px-1 py-px">IA</span>}
                </p>
              )}
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-[13px] break-words inline-block text-left ${
                  meu
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : da11
                      ? "bg-muted rounded-tl-sm"
                      : "bg-muted/70 rounded-tl-sm"
                }`}
              >
                {da11 ? <MarkdownText content={m.content} /> : <span className="whitespace-pre-wrap">{m.content}</span>}
              </div>
              {m.attachments?.length > 0 && (
                <div className={`flex flex-wrap gap-1.5 mt-1 ${meu ? "justify-end" : ""}`}>
                  {m.attachments.map((a, i) =>
                    a.mime.startsWith("image/") ? (
                      <a key={i} href={a.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.url} alt={a.nome} className="h-28 rounded-xl border object-cover" />
                      </a>
                    ) : (
                      <a
                        key={i}
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline text-muted-foreground bg-muted rounded-lg px-2 py-1"
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
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer mt-0.5"
                >
                  {audioCarregando === m.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {enviando && (
        <div className="flex gap-2 pt-2">
          <div className="w-8 shrink-0">
            <Avatar11 size={32} className="rounded-full" />
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}
    </div>
  );

  const barraEntrada = (
    <div className="border-t p-2 sm:p-3">
      {anexos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
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
      <div className="flex items-end gap-1.5 bg-muted/40 rounded-2xl border border-border/50 focus-within:border-border px-2 py-1.5">
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
          className="h-8 w-8 shrink-0 text-muted-foreground"
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
          placeholder={ouvindo ? "Ouvindo..." : "Mensagem para a Sala da 11..."}
          rows={1}
          className="min-h-[36px] max-h-28 resize-none text-sm bg-transparent border-0 shadow-none focus-visible:ring-0 px-1 py-1"
        />
        {suporta && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-8 w-8 shrink-0 ${ouvindo ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}
            onClick={onMic}
            title={ouvindo ? "Parar microfone" : "Falar com microfone"}
          >
            {ouvindo ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => void enviarMensagem(texto, anexos)}
          disabled={enviando || (!texto.trim() && !anexos.length)}
        >
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  if (modo === "expandido") {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) setModo("compacto"); }}>
        <DialogContent showCloseButton={false} className="max-w-full sm:max-w-4xl w-full sm:w-[96vw] h-full sm:h-[90vh] p-0 gap-0 overflow-hidden rounded-none sm:rounded-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Sala da 11</DialogTitle>
            <DialogDescription>Chat compartilhado, central de melhorias e placar</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col h-full min-h-0">
            <div className="border-b px-3 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar11 size={28} className="rounded-full" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{SALA_TITULO}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Chat compartilhado</p>
                </div>
              </div>
              <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
                <TabsList className="h-9">
                  <TabsTrigger value="chat" className="gap-1.5 text-xs px-2.5">
                    <MessageCircle className="h-3.5 w-3.5" /> Chat
                  </TabsTrigger>
                  <TabsTrigger value="dev" className="gap-1.5 text-xs px-2.5">
                    <Wrench className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Dev</span>
                  </TabsTrigger>
                  <TabsTrigger value="placar" className="gap-1.5 text-xs px-2.5">
                    <Trophy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Placar</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setModo("compacto")} title="Minimizar">
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setModo("fechado")} title="Fechar">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)} className="flex-1 flex flex-col min-h-0">
              <TabsContent value="chat" className="flex-1 min-h-0 mt-0 flex flex-col data-[state=active]:flex">
                {listaMensagens}
                {barraEntrada}
              </TabsContent>
              <TabsContent value="dev" className="flex-1 min-h-0 mt-0 overflow-y-auto">
                <div className="p-4 space-y-3 max-w-2xl mx-auto">
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
                <div className="p-4 space-y-4 max-w-2xl mx-auto">
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
                      <input
                        value={palpiteDezenas}
                        onChange={(e) => setPalpiteDezenas(e.target.value)}
                        placeholder="dezenas: 4, 12, 23, 34, 45, 56"
                        className="flex-1 min-w-[12rem] h-9 text-sm rounded-lg border bg-background px-2"
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
        </DialogContent>
      </Dialog>
    );
  }

  if (modo === "compacto") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[60] w-full h-[85vh] sm:bottom-4 sm:left-4 sm:right-auto sm:w-[24rem] sm:max-w-[calc(100vw-2rem)] sm:h-[28rem] sm:max-h-[calc(100vh-6rem)] rounded-t-2xl sm:rounded-xl border bg-card shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm font-bold min-w-0">
            <Avatar11 size={24} className="rounded-full shrink-0" />
            <span className="truncate">{SALA_TITULO}</span>
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setModo("expandido")}
              title="Expandir"
              className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setModo("fechado")}
              title="Fechar"
              className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
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
      className="fixed bottom-4 left-4 z-[60] inline-flex items-center gap-2.5 rounded-full border bg-card px-4 py-2.5 text-sm font-semibold shadow-lg hover:bg-accent transition-colors cursor-pointer"
    >
      <Avatar11 size={22} className="rounded-full" />
      Falar com a 11
    </button>
  );
}
