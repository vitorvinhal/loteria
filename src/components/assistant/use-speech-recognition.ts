"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

async function pedirPermissaoMicrofone(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export function useSpeechRecognition() {
  const [ouvindo, setOuvindo] = useState(false);
  const [transcricao, setTranscricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef(false);
  const [suporta, setSuporta] = useState(false);

  useEffect(() => {
    setSuporta(getRecognition() !== null);
  }, []);

  const parar = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* já parado */
    }
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setOuvindo(false);
  }, []);

  const iniciar = useCallback(
    async (onFinal: (texto: string) => void) => {
      const Reconhecimento = getRecognition();
      if (!Reconhecimento) {
        setErro("Seu navegador não suporta ditado. Use Chrome ou Edge no celular/computador.");
        return;
      }
      if (ouvindo) {
        parar();
        return;
      }

      setErro(null);
      finalRef.current = false;

      const ok = await pedirPermissaoMicrofone();
      if (!ok) {
        setErro("Permissão do microfone negada. Ative nas configurações do navegador e tente de novo.");
        return;
      }

      const rec = new Reconhecimento();
      rec.lang = "pt-BR";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (event: unknown) => {
        const e = event as {
          resultIndex: number;
          results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }>;
        };
        let parcial = "";
        let final = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const texto = r[0]?.transcript ?? "";
          if (r.isFinal) final += texto;
          else parcial += texto;
        }
        setTranscricao(final || parcial);
        if (final) {
          finalRef.current = true;
          onFinal(final.trim());
          setTranscricao("");
        }
      };

      rec.onerror = (ev: unknown) => {
        const e = ev as { error?: string };
        const codigo = e?.error ?? "desconhecido";
        if (codigo === "aborted" || codigo === "no-speech") {
          if (codigo === "no-speech" && !finalRef.current) {
            setErro("Não ouvi nada. Segure o botão e fale mais perto do microfone.");
          }
          setOuvindo(false);
          recRef.current = null;
          return;
        }
        const msg =
          codigo === "not-allowed" || codigo === "service-not-allowed"
            ? "Permissão do microfone negada. Ative nas configurações do site/navegador."
            : codigo === "network"
              ? "Falha de rede no reconhecimento de voz. Verifique a internet."
              : codigo === "audio-capture"
                ? "Não consegui acessar o microfone. Feche outros apps que usem o mic."
                : `Erro no microfone (${codigo}).`;
        setErro(msg);
        setOuvindo(false);
        recRef.current = null;
      };

      rec.onend = () => {
        setOuvindo(false);
        recRef.current = null;
      };

      try {
        recRef.current = rec;
        setOuvindo(true);
        rec.start();
      } catch {
        setErro("Não consegui iniciar o microfone. Toque de novo em alguns segundos.");
        setOuvindo(false);
        recRef.current = null;
      }
    },
    [ouvindo, parar]
  );

  useEffect(() => () => parar(), [parar]);

  return { suporta, ouvindo, transcricao, erro, iniciar, parar };
}
