import type { Metadata } from "next";
import { ListingsBrowser } from "@/components/properties/ListingsBrowser";

export const metadata: Metadata = {
  title: "Land for Sale",
  description:
    "Browse land for sale, with location and pricing clearly listed on every plot.",
  alternates: { canonical: "/lands" },
};

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
