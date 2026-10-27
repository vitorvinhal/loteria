"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Bot } from "lucide-react";
import { getAdminSettings, saveAdminSettings, type AdminSettings } from "@/lib/admin-settings";

export function AiChatToggle() {
  const [settings, setSettings] = useState<AdminSettings>(() => getAdminSettings());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = () => {
    setSettings((prev) => ({
      ...prev,
      aiChatEnabled: !prev.aiChatEnabled,
    }));
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
          <Bot className={`h-5 w-5 ${settings.aiChatEnabled ? "text-fuchsia-500" : "text-muted-foreground"}`} />
          Chat de IA
        </CardTitle>
        <CardDescription>
          {settings.aiChatEnabled
            ? "Menu de chat de IA está visível para os usuários."
            : "Menu de chat de IA está oculto."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex items-start gap-2 min-w-0">
            <Bot
              className={`h-4 w-4 mt-0.5 shrink-0 ${
                settings.aiChatEnabled ? "text-fuchsia-500" : "text-muted-foreground"
              }`}
            />
            <div className="min-w-0">
              <span className="text-sm font-semibold block">
                {settings.aiChatEnabled ? "Visível" : "Oculta"}
              </span>
              <span className="text-xs text-muted-foreground">
                Menu de chat de IA
              </span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.aiChatEnabled}
            aria-label="Chat de IA"
            onClick={toggle}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
              settings.aiChatEnabled ? "bg-fuchsia-500" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                settings.aiChatEnabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
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
