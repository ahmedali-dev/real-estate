import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing behind sign-in should ever be crawled or indexed — staff
      // tools, the login form, and API routes have no SEO value and some
      // (Orders, Users) hold data that shouldn't be discoverable at all.
      disallow: ["/dashboard/", "/api/", "/login"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
