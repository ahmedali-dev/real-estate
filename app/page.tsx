"use client";

import { ListingsBrowser } from "@/components/properties/ListingsBrowser";

export default function BrowsePage() {
  return (
    <ListingsBrowser
      eyebrowKey="browse.eyebrow"
      titleKey="browse.title"
      subtitleKey="browse.subtitle"
    />
  );
}
