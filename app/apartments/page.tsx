import type { Metadata } from "next";
import { ListingsBrowser } from "@/components/properties/ListingsBrowser";

export const metadata: Metadata = {
  title: "Apartments for Sale & Rent",
  description:
    "Browse apartments for sale or rent, with rooms, bathrooms, and pricing clearly listed on every property.",
  alternates: { canonical: "/apartments" },
};

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
