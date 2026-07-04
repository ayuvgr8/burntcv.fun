import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://burntcv.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
  ): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    page("", 1),
    page("/linkedin", 0.9),
    page("/terms", 0.3, "yearly"),
    page("/privacy", 0.3, "yearly"),
    page("/refund", 0.3, "yearly"),
    page("/shipping", 0.3, "yearly"),
    page("/contact", 0.4, "yearly"),
  ];
}
