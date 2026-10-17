import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/termos`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
