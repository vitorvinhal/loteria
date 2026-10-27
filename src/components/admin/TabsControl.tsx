"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Eye, EyeOff } from "lucide-react";
import { getAdminSettings, saveAdminSettings, type AdminSettings } from "@/lib/admin-settings";

const ALL_TABS = [
  { id: "gerar", label: "Gerar Jogos" },
  { id: "criar-jogo", label: "Criar Jogo" },
  { id: "historico", label: "Histórico" },
  { id: "analise", label: "Análise" },
  { id: "comparar", label: "Comparar" },
  { id: "estatisticas", label: "Estatísticas" },
  { id: "concursos", label: "Concursos" },
  { id: "sincronizar", label: "Sincronizar" },
  { id: "bolao", label: "Bolão" },
];

export function TabsControl() {
  const [settings, setSettings] = useState<AdminSettings>(() => getAdminSettings());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleTab = (tabId: string) => {
    setSettings((prev) => {
      const visibleTabs = prev.visibleTabs.includes(tabId)
        ? prev.visibleTabs.filter((t) => t !== tabId)
        : [...prev.visibleTabs, tabId];
      return { ...prev, visibleTabs };
    });
    setSaved(false);
  };

  const handleSave = () => {
    setSaving(true);
    saveAdminSettings(settings);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-5 w-5" />
          Visibilidade das Abas
        </CardTitle>
        <CardDescription>
          Selecione quais abas aparecem na navegação do usuário final.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ALL_TABS.map((tab) => {
            const isVisible = settings.visibleTabs.includes(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => toggleTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                  isVisible
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {isVisible ? (
                  <Eye className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={`text-sm ${isVisible ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          {saved && <span className="text-xs text-emerald-500">✓ Salvo</span>}
        </div>
      </CardContent>
    </Card>
  );
}
