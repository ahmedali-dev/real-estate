"use client";

import { ListingsBrowser } from "@/components/properties/ListingsBrowser";

export default function LandsPage() {
  return (
    <ListingsBrowser
      fixedCategory="land"
      eyebrowKey="browse.eyebrow"
      titleKey="categoryPages.landsTitle"
      subtitleKey="categoryPages.landsSubtitle"
    />
  );
}
