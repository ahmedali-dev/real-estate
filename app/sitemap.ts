import type { MetadataRoute } from "next";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Property } from "@/models/Property";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

// Without this, Next.js would bake the sitemap in once at build time and
// never touch it again — a listing added or removed afterward wouldn't be
// reflected until the next deploy. Regenerating hourly keeps it close to
// live without hitting the database on every single crawl request.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/apartments`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/builds`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/lands`, changeFrequency: "daily", priority: 0.9 },
  ];

  // Private listings are deliberately excluded — same rule as everywhere
  // else, a private listing's URL shouldn't be discoverable at all, and a
  // sitemap listing it would defeat that. If the database is unreachable
  // for any reason, fall back to just the static routes rather than
  // breaking the sitemap (and therefore crawling) entirely.
  try {
    await connectToDatabase();
    const docs = await Property.find({ visibility: "public" })
      .select("_id updatedAt")
      .limit(5000)
      .sort({ updatedAt: -1 });

    const listingRoutes: MetadataRoute.Sitemap = docs.map((doc) => ({
      url: `${baseUrl}/properties/${doc._id}`,
      lastModified: doc.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...listingRoutes];
  } catch (err) {
    console.error("Failed to build sitemap listing routes:", err);
    return staticRoutes;
  }
}
