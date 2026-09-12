"use client";

import { ListingsBrowser } from "@/components/properties/ListingsBrowser";

export default function ApartmentsPage() {
  return (
    <ListingsBrowser
      fixedCategory="apartment"
      eyebrowKey="browse.eyebrow"
      titleKey="categoryPages.apartmentsTitle"
      subtitleKey="categoryPages.apartmentsSubtitle"
    />
  );
}
