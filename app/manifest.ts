import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "41 Real Estate — 41 للعقارات", short_name: "41 Real Estate",
    description: "Browse and manage apartments, buildings, and land for sale or rent.",
    start_url: "/", scope: "/", display: "standalone", background_color: "#f7f9f9", theme_color: "#1d9bf0",
    icons: [
      { src: "/app-icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
