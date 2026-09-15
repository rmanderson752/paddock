import type { MetadataRoute } from "next";
import { getAllGenerationsWithDetails, getAllMakes, getCategoryIndices } from "@/lib/data";

// Built from the database on request, never at build time
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://paddock.app";
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/browse`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  // Car detail pages
  const generations = await getAllGenerationsWithDetails();
  const carPages: MetadataRoute.Sitemap = generations.map((g) => ({
    url: `${baseUrl}/car/${g.make.slug}/${g.model.slug}/${g.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // Make browse pages
  const makes = await getAllMakes();
  const makePages: MetadataRoute.Sitemap = makes.map((m) => ({
    url: `${baseUrl}/browse/make/${m.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Category pages (only categories that have tracked models)
  const categories = (await getCategoryIndices()).filter((c) => c.modelCount > 0).map((c) => c.category);
  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}/browse/${c}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...carPages, ...makePages, ...categoryPages];
}
