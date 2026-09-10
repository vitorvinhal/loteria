"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle>Algo deu errado</CardTitle>
              <CardDescription>Ocorreu um erro inesperado</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-mono text-muted-foreground">
              {error.message || "Erro desconhecido"}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-1">
                ID do erro: {error.digest}
              </p>
            )}
          </div>
          <Button onClick={reset} className="w-full">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
