"use client";

import { useState, useCallback } from "react";
import {
  WhatsappShareButton,
  TwitterShareButton,
  FacebookShareButton,
} from "react-share";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Share2,
  MessageCircle,
  LinkIcon,
  Check,
} from "lucide-react";

interface ShareGameProps {
  dezenas: number[];
  loteria: string;
  score: number | null;
}

function formatDezenas(dezenas: number[]): string {
  return dezenas
    .map((d) => String(d).padStart(2, "0"))
    .join(" ");
}

function buildShareText(loteria: string, dezenas: number[], score: number | null): string {
  const formatted = formatDezenas(dezenas);
  const scorePart = score !== null ? ` | Score: ${score}` : "";
  return `Meu jogo ${loteria}: ${formatted}${scorePart} | Gerado em Loterias CAIXA`;
}

export function ShareGame({ dezenas, loteria, score }: ShareGameProps) {
  const [copied, setCopied] = useState(false);

  const shareText = buildShareText(loteria, dezenas, score);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareText]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          Compartilhar Jogo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <WhatsappShareButton
            title={shareText}
            url={shareUrl}
            className="!bg-transparent !p-0"
          >
            <Button variant="outline" size="sm" className="gap-1.5">
              <MessageCircle className="h-4 w-4 text-green-500" />
              WhatsApp
            </Button>
          </WhatsappShareButton>

          <TwitterShareButton
            title={shareText}
            url={shareUrl}
            className="!bg-transparent !p-0"
          >
            <Button variant="outline" size="sm" className="gap-1.5">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X / Twitter
            </Button>
          </TwitterShareButton>

          <FacebookShareButton
            url={shareUrl}
            className="!bg-transparent !p-0"
          >
            <Button variant="outline" size="sm" className="gap-1.5">
              <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Button>
          </FacebookShareButton>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                Copiado!
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4" />
                Copiar Link
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
