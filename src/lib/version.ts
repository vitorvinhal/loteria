export const APP_VERSION = "3.5.1";
export const APP_NAME = "Loterias CAIXA - Gerador Inteligente";

export interface VersionInfo {
  version: string;
  buildDate: string;
  gitCommit?: string;
}

export function getVersionInfo(): VersionInfo {
  return {
    version: APP_VERSION,
    buildDate: new Date().toISOString(),
    gitCommit: process.env.NEXT_PUBLIC_GIT_COMMIT || undefined,
  };
}
