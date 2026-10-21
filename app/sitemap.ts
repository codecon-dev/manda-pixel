import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/lib/constants";
import { listLiveAdIds } from "@/app/lib/db";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const ads: MetadataRoute.Sitemap = listLiveAdIds().map((ad) => ({
    url: `${SITE_URL}/a/${ad.orderId}`,
    lastModified: ad.paidAt ?? undefined,
    changeFrequency: "monthly",
    priority: 0.5,
  }));
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/painel`, changeFrequency: "hourly", priority: 0.6 },
    { url: `${SITE_URL}/termos`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "monthly", priority: 0.3 },
    ...ads,
  ];
}
