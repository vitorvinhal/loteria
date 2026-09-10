import type { MetadataRoute } from "next";

const SITE_URL = "https://loterias-caixa-omega.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1 },
    { url: `${SITE_URL}/analise`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${SITE_URL}/bolao`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${SITE_URL}/changelog`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${SITE_URL}/comparar`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${SITE_URL}/configuracoes`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${SITE_URL}/dashboard`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE_URL}/estatisticas`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${SITE_URL}/estrategias`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${SITE_URL}/historico/jogos`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.6 },
    { url: `${SITE_URL}/notificacoes`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${SITE_URL}/sincronizar`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
  ];

  const loterias = ["megasena", "lotofacil", "quina", "lotomania", "diadesorte", "timemania"];

  const dynamicRoutes = loterias.flatMap((loteria) => [
    { url: `${SITE_URL}/criar-jogo/${loteria}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${SITE_URL}/gerar/${loteria}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
  ]);

  return [...staticRoutes, ...dynamicRoutes];
}
