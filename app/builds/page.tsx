import type { Metadata } from "next";
import { ListingsBrowser } from "@/components/properties/ListingsBrowser";

export const metadata: Metadata = {
  title: "Buildings & Properties for Sale & Rent",
  description:
    "Browse standalone buildings and properties for sale or rent, including multi-unit buildings with individual apartments inside.",
  alternates: { canonical: "/builds" },
};

export default function BuildsPage() {
  return (
    <ListingsBrowser
      fixedCategory="build"
      eyebrowKey="browse.eyebrow"
      titleKey="categoryPages.buildsTitle"
      subtitleKey="categoryPages.buildsSubtitle"
    />
  );
}
