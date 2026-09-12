"use client";

import { ListingsBrowser } from "@/components/properties/ListingsBrowser";

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
