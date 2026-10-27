"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Flame, Snowflake } from "lucide-react";
import { getAdminSettings, saveAdminSettings, type AdminSettings } from "@/lib/admin-settings";

export function HotColdToggle() {
  const [settings, setSettings] = useState<AdminSettings>(() => getAdminSettings());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = () => {
    setSettings((prev) => ({
      ...prev,
      hotColdEnabled: !prev.hotColdEnabled,
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

  const Icon = settings.hotColdEnabled ? Flame : Snowflake;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-5 w-5 ${settings.hotColdEnabled ? "text-orange-500" : "text-blue-500"}`} />
          Números Quentes/Frios
        </CardTitle>
        <CardDescription>
          {settings.hotColdEnabled
            ? "Opção de números quentes/frios está ativa para os usuários."
            : "Opção de números quentes/frios está desativada."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex items-start gap-2 min-w-0">
            <Icon
              className={`h-4 w-4 mt-0.5 shrink-0 ${
                settings.hotColdEnabled ? "text-orange-500" : "text-blue-500"
              }`}
            />
            <div className="min-w-0">
              <span className="text-sm font-semibold block">
                {settings.hotColdEnabled ? "Ativo" : "Inativo"}
              </span>
              <span className="text-xs text-muted-foreground">
                Toggle de números quentes/frios
              </span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.hotColdEnabled}
            aria-label="Números quentes/frios"
            onClick={toggle}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
              settings.hotColdEnabled ? "bg-orange-500" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                settings.hotColdEnabled ? "left-[22px]" : "left-0.5"
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
