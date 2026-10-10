"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type FaseLigacao = "parado" | "ouvindo" | "pensando" | "falando" | "erro";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | null;
}

async function pedirMicrofone(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

interface OpcoesLigacao {
  enviar: (texto: string) => Promise<string>;
  onFala11?: (texto: string) => void;
}

export function useVoiceCall({ enviar, onFala11 }: OpcoesLigacao) {
  const [fase, setFase] = useState<FaseLigacao>("parado");
  const [transcricao, setTranscricao] = useState("");
  const [ultimaFala11, setUltimaFala11] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [suporta, setSuporta] = useState(false);

  const ativoRef = useRef(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enviarRef = useRef(enviar);
  const onFalaRef = useRef(onFala11);

  useEffect(() => {
    enviarRef.current = enviar;
    onFalaRef.current = onFala11;
  }, [enviar, onFala11]);

  useEffect(() => {
    setSuporta(getRecognition() !== null && typeof window !== "undefined" && !!navigator.mediaDevices);
  }, []);

  const limpar = useCallback(() => {
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const parar = useCallback(() => {
    ativoRef.current = false;
    limpar();
    setFase("parado");
    setTranscricao("");
    setSegundos(0);
  }, [limpar]);

  const ouvirUmaVez = useCallback((): Promise<string | null> => {
    const Reconhecimento = getRecognition();
    if (!Reconhecimento || !ativoRef.current) return Promise.resolve(null);

    return new Promise((resolve) => {
      const rec = new Reconhecimento();
      rec.lang = "pt-BR";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      let resolvido = false;
      let final = "";

      const concluir = (valor: string | null) => {
        if (resolvido) return;
        resolvido = true;
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
        recRef.current = null;
        resolve(valor);
      };

      rec.onresult = (event: unknown) => {
        const e = event as {
          resultIndex: number;
          results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }>;
        };
        let parcial = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const t = r[0]?.transcript ?? "";
          if (r.isFinal) final += t;
          else parcial += t;
        }
        setTranscricao(final || parcial);
      };

      rec.onerror = (ev: unknown) => {
        const e = ev as { error?: string };
        if (e?.error === "no-speech" || e?.error === "aborted") {
          concluir(final.trim() || null);
          return;
        }
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
          setErro("Permissão do microfone negada.");
          ativoRef.current = false;
          setFase("erro");
          concluir(null);
          return;
        }
        concluir(final.trim() || null);
      };

      rec.onend = () => {
        concluir(final.trim() || null);
      };

      recRef.current = rec;
      setFase("ouvindo");
      try {
        rec.start();
      } catch {
        concluir(null);
      }
    });
  }, []);

  const falarResposta = useCallback((texto: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setFase("falando");
      setUltimaFala11(texto);
      onFalaRef.current?.(texto);
      fetch(`/api/tts?text=${encodeURIComponent(texto.slice(0, 800))}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("tts");
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
            reject(new Error("audio"));
          };
          return audio.play();
        })
        .catch(reject);
    });
  }, []);

  const loop = useCallback(async () => {
    while (ativoRef.current) {
      setTranscricao("");
      const fala = await ouvirUmaVez();
      if (!ativoRef.current) return;
      if (!fala || fala.length < 2) continue;

      setFase("pensando");
      try {
        const resposta = await enviarRef.current(fala);
        if (!ativoRef.current) return;
        try {
          await falarResposta(resposta);
        } catch {
          /* sem áudio: continua ouvindo */
        }
      } catch {
        if (!ativoRef.current) return;
        try {
          await falarResposta("Desculpe, tive um problema. Pode repetir?");
        } catch {
          /* ignore */
        }
      }
    }
  }, [ouvirUmaVez, falarResposta]);

  const iniciar = useCallback(async () => {
    if (ativoRef.current) return;
    setErro(null);
    setUltimaFala11("");
    const okMicro = await pedirMicrofone();
    if (!okMicro) {
      setErro("Permissão do microfone negada. Ative nas configurações do site.");
      setFase("erro");
      return;
    }
    if (!getRecognition()) {
      setErro("Seu navegador não suporta voz contínua. Use Chrome ou Edge.");
      setFase("erro");
      return;
    }
    ativoRef.current = true;
    setSegundos(0);
    timerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
    void loop();
  }, [loop]);

  useEffect(() => () => {
    ativoRef.current = false;
    limpar();
  }, [limpar]);

  const rotuloFase: Record<FaseLigacao, string> = {
    parado: "Desligado",
    ouvindo: "Ouvindo você...",
    pensando: "A 11 está pensando...",
    falando: "A 11 está falando...",
    erro: "Erro",
  };

  return {
    fase,
    transcricao,
    ultimaFala11,
    erro,
    segundos,
    suporta,
    iniciar,
    parar,
    rotuloFase: rotuloFase[fase],
  };
}
