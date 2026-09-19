import type { Metadata } from "next";
import { ListingsBrowser } from "@/components/properties/ListingsBrowser";

export const metadata: Metadata = {
  title: "Real Estate Listings for Sale & Rent",
  description:
    "Browse apartments, buildings, and land for sale or rent. Clear sale/rent status on every listing, with direct contact for each property.",
  alternates: { canonical: "/" },
};

export default function BrowsePage() {
  return (
    <ListingsBrowser
      eyebrowKey="browse.eyebrow"
      titleKey="browse.title"
      subtitleKey="browse.subtitle"
    />
  );
}
