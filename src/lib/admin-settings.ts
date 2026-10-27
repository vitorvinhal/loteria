export interface AdminSettings {
  visibleTabs: string[];
  hotColdEnabled: boolean;
  aiChatEnabled: boolean;
  updatedAt: string;
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  visibleTabs: [
    "gerar",
    "criar-jogo",
    "historico",
    "analise",
    "comparar",
    "estatisticas",
    "concursos",
    "sincronizar",
    "bolao",
  ],
  hotColdEnabled: true,
  aiChatEnabled: true,
  updatedAt: new Date().toISOString(),
};

const STORAGE_KEY = "loterias-admin-settings";

export function getAdminSettings(): AdminSettings {
  if (typeof window === "undefined") {
    return DEFAULT_ADMIN_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_ADMIN_SETTINGS };
    const parsed = JSON.parse(stored) as Partial<AdminSettings>;
    return {
      ...DEFAULT_ADMIN_SETTINGS,
      ...parsed,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return { ...DEFAULT_ADMIN_SETTINGS };
  }
}

export function saveAdminSettings(settings: AdminSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getVisibleTabs(): string[] {
  const settings = getAdminSettings();
  return settings.visibleTabs;
}

export function isHotColdEnabled(): boolean {
  const settings = getAdminSettings();
  return settings.hotColdEnabled;
}

export function isAiChatEnabled(): boolean {
  const settings = getAdminSettings();
  return settings.aiChatEnabled;
}
