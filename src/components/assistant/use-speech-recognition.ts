"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | null;
}

export function useSpeechRecognition() {
  const [ouvindo, setOuvindo] = useState(false);
  const [transcricao, setTranscricao] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const suporta = getRecognition() !== null;

  const parar = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setOuvindo(false);
  }, []);

  const iniciar = useCallback(
    (onFinal: (texto: string) => void) => {
      const Reconhecimento = getRecognition();
      if (!Reconhecimento || ouvindo) return;
      const rec = new Reconhecimento();
      rec.lang = "pt-BR";
      rec.continuous = false;
      rec.interimResults = true;
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
          onFinal(final.trim());
          setTranscricao("");
        }
      };
      rec.onerror = () => {
        setOuvindo(false);
        recRef.current = null;
      };
      rec.onend = () => {
        setOuvindo(false);
        recRef.current = null;
      };
      recRef.current = rec;
      setOuvindo(true);
      rec.start();
    },
    [ouvindo]
  );

  useEffect(() => () => parar(), [parar]);

  return { suporta, ouvindo, transcricao, iniciar, parar };
}
